import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-xl gap-3 px-4 py-16">
      <h1 className="text-2xl font-semibold">这里没有公开内容。</h1>
      <p className="text-sm leading-6 text-muted-foreground">节点可能尚未建立，或者仍标为个人。个人节点不会出现在阅读页。</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        返回阅读入口
      </Link>
    </main>
  );
}
