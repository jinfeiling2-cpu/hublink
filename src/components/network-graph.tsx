"use client";

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Force,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { nodeTypeById } from "@/domain/registry";
import type { NetworkEdgeInput, NetworkNodeInput } from "@/lib/network";

type SizeBy = "importance" | "centrality" | "degree";

type SimNode = NetworkNodeInput &
  SimulationNodeDatum & {
    radius: number;
    cluster: string;
    color: string;
  };

type SimLink = SimulationLinkDatum<SimNode> & { id: string; type: string };

const palette = ["#4fc3f7", "#26c6da", "#7cb342", "#ba68c8", "#ffca28", "#26a69a", "#ff8a65", "#9575cd", "#ec407a", "#90a4ae"];
const hubColor = "#ef5350";
const canvas = "#243038";

export function NetworkGraph({
  nodes,
  edges,
  height = 680,
  initialSelected = null,
}: {
  nodes: NetworkNodeInput[];
  edges: NetworkEdgeInput[];
  height?: number;
  initialSelected?: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const liveNodes = useRef<SimNode[]>([]);
  const dragRef = useRef<SimNode | null>(null);
  const [sizeBy, setSizeBy] = useState<SizeBy>("importance");
  const [canvasHeight, setCanvasHeight] = useState(height);
  const [size, setSize] = useState({ width: 960, height });
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simLinks, setSimLinks] = useState<SimLink[]>([]);
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [hovered, setHovered] = useState<string | null>(null);

  const signature = useMemo(
    () => `${sizeBy}|${nodes.map((node) => node.id).join(",")}|${edges.map((edge) => edge.id).join(",")}`,
    [edges, nodes, sizeBy],
  );

  useEffect(() => {
    const fit = () => {
      const narrow = window.innerWidth < 720;
      const fitted = narrow ? Math.min(height, 520) : Math.min(height, Math.max(520, window.innerHeight - 340));
      setCanvasHeight(fitted);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [height]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: Math.max(element.clientWidth, 320), height: canvasHeight });
    });
    observer.observe(element);
    setSize({ width: Math.max(element.clientWidth, 320), height: canvasHeight });
    return () => observer.disconnect();
  }, [canvasHeight]);

  useEffect(() => {
    const width = Math.max(size.width, 320);
    const heightPx = size.height;
    const hubId = pickHub(nodes)?.id ?? null;
    const prepared = prepare(nodes, edges, sizeBy, width, heightPx, hubId);
    const simulation = forceSimulation(prepared.nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(prepared.links)
          .id((node) => node.id)
          .distance((link) => {
            const source = link.source as SimNode;
            const target = link.target as SimNode;
            const near = link.type === "contains" || link.type === "step";
            const touchesHub = source.id === hubId || target.id === hubId;
            const narrow = width < 520;
            if (!near) return (narrow ? 16 : 36) + source.radius + target.radius;
            if (touchesHub) return (narrow ? 28 : 78) + source.radius * 0.35 + target.radius * 0.35;
            return (narrow ? 8 : 18) + source.radius + target.radius;
          })
          .strength((link) => {
            const source = link.source as SimNode;
            const target = link.target as SimNode;
            const near = link.type === "contains" || link.type === "step";
            const touchesHub = source.id === hubId || target.id === hubId;
            if (!near) return 0.08;
            return touchesHub ? 0.18 : 0.72;
          }),
      )
      .force("charge", forceManyBody<SimNode>().strength((node) => (node.id === hubId ? -520 : -90 - node.radius * 6)))
      .force("center", forceCenter(width / 2, heightPx / 2))
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius((node) => node.radius + (width < 520 ? 5 : node.radius >= 28 ? 16 : 7))
          .strength(0.95)
          .iterations(2),
      )
      .force("cluster", clusterForce(prepared.centers))
      .alpha(1)
      .alphaDecay(0.028);

    for (let step = 0; step < 320; step += 1) simulation.tick();
    clamp(prepared.nodes, width, heightPx);
    liveNodes.current = prepared.nodes;
    const publish = () => {
      clamp(prepared.nodes, width, heightPx);
      setSimNodes(prepared.nodes.map((node) => ({ ...node })));
      setSimLinks(prepared.links.map((link) => ({ ...link })));
    };
    publish();
    simulation.on("tick", () => {
      publish();
      if (simulation.alpha() < 0.015 && simulation.alphaTarget() === 0) simulation.stop();
    });
    simulation.alpha(0).stop();
    simRef.current = simulation;
    return () => {
      simulation.stop();
      simRef.current = null;
    };
  }, [edges, nodes, signature, size.height, size.width, sizeBy]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const node = dragRef.current;
      const svg = wrapRef.current?.querySelector("svg");
      if (!node || !svg) return;
      const rect = svg.getBoundingClientRect();
      node.fx = event.clientX - rect.left;
      node.fy = event.clientY - rect.top;
    };
    const up = () => {
      const node = dragRef.current;
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const focusId = selected ?? hovered;
  const neighborIds = useMemo(() => {
    const ids = new Set<string>();
    if (!focusId) return ids;
    ids.add(focusId);
    for (const link of simLinks) {
      const source = (link.source as SimNode).id;
      const target = (link.target as SimNode).id;
      if (source === focusId) ids.add(target);
      if (target === focusId) ids.add(source);
    }
    return ids;
  }, [focusId, simLinks]);

  const active = simNodes.find((node) => node.id === selected) ?? null;
  const legend = useMemo(() => {
    const seen = new Map<string, { id: string; title: string; color: string }>();
    for (const node of simNodes) {
      if (!seen.has(node.cluster)) {
        const owner = simNodes.find((item) => item.id === node.cluster);
        seen.set(node.cluster, { id: node.cluster, title: owner?.title ?? node.cluster, color: node.color });
      }
    }
    return [...seen.values()];
  }, [simNodes]);

  const ordered = [...simNodes].sort((a, b) => Number(neighborIds.has(a.id)) - Number(neighborIds.has(b.id)));

  return (
    <div ref={wrapRef} className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <p>同一颜色是同一支。点一下做直接选择，只亮出和它相连的圆。</p>
        <div className="flex gap-1">
          {(
            [
              ["importance", "重要性"],
              ["centrality", "亲疏"],
              ["degree", "联系"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSizeBy(key)}
              className={`rounded-md px-2 py-1 ${sizeBy === key ? "bg-white text-slate-900" : "bg-white/10 text-slate-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl" style={{ height: canvasHeight, background: canvas }}>
        <svg
          width={size.width}
          height={size.height}
          role="img"
          aria-label="节点连接图"
          style={{ touchAction: "none", fontFamily: '"WenQuanYi Micro Hei", "PingFang SC", "Microsoft YaHei", sans-serif' }}
          onPointerDown={() => setSelected(null)}
        >
          {simLinks.map((link) => {
            const source = link.source as SimNode;
            const target = link.target as SimNode;
            if (source.x == null || target.x == null || source.y == null || target.y == null) return null;
            const hot = !focusId || (neighborIds.has(source.id) && neighborIds.has(target.id));
            return (
              <line
                key={link.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={hot ? "rgba(226,232,236,0.72)" : "rgba(226,232,236,0.06)"}
                strokeWidth={hot && focusId ? 1.7 : 1}
              />
            );
          })}
          {ordered.map((node) => {
            if (node.x == null || node.y == null) return null;
            const hot = !focusId || neighborIds.has(node.id);
            const chosen = node.id === selected;
            const neighbor = Boolean(focusId) && neighborIds.has(node.id) && !chosen;
            const fontSize = node.radius >= 40 ? 13 : node.title.length > 4 ? (size.width < 520 ? 9 : 10) : size.width < 520 ? 10 : 11;
            const standing = node.id === node.cluster && (size.width >= 520 || labelFits(node.title, node.radius, fontSize));
            const showLabel = hot && (standing || node.id === hovered || node.id === selected);
            const textFill = prefersDarkText(node.color) ? "#1b242c" : "#f7fafc";
            return (
              <g
                key={node.id}
                transform={`translate(${node.x} ${node.y})`}
                opacity={hot ? 1 : 0.14}
                style={{ cursor: "pointer" }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const live = liveNodes.current.find((item) => item.id === node.id);
                  if (!live) return;
                  dragRef.current = live;
                  live.fx = live.x;
                  live.fy = live.y;
                  simRef.current?.alphaTarget(0.22).restart();
                  setSelected(node.id);
                }}
                onPointerEnter={() => setHovered(node.id)}
                onPointerLeave={() => setHovered((current) => (current === node.id ? null : current))}
              >
                {chosen ? <circle r={node.radius + 7} fill="none" stroke="#ffe082" strokeWidth={3} /> : null}
                {neighbor ? <circle r={node.radius + 4} fill="none" stroke="#ffe082" strokeWidth={1.6} /> : null}
                <circle r={node.radius} fill={node.color} stroke="rgba(12,18,24,0.45)" strokeWidth={1.25} />
                {showLabel && labelFits(node.title, node.radius, fontSize) ? (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={textFill}
                    fontSize={fontSize}
                    fontWeight={600}
                    style={{ pointerEvents: "none" }}
                  >
                    {node.title}
                  </text>
                ) : null}
                {showLabel && !labelFits(node.title, node.radius, fontSize) ? (
                  <text
                    y={node.radius + 14}
                    textAnchor="middle"
                    fill="#f7fafc"
                    fontSize={11}
                    fontWeight={600}
                    style={{ pointerEvents: "none" }}
                  >
                    {node.title}
                  </text>
                ) : null}
              </g>
            );
          })}
          {active && active.x != null && active.y != null ? (
            <SelectionTag x={active.x} y={active.y} radius={active.radius} canvasWidth={size.width} />
          ) : null}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {legend.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1.5 text-xs text-slate-300">
            <span className="size-2.5 rounded-full" style={{ background: item.color }} />
            {item.title}
          </span>
        ))}
      </div>
      {active ? (
        <article className="grid gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100">
          <p className="text-xs text-slate-400">{nodeTypeById(active.type)?.label}</p>
          <h2 className="text-lg font-semibold">{active.title}</h2>
          {active.summary ? <p className="text-sm leading-6 text-slate-300">{active.summary}</p> : null}
          <Link href={`/node/${active.id}`} className="text-sm text-amber-200 underline underline-offset-4">
            进入这个点
          </Link>
        </article>
      ) : (
        <p className="text-xs text-slate-400">还没有选中的点。拖动可以暂时拉开挤在一起的圆。</p>
      )}
    </div>
  );
}

function SelectionTag({ x, y, radius, canvasWidth }: { x: number; y: number; radius: number; canvasWidth: number }) {
  const label = "直接相连";
  const width = 64;
  const height = 20;
  let left = x - width / 2;
  left = Math.max(8, Math.min(canvasWidth - width - 8, left));
  const above = y - radius - 16 - height;
  const top = above > 8 ? above : y + radius + 12;
  return (
    <g transform={`translate(${left} ${top})`} style={{ pointerEvents: "none" }}>
      <rect width={width} height={height} rx={3} fill="#f6f3ec" stroke="#d9d2c6" />
      <text x={width / 2} y={14} textAnchor="middle" fill="#3a342c" fontSize={11}>
        {label}
      </text>
    </g>
  );
}

function pickHub(nodes: NetworkNodeInput[]) {
  const projects = nodes.filter((node) => node.type === "project");
  const pool = projects.length === 1 ? projects : nodes;
  return [...pool].sort((a, b) => b.importance - a.importance || b.degree - a.degree)[0];
}

function prepare(nodes: NetworkNodeInput[], edges: NetworkEdgeInput[], sizeBy: SizeBy, width: number, height: number, hubId: string | null) {
  const parent = new Map<string, string>();
  for (const edge of edges) {
    if (edge.type !== "contains" && edge.type !== "step") continue;
    if (!parent.has(edge.target) || edge.type === "contains") parent.set(edge.target, edge.source);
  }
  const clusterOf = (id: string) => {
    let current = id;
    const seen = new Set<string>();
    while (parent.has(current) && !seen.has(current)) {
      const next = parent.get(current);
      if (!next) break;
      seen.add(current);
      if (!parent.has(next)) return current;
      current = next;
    }
    return current;
  };
  const hub = nodes.find((node) => node.id === hubId) ?? pickHub(nodes);
  const clusterOrder: string[] = [];
  if (hub) {
    for (const edge of edges) {
      if (edge.source === hub.id && (edge.type === "contains" || edge.type === "step") && !clusterOrder.includes(edge.target)) {
        clusterOrder.push(edge.target);
      }
    }
  }
  for (const node of nodes) {
    const cluster = clusterOf(node.id);
    if (cluster !== hub?.id && !clusterOrder.includes(cluster)) clusterOrder.push(cluster);
  }
  const colorOf = new Map<string, string>();
  if (hub) colorOf.set(hub.id, hubColor);
  clusterOrder.forEach((id, index) => colorOf.set(id, palette[index % palette.length]));

  const cx = width / 2;
  const cy = height / 2;
  const narrow = width < 520;
  const rx = Math.max(narrow ? 70 : 120, width * (narrow ? 0.3 : 0.34));
  const ry = Math.max(narrow ? 70 : 90, height * (narrow ? 0.3 : 0.34));
  const centers = new Map<string, { x: number; y: number }>();
  if (hub) centers.set(hub.id, { x: cx, y: cy });
  clusterOrder.forEach((id, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(clusterOrder.length, 1)) * Math.PI * 2;
    centers.set(id, { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry });
  });

  const grouped = new Map<string, NetworkNodeInput[]>();
  for (const node of nodes) {
    const cluster = clusterOf(node.id);
    const list = grouped.get(cluster) ?? [];
    list.push(node);
    grouped.set(cluster, list);
  }

  const simNodes: SimNode[] = nodes.map((node) => {
    const cluster = clusterOf(node.id);
    const center = centers.get(cluster) ?? { x: cx, y: cy };
    const members = grouped.get(cluster) ?? [node];
    const index = Math.max(0, members.findIndex((item) => item.id === node.id));
    const isHub = node.id === hub?.id;
    const isCluster = node.id === cluster && !isHub;
    const angle = ((index + 1) / (members.length + 1)) * Math.PI * 2;
    const spread = isHub ? 0 : isCluster ? 0 : 36 + (index % 3) * 14;
    return {
      ...node,
      radius: radiusFor(node, sizeBy, isHub, isCluster, width),
      cluster,
      color: colorOf.get(cluster) ?? "#90a4ae",
      x: center.x + Math.cos(angle) * spread,
      y: center.y + Math.sin(angle) * spread,
    };
  });
  const byId = new Map(simNodes.map((node) => [node.id, node]));
  const links: SimLink[] = edges
    .filter((edge) => byId.has(edge.source) && byId.has(edge.target))
    .map((edge) => ({ id: edge.id, type: edge.type, source: edge.source, target: edge.target }));
  return { nodes: simNodes, links, centers };
}

function clusterForce(centers: Map<string, { x: number; y: number }>): Force<SimNode, SimLink> {
  let nodes: SimNode[] = [];
  const force = ((alpha: number) => {
    for (const node of nodes) {
      const center = centers.get(node.cluster);
      if (!center || node.x == null || node.y == null) continue;
      const pull = node.id === node.cluster ? 0.28 : 0.08;
      node.vx = (node.vx ?? 0) + (center.x - node.x) * pull * alpha;
      node.vy = (node.vy ?? 0) + (center.y - node.y) * pull * alpha;
    }
  }) as Force<SimNode, SimLink>;
  force.initialize = (next) => {
    nodes = next;
  };
  return force;
}

function clamp(nodes: SimNode[], width: number, height: number) {
  for (const node of nodes) {
    const pad = node.radius + 12;
    node.x = Math.max(pad, Math.min(width - pad, node.x ?? width / 2));
    node.y = Math.max(pad, Math.min(height - pad, node.y ?? height / 2));
  }
}

function radiusFor(node: NetworkNodeInput, sizeBy: SizeBy, hub: boolean, clusterHead: boolean, width: number) {
  const raw = sizeBy === "degree" ? Math.min(node.degree, 10) / 10 : node[sizeBy];
  const degreeBoost = Math.min(node.degree, 9) / 9;
  const combined = sizeBy === "degree" ? raw : raw * 0.78 + degreeBoost * 0.22;
  const radius = 5 + Math.pow(Math.max(0, Math.min(1, combined)), 1.2) * 22;
  if (width < 520) {
    if (hub) return 26;
    if (clusterHead) return node.title.length > 4 ? 20 : 24;
    return Math.max(6, radius * 0.55);
  }
  if (hub) return Math.max(radius + 18, 42);
  if (clusterHead) {
    const fontSize = node.title.length > 4 ? 10 : 11;
    const needed = textWidth(node.title, fontSize) / 1.45 + 11;
    return Math.max(radius, needed, 30);
  }
  return radius;
}

function labelFits(title: string, radius: number, fontSize: number) {
  if (radius < 20) return false;
  return textWidth(title, fontSize) <= radius * 1.8;
}

function textWidth(title: string, fontSize: number) {
  let width = 0;
  for (const char of title) width += char.charCodeAt(0) > 255 ? fontSize : fontSize * 0.62;
  return width;
}

function prefersDarkText(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 145;
}
