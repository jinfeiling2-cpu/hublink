import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "../actions";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "节点" },
  { href: "/admin/graph", label: "全图" },
  { href: "/admin/resume", label: "简历投影" },
  { href: "/admin/resume/drafts", label: "私人简历草稿" },
  { href: "/admin/mainline", label: "私人主线原型" },
  { href: "/admin/nodes/new", label: "新建" },
  { href: "/admin/edges/new", label: "连线" },
  { href: "/admin/sources", label: "来源" },
  { href: "/admin/corpus", label: "语料分析" },
  { href: "/admin/corpus/reading", label: "阅读预览" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div>
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex flex-wrap gap-3 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              退出
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
