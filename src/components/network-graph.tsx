"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { edgeTypeById, measureLabel, nodeTypeById } from "@/domain/registry";
import { buildSpatialLayout, defaultSpatialAxes, edgeWidth, spatialSectors, type RadialMeasure, type SpatialAxes, type SpatialLayout, type SpatialProjection } from "@/domain/spatial";
import type { MeasureKey } from "@/domain/types";
import type { NetworkEdgeInput, NetworkNodeInput } from "@/lib/network";

const SpatialCanvas = dynamic(() => import("./spatial-canvas").then((module) => module.SpatialCanvas), { ssr: false, loading: () => <p className="p-6 text-sm text-slate-300">正在载入三维空间…</p> });
const keys: MeasureKey[] = ["importance", "centrality", "scale", "degree", "time"];
const controlClass = "rounded-md border border-white/20 bg-[#233039] px-2 py-1.5 text-xs text-slate-100";
type Camera = { x: number; y: number; zoom: number };

export function NetworkGraph({ nodes, edges, height = 680, initialSelected = null, nodeLinkBase = "/node", initialMode = "2d", initialProjection = "radial", initialAxes = defaultSpatialAxes }: {
  nodes: NetworkNodeInput[]; edges: NetworkEdgeInput[]; height?: number; initialSelected?: string | null; nodeLinkBase?: string | null;
  initialMode?: "2d" | "3d"; initialProjection?: SpatialProjection; initialAxes?: SpatialAxes;
}) {
  const [mode, setMode] = useState(initialMode);
  const [projection, setProjection] = useState(initialProjection);
  const [axes, setAxes] = useState(initialAxes);
  const [radialBy, setRadialBy] = useState<RadialMeasure>("centrality");
  const [selected, setSelected] = useState(initialSelected);
  const [hovered, setHovered] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const layout = useMemo(() => buildSpatialLayout(nodes, edges, { projection, axes, radialBy }), [nodes, edges, projection, axes, radialBy]);
  const active = layout.nodes.find((node) => node.id === selected);
  const focus = selected ?? hovered;
  const neighbors = useMemo(() => {
    const result = new Set<string>();
    if (focus) {
      result.add(focus);
      for (const edge of layout.edges) {
        if (edge.source === focus) result.add(edge.target);
        if (edge.target === focus) result.add(edge.source);
      }
    }
    return result;
  }, [focus, layout]);
  const matches = layout.nodes.filter((node) => `${node.title} ${node.summary}`.toLowerCase().includes(search.toLowerCase()));
  const connections = layout.edges.filter((edge) => edge.source === selected || edge.target === selected);
  const titleById = new Map(layout.nodes.map((node) => [node.id, node.title]));

  return <div className="grid gap-4 text-slate-100">
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md border border-white/20 p-0.5" aria-label="显示方式">
        {([['2d', '二维地图'], ['3d', '三维模型']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`rounded px-3 py-1.5 text-xs ${mode === value ? 'bg-[#e7c88d] text-[#263239]' : 'text-slate-300'}`}>{label}</button>)}
      </div>
      <label className="flex items-center gap-2 text-xs">投影<select className={controlClass} value={projection} onChange={(event) => setProjection(event.target.value as SpatialProjection)}><option value="radial">个人中心 · 远近与领域</option><option value="axes">维度坐标 · 数值分布</option></select></label>
      {projection === "radial" ? <label className="flex items-center gap-2 text-xs">远近依据<select className={controlClass} value={radialBy} onChange={(event) => setRadialBy(event.target.value as RadialMeasure)}>{keys.filter((key) => key !== "time").map((key) => <option key={key} value={key}>{measureLabel(key)}</option>)}</select></label> : <>
        <DimensionSelect label="横轴" value={axes.x} onChange={(x) => setAxes({ ...axes, x })} />
        <DimensionSelect label="纵轴" value={axes.y} onChange={(y) => setAxes({ ...axes, y })} />
      </>}
      {mode === "3d" ? <DimensionSelect label="深轴" value={axes.z} onChange={(z) => setAxes({ ...axes, z })} /> : null}
      <button type="button" className={`${controlClass} ml-auto`} onClick={() => setResetKey((key) => key + 1)}>显示全图</button>
    </div>
    <p className="text-xs leading-6 text-slate-300">{mode === "2d" ? "滚轮缩放，拖动画布平移；触屏可双指缩放。" : "左键拖动旋转，右键拖动平移，滚轮缩放；触屏单指旋转、双指缩放和平移。"} 点击节点查看内容。节点位置固定，操作只改变观看视角。</p>
    {mode === "2d" ? <MapCanvas layout={layout} height={height} selected={selected} hovered={hovered} neighbors={neighbors} resetKey={resetKey} radialBy={radialBy} onSelect={setSelected} onHover={setHovered} /> : <div className="overflow-hidden rounded-xl" style={{ height: Math.min(height, 720), minHeight: 380 }}><SpatialCanvas layout={layout} selected={selected} neighbors={[...neighbors]} resetKey={resetKey} onSelect={setSelected} /></div>}
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">{spatialSectors.map((sector) => <span key={sector.id} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: sector.color }} />{sector.label}</span>)}</div>
    <p className="text-xs leading-6 text-slate-400">{projection === "radial" ? `${measureLabel(radialBy)}越高越接近中心；方位按活动分类，未填写时沿“包含”关系继承。` : "横轴向右、纵轴向上数值增大；中心人物是参照点，其余节点按维度定位，距离不再表示亲疏。"} 圆的大小表示重要性，线条越粗表示人工关联权重越高；虚线表示未提供权重。数值为整理依据，不是概率或人格测量。{!layout.anchorId ? "本图没有人物节点，原点仅作个人参照。" : ""}</p>
    <details className="rounded-lg border border-white/10 p-3 text-xs text-slate-300"><summary className="cursor-pointer">坐标、缺失值与重合说明</summary><p className="mt-2 leading-6">重要性、个人关联度和规模使用已登记的 0–1 值；时间和连接数按当前图的范围归一化。相同值保持同坐标，可从下方列表选择重合节点。缺失时间单独放在“未填写”区域，不视为最早日期。旧数据中的默认 0 无法与人工填写的 0 区分。方位是阅读分类，不表示领域间的心理距离或因果关系。</p></details>
    <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
      <input aria-label="搜索图中节点" placeholder="搜索节点或摘要" value={search} onChange={(event) => setSearch(event.target.value)} className={controlClass} />
      <select aria-label="选择图中节点" className={controlClass} value={matches.some((node) => node.id === selected) ? selected ?? "" : ""} onChange={(event) => setSelected(event.target.value || null)}><option value="">{matches.length} 个节点 · 选择查看</option>{matches.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select>
    </div>
    {active ? <article className="grid gap-3 rounded-xl border border-white/15 bg-white/5 p-4">
      <div><p className="text-xs text-slate-400">{nodeTypeById(active.type)?.label} · {active.categoryBasis === "explicit" ? "节点活动分类" : active.categoryBasis === "inherited" ? "继承组成关系中的分类" : "活动待分类"}</p><h3 className="mt-1 text-lg font-semibold">{active.title}</h3></div>
      <p className="text-sm leading-7 text-slate-200">{active.summary}</p>
      <p className="text-xs text-slate-400">重要性 {active.importance} · 个人关联度 {active.centrality} · 规模 {active.scale} · {active.degree} 条连接 · 时间 {active.timeStart ?? "未填写"}</p>
      {nodeLinkBase ? <Link href={`${nodeLinkBase}/${active.id}`} className="w-fit text-sm text-amber-200 underline underline-offset-4">继续阅读这个节点 →</Link> : null}
      {connections.length ? <details><summary className="cursor-pointer text-xs text-slate-300">查看 {connections.length} 条直接关系与理由</summary><ul className="mt-3 grid gap-2">{connections.map((edge) => <li key={edge.id} className="text-xs leading-6 text-slate-300">{titleById.get(edge.source)} → {titleById.get(edge.target)} · {edgeTypeById(edge.type)?.label ?? edge.type} · 权重 {edge.strength ?? "未填写"}{edge.label ? <span className="block text-slate-400">{edge.label}</span> : null}</li>)}</ul></details> : null}
    </article> : <p className="text-xs text-slate-400">选择一个节点，查看它的摘要、维度与连接理由。</p>}
  </div>;
}

function DimensionSelect({ label, value, onChange }: { label: string; value: MeasureKey; onChange: (key: MeasureKey) => void }) {
  return <label className="flex items-center gap-2 text-xs">{label}<select className={controlClass} value={value} onChange={(event) => onChange(event.target.value as MeasureKey)}>{keys.map((key) => <option key={key} value={key}>{measureLabel(key)}</option>)}</select></label>;
}

function MapCanvas({ layout, height, selected, hovered, neighbors, resetKey, radialBy, onSelect, onHover }: {
  layout: SpatialLayout; height: number; selected: string | null; hovered: string | null; neighbors: Set<string>; resetKey: number; radialBy: RadialMeasure;
  onSelect: (id: string | null) => void; onHover: (id: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef(camera);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const click = useRef<{ x: number; y: number; id: string | null; moved: boolean } | null>(null);
  const mapHeight = Math.min(height, 640);
  const extent = Math.max(1300, ...layout.nodes.map((node) => Math.max(Math.abs(node.x), Math.abs(node.y)) + 100));
  const baseHeight = Math.max(extent * 2, extent * 2 * mapHeight / width);
  const baseWidth = baseHeight * width / mapHeight;
  const dimensions = useRef({ width: baseWidth, height: baseHeight });
  dimensions.current = { width: baseWidth, height: baseHeight };
  const update = (next: Camera) => { cameraRef.current = next; setCamera(next); };

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, entry.contentRect.width)));
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const next = { x: 0, y: 0, zoom: 1 };
    cameraRef.current = next;
    setCamera(next);
  }, [layout, resetKey]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const old = cameraRef.current;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1);
      const zoom = Math.max(0.2, Math.min(16, old.zoom * Math.exp(-delta * 0.0015)));
      const next = { x: point.x - (point.x - old.x) * old.zoom / zoom, y: point.y - (point.y - old.y) * old.zoom / zoom, zoom };
      cameraRef.current = next; setCamera(next);
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, []);

  const down = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const node = (event.target as Element).closest("[data-node-id]");
    if (pointers.current.size === 1) click.current = { x: event.clientX, y: event.clientY, id: node?.getAttribute("data-node-id") ?? null, moved: false };
    else if (click.current) click.current.moved = true;
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    const oldPoint = pointers.current.get(event.pointerId);
    if (!oldPoint) return;
    const oldPoints = [...pointers.current.values()];
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (click.current && Math.hypot(event.clientX - click.current.x, event.clientY - click.current.y) > 4) click.current.moved = true;
    const old = cameraRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    if (pointers.current.size === 2) {
      const nextPoints = [...pointers.current.values()];
      const distance = (points: { x: number; y: number }[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const midpoint = (points: { x: number; y: number }[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
      const before = midpoint(oldPoints), after = midpoint(nextPoints);
      const zoom = Math.max(0.2, Math.min(16, old.zoom * distance(nextPoints) / Math.max(1, distance(oldPoints))));
      const sx = dimensions.current.width / rect.width, sy = dimensions.current.height / rect.height;
      const anchor = { x: old.x + (before.x - rect.left - rect.width / 2) * sx / old.zoom, y: old.y + (before.y - rect.top - rect.height / 2) * sy / old.zoom };
      update({ x: anchor.x - (after.x - rect.left - rect.width / 2) * sx / zoom, y: anchor.y - (after.y - rect.top - rect.height / 2) * sy / zoom, zoom });
    } else if (pointers.current.size === 1) {
      update({ ...old, x: old.x - (event.clientX - oldPoint.x) * dimensions.current.width / (rect.width * old.zoom), y: old.y - (event.clientY - oldPoint.y) * dimensions.current.height / (rect.height * old.zoom) });
    }
  };
  const finish = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.type !== "pointercancel" && pointers.current.size === 0 && click.current && !click.current.moved) onSelect(click.current.id);
    if (pointers.current.size === 0) click.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const focus = selected ?? hovered;
  const ordered = [...layout.nodes].sort((a, b) => Number(a.id === selected) - Number(b.id === selected));
  const vw = baseWidth / camera.zoom, vh = baseHeight / camera.zoom;
  return <div ref={wrapperRef} className="relative overflow-hidden rounded-xl border border-white/10 bg-[#1d2b32]" style={{ height: mapHeight }}>
    <svg ref={svgRef} width="100%" height="100%" viewBox={`${camera.x - vw / 2} ${camera.y - vh / 2} ${vw} ${vh}`} role="img" aria-label="固定坐标个人图谱，可缩放和平移" style={{ touchAction: "none", cursor: "grab" }} onPointerDown={down} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={(event) => { pointers.current.delete(event.pointerId); }}>
      <MapGuides layout={layout} radialBy={radialBy} />
      {layout.edges.map((edge) => {
        const from = byId.get(edge.source)!, to = byId.get(edge.target)!;
        const hot = !focus || edge.source === focus || edge.target === focus;
        return <line key={edge.id} x1={from.x} y1={-from.y} x2={to.x} y2={-to.y} stroke={hot ? '#afbec7' : '#afbec7'} strokeOpacity={hot ? 0.3 + (edge.strength ?? 0) * 0.35 : 0.045} strokeWidth={edgeWidth(edge.strength)} strokeDasharray={edge.strength === null ? "5 5" : undefined} vectorEffect="non-scaling-stroke"><title>{edgeTypeById(edge.type)?.label ?? edge.type}{edge.label ? `：${edge.label}` : ''} · 权重 {edge.strength ?? '未填写'}</title></line>;
      })}
      {ordered.map((node) => {
        const hot = !focus || neighbors.has(node.id);
        const anchor = node.id === layout.anchorId;
        const label = anchor || selected === node.id || hovered === node.id || (camera.zoom > 2.5 && hot);
        return <g key={node.id} data-node-id={node.id} transform={`translate(${node.x} ${-node.y})`} opacity={hot ? 1 : 0.18} tabIndex={0} role="button" aria-label={node.title} style={{ cursor: 'pointer' }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(node.id); } }} onPointerEnter={() => onHover(node.id)} onPointerLeave={() => onHover(null)}>
          <circle r={node.radius + 8} fill="transparent" />
          {selected === node.id || anchor ? <circle r={node.radius + 7} fill="none" stroke="#f0c97a" strokeWidth={1.3} vectorEffect="non-scaling-stroke" /> : null}
          <circle r={node.radius} fill={node.color} stroke="#18252c" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <title>{node.title}</title>
          {label ? <text y={node.radius + 26} textAnchor="middle" fill="#f3eee3" fontSize={22} paintOrder="stroke" stroke="#1d2b32" strokeWidth={6} strokeLinejoin="round" style={{ pointerEvents: 'none' }}>{node.title}</text> : null}
        </g>;
      })}
      {!layout.anchorId ? <g><circle r={30} fill="none" stroke="#e7c88d" /><text y={60} textAnchor="middle" fontSize={22} fill="#e7c88d">个人参照</text></g> : null}
    </svg>
    <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-[#17232bcc] px-2 py-1 text-xs text-slate-300">{Math.round(camera.zoom * 100)}% · {layout.nodes.length} 节点</div>
  </div>;
}

