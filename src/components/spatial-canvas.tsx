"use client";

import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, type ReactNode } from "react";
import { edgeWidth, spatialSectors, type SpatialLayout } from "@/domain/spatial";
import { measureLabel } from "@/domain/registry";

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p className="p-6 text-sm leading-7 text-slate-300">当前浏览器无法启动三维渲染。请切换到“二维地图”继续阅读，或启用浏览器硬件加速。</p> : this.props.children;
  }
}

export function SpatialCanvas({ layout, selected, neighbors, resetKey, onSelect }: { layout: SpatialLayout; selected: string | null; neighbors: string[]; resetKey: number; onSelect: (id: string | null) => void }) {
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const extent = Math.max(2.8, ...layout.nodes.map((node) => Math.max(Math.abs(node.x), Math.abs(node.y), Math.abs(node.z)) / 500 + 0.4));
  const focus = new Set(neighbors);
  const key = `${layout.projection}:${layout.axes.x}:${layout.axes.y}:${layout.axes.z}:${resetKey}`;
  return <CanvasBoundary key={key}>
    <Canvas key={key} frameloop="demand" dpr={[1, 1.5]} camera={{ position: [extent * 1.3, extent, extent * 1.5], fov: 45, near: 0.01, far: 100 }} onPointerMissed={() => onSelect(null)}>
      <color attach="background" args={["#1d2b32"]} />
      <ambientLight intensity={1.5} /><directionalLight position={[3, 5, 4]} intensity={2} />
      <OrbitControls makeDefault enablePan enableZoom enableRotate minDistance={0.2} maxDistance={60} />
      {layout.projection === 'radial' ? <>
        {[380, 680, 980].map((radius) => <Line key={radius} points={Array.from({ length: 97 }, (_, index) => [Math.cos(index / 96 * Math.PI * 2) * radius / 500, Math.sin(index / 96 * Math.PI * 2) * radius / 500, 0] as [number, number, number])} color="#708995" transparent opacity={0.25} lineWidth={0.7} />)}
        {spatialSectors.map((sector) => { const angle = sector.angle * Math.PI / 180; return <Html key={sector.id} position={[Math.cos(angle) * 2.5, Math.sin(angle) * 2.5, 0]} center style={{ pointerEvents: 'none' }}><span className="whitespace-nowrap text-xs" style={{ color: sector.color }}>{sector.label}</span></Html>; })}
      </> : <>
        <Line points={[[-1.8, 0, 0], [1.8, 0, 0]]} color="#b99b6c" lineWidth={1} /><Line points={[[0, -1.8, 0], [0, 1.8, 0]]} color="#8eb69f" lineWidth={1} />
        <Html position={[2, 0, 0]} center style={{ pointerEvents: 'none' }}><span className="whitespace-nowrap text-xs text-amber-100">{measureLabel(layout.axes.x)} →</span></Html>
        <Html position={[0, 2, 0]} center style={{ pointerEvents: 'none' }}><span className="whitespace-nowrap text-xs text-green-100">{measureLabel(layout.axes.y)} ↑</span></Html>
      </>}
      <Line points={[[0, 0, -2.2], [0, 0, 2]]} color="#94b7d2" lineWidth={1} />
      <Html position={[0, 0, 2.1]} center style={{ pointerEvents: 'none' }}><span className="whitespace-nowrap text-xs text-sky-100">{measureLabel(layout.axes.z)} · 增大</span></Html>
      {layout.edges.map((edge) => {
        const from = byId.get(edge.source)!, to = byId.get(edge.target)!;
        const hot = !selected || edge.source === selected || edge.target === selected;
        return <Line key={edge.id} points={[[from.x / 500, from.y / 500, from.z / 500], [to.x / 500, to.y / 500, to.z / 500]]} color="#b5c5ce" lineWidth={edgeWidth(edge.strength)} transparent opacity={hot ? 0.25 + (edge.strength ?? 0) * 0.35 : 0.035} dashed={edge.strength === null} dashSize={0.025} gapSize={0.025} />;
      })}
      {layout.nodes.map((node) => {
        const anchor = node.id === layout.anchorId;
        const hot = !selected || focus.has(node.id);
        return <group key={node.id} position={[node.x / 500, node.y / 500, node.z / 500]}>
          <mesh onClick={(event) => { event.stopPropagation(); onSelect(node.id); }}>
            <sphereGeometry args={[Math.max(node.radius / 500, 0.025), 16, 16]} /><meshStandardMaterial color={node.color} transparent opacity={hot ? 1 : 0.16} emissive={selected === node.id ? node.color : '#000000'} emissiveIntensity={0.3} />
          </mesh>
          {anchor || selected === node.id ? <Html position={[0, node.radius / 500 + 0.09, 0]} center style={{ pointerEvents: 'none' }}><span className="block max-w-64 rounded bg-[#15232ce6] px-2 py-1 text-center text-xs leading-5 text-amber-100">{node.title}</span></Html> : null}
        </group>;
      })}
      {!layout.anchorId ? <Html center style={{ pointerEvents: 'none' }}><span className="text-xs text-amber-100">个人参照</span></Html> : null}
    </Canvas>
  </CanvasBoundary>;
}
