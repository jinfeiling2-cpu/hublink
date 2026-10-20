"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import type { AxisPoint } from "@/domain/graph";

export function AxisCanvas({
  points,
  axes,
}: {
  points: AxisPoint[];
  axes: [string, string, string];
}) {
  return (
    <div className="grid gap-3">
      <div className="h-[70vh] min-h-[440px] w-full overflow-hidden rounded-xl border border-border bg-[#f3efe6]">
        <Canvas camera={{ position: [1.7, 1.25, 1.85], fov: 42 }}>
          <color attach="background" args={["#f3efe6"]} />
          <ambientLight intensity={0.95} />
          <OrbitControls enablePan makeDefault />
          <Line points={[[0, 0, 0], [1.08, 0, 0]]} color="#8d8376" />
          <Line points={[[0, 0, 0], [0, 1.08, 0]]} color="#8d8376" />
          <Line points={[[0, 0, 0], [0, 0, 1.08]]} color="#8d8376" />
          {points.map((point) => (
            <mesh key={point.id} position={[point.x, point.y, point.z]}>
              <sphereGeometry args={[0.028, 20, 20]} />
              <meshStandardMaterial color="#1f4d3a" />
            </mesh>
          ))}
        </Canvas>
      </div>
      <p className="text-xs text-muted-foreground">
        横轴 {axes[0]} · 纵轴 {axes[1]} · 深轴 {axes[2]}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {points.map((point) => (
          <li key={point.id}>
            <Link href={`/node/${point.id}`} className="text-sm underline underline-offset-4">
              {point.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