function MapGuides({ layout, radialBy }: { layout: SpatialLayout; radialBy: RadialMeasure }) {
  if (layout.projection === 'radial') return <g pointerEvents="none">
    {[0.8, 0.5, 0.2].map((value) => { const r = 180 + (1 - value) * 1000; return <g key={value}><circle r={r} fill="none" stroke="#92a8b3" strokeOpacity={0.17} strokeDasharray="6 10" /><text x={28} y={-r - 12} fill="#aabac2" fontSize={21}>{measureLabel(radialBy)} {value}</text></g>; })}
    {spatialSectors.map((sector) => { const angle = sector.angle * Math.PI / 180; return <g key={sector.id}><line x1={Math.cos(angle) * 100} y1={-Math.sin(angle) * 100} x2={Math.cos(angle) * 1250} y2={-Math.sin(angle) * 1250} stroke={sector.color} strokeOpacity={0.12} /><text x={Math.cos(angle) * 1220} y={-Math.sin(angle) * 1220} textAnchor="middle" fill={sector.color} fontSize={28}>{sector.label}</text></g>; })}
  </g>;
  return <g pointerEvents="none" fill="#aabac2" fontSize={23}>
    {[-800, -400, 0, 400, 800].map((value) => <g key={value}><line x1={value} x2={value} y1={-850} y2={850} stroke="#aabac2" strokeOpacity={0.12} /><line y1={value} y2={value} x1={-850} x2={850} stroke="#aabac2" strokeOpacity={0.12} /><text x={value} y={900} textAnchor="middle">{axisTick(layout, layout.axes.x, (value + 800) / 1600)}</text><text x={-930} y={-value + 8} textAnchor="end">{axisTick(layout, layout.axes.y, (value + 800) / 1600)}</text></g>)}
    <text x={0} y={990} textAnchor="middle">{measureLabel(layout.axes.x)} → 增大</text><text x={-930} y={-960} textAnchor="end">{measureLabel(layout.axes.y)} ↑ 增大</text>
    <text x={1080} y={-950} textAnchor="middle">横轴未填写</text><text x={0} y={1140} textAnchor="middle">纵轴未填写</text>
  </g>;
}

function axisTick(layout: SpatialLayout, key: MeasureKey, normalized: number) {
  if (key !== 'time' && key !== 'degree') return normalized.toFixed(2);
  const range = layout.ranges[key];
  if (!range) return '未填写';
  const value = range.min + normalized * (range.max - range.min);
  return key === 'time' ? new Date(value).toISOString().slice(0, 7) : value.toFixed(0);
}
