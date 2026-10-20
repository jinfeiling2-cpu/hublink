"use client";

import { Html, Line, OrbitControls } from "@react-three/drei";
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
    <div className="h-[70vh] min-h-[440px] w-full overflow-hidden rounded-xl border border-border bg-[#f3efe6]">
      <Canvas camera={{ position: [1.7, 1.25, 1.85], fov: 42 }}>
        <color attach="background" args={["#f3efe6"]} />
        <ambientLight intensity={0.95} />
        <OrbitControls enablePan makeDefault />
        <Line points={[[0, 0, 0], [1.08, 0, 0]]} color="#8d8376" />
        <Line points={[[0, 0, 0], [0, 1.08, 0]]} color="#8d8376" />
        <Line points={[[0, 0, 0], [0, 0, 1.08]]} color="#8d8376" />
        <Html position={[1.12, 0, 0]} center>
          <span className="text-xs whitespace-nowrap text-stone-600">{axes[0]}</span>
        </Html>
        <Html position={[0, 1.14, 0]} center>
          <span className="text-xs whitespace-nowrap text-stone-600">{axes[1]}</span>
        </Html>
        <Html position={[0, 0, 1.14]} center>
          <span className="text-xs whitespace-nowrap text-stone-600">{axes[2]}</span>
        </Html>
        {points.map((point) => (
          <mesh key={point.id} position={[point.x, point.y, point.z]}>
            <sphereGeometry args={[0.028, 20, 20]} />
            <meshStandardMaterial color="#1f4d3a" />
            <Html position={[0, 0.06, 0]} center distanceFactor={5.5} zIndexRange={[20, 0]}>
              <Link href={`/node/${point.id}`} className="block max-w-36 truncate text-xs text-stone-900 hover:underline">
                {point.title}
              </Link>
            </Html>
          </mesh>
        ))}
      </Canvas>
    </div>
  );
}
