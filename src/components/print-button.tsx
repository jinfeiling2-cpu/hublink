"use client";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="underline">打印 / 导出 PDF</button>;
}
