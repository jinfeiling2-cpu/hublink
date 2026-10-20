"use client";

import dynamic from "next/dynamic";
import type { AxisPoint } from "@/domain/graph";

const AxisCanvas = dynamic(() => import("@/components/axis-canvas").then((mod) => mod.AxisCanvas), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">正在准备三维网格…</p>,
});

export function AxisView({ points, axes }: { points: AxisPoint[]; axes: [string, string, string] }) {
  return <AxisCanvas points={points} axes={axes} />;
}
