import Link from "next/link";
import { notFound } from "next/navigation";
import { hublinkCase } from "@/content/hublink-case";

export default async function ProjectCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "hublink") notFound();

  return (
    <main className="mx-auto grid max-w-6xl gap-12 px-4 py-10 md:py-14">
      <header className="grid max-w-3xl gap-5">
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
          返回图谱首页
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-border px-3 py-1">{hublinkCase.status}</span>
          <span className="text-muted-foreground">软件系统 · 项目案例</span>
        </div>
        <div className="grid gap-3">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{hublinkCase.title}</h1>
          <p className="text-xl text-muted-foreground">{hublinkCase.subtitle}</p>
          <p className="max-w-2xl text-base leading-8">{hublinkCase.purpose}</p>
        </div>
        <p className="max-w-2xl border-l-2 border-primary pl-4 text-sm leading-7 text-muted-foreground">
          {hublinkCase.currentState}
        </p>
      </header>

      <section className="grid gap-5">
        <SectionHeading eyebrow="SYSTEM MAP" title="系统由哪些部分组成" />
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          阅读页面、管理后台和 GitHub 同步走不同入口；它们共用图谱规则和数据保存层。下面列出当前代码中的职责边界，文件路径可用来继续核对实现。
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {hublinkCase.architecture.map((part, index) => (
            <article key={part.title} className="grid content-start gap-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-[0.16em] text-primary">PART {String(index + 1).padStart(2, "0")}</span>
                <span className="h-px flex-1 bg-border ml-4" />
              </div>
              <div className="grid gap-2">
                <h2 className="text-lg font-semibold">{part.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{part.description}</p>
              </div>
              <FileList files={part.files} />
            </article>
          ))}
          <aside className="grid content-center gap-3 rounded-2xl bg-[#243038] p-6 text-slate-100">
            <p className="text-xs font-semibold tracking-[0.16em] text-cyan-300">DATA IN THIS VERSION</p>
            <h2 className="text-xl font-semibold">SQLite</h2>
            <p className="text-sm leading-6 text-slate-300">
              当前原型把数据写在运行应用的本地 SQLite 文件中。在线后台和长期部署需要迁移到托管数据库；GitHub Pages 本身不能承载这种动态写入。
            </p>
            <code className="text-xs text-cyan-100">data/hublink.sqlite</code>
          </aside>
        </div>
      </section>

      <section className="grid gap-5">
        <SectionHeading eyebrow="HOW IT RUNS" title="三次实际操作" />
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          结构图说明职责怎样分开；操作流程说明一次请求如何经过这些部分。展开路径可以对照源码。
        </p>
        <div className="grid gap-4">
          {hublinkCase.flows.map((flow, index) => (
            <article key={flow.title} className="grid gap-5 rounded-2xl border border-border p-5 md:grid-cols-[13rem_1fr] md:p-6">
              <div className="grid content-start gap-2">
                <span className="text-xs font-semibold tracking-[0.16em] text-primary">FLOW {String(index + 1).padStart(2, "0")}</span>
                <h2 className="text-lg font-semibold">{flow.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{flow.result}</p>
              </div>
              <div className="grid gap-3">
                <ol className="grid gap-2 md:grid-cols-2">
                  {flow.steps.map((step, stepIndex) => (
                    <li key={step} className="flex gap-3 rounded-xl bg-muted/60 p-3 text-sm leading-6">
                      <span className="font-mono text-xs text-muted-foreground">{String(stepIndex + 1).padStart(2, "0")}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <FileList files={flow.files} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        <SectionHeading eyebrow="BUILD RECORD" title="仓库记录中的搭建顺序" />
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          Git 提交能确认代码大致怎样逐步形成，不能证明每个决定是谁提出、为什么作出。以下按提交记录和当前代码整理。
        </p>
        <ol className="grid gap-0 border-l border-border pl-5 md:pl-7">
          <BuildStep title="建立运行骨架" detail="创建 Next.js 项目、页面路由和基础开发配置。" />
          <BuildStep title="加入图谱规则与后台" detail="定义节点、关系、阅读方式、公开状态，以及创建和编辑数据的入口。" />
          <BuildStep title="写入 Hublink 种子案例" detail="用项目节点、架构部分和操作步骤填入第一张可运行的图。" />
          <BuildStep title="改进关系图布局" detail="从自由排布改为以人为锚点的固定空间；领域决定方位，缩放和平移只改变视角，三维模型支持旋转。" />
          <BuildStep title="让公开查询经过可见性过滤" detail="阅读页和公开 API 只读取公开节点，连接必须两端都公开。" />
          <BuildStep title="转向源码目录与调用说明" detail="近期种子内容偏向代码目录和函数路径；本页补充面向读者的系统职责、实际流程和待理解问题。" last />
        </ol>
      </section>

      <section className="grid gap-5">
        <SectionHeading eyebrow="LEARNING NOTES" title="把实现读成自己的知识" />
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          下面是可用代码检验的学习问题，不预设你已经掌握答案。读完相关文件后，可以尝试不看源码讲解，再动手改一处并观察结果。
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {hublinkCase.learningQuestions.map((item, index) => (
            <article key={item.question} className="grid content-start gap-4 rounded-2xl border border-border p-5">
              <span className="font-mono text-xs text-primary">CHECK {String(index + 1).padStart(2, "0")}</span>
              <h3 className="leading-7">{item.question}</h3>
              <FileList files={item.files} />
            </article>
          ))}
        </div>
        <div className="grid gap-5 rounded-2xl bg-muted/60 p-5 md:grid-cols-2 md:p-6">
          <div className="grid content-start gap-3">
            <h3 className="font-semibold">已由代码与验证确认</h3>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              {hublinkCase.confirmedWork.map((item) => <li key={item}>— {item}</li>)}
            </ul>
          </div>
          <div className="grid content-start gap-3">
            <h3 className="font-semibold">需要项目参与者补充</h3>
            <ul className="grid gap-2 text-sm leading-6 text-muted-foreground">
              {hublinkCase.needsOwnerInput.map((item) => <li key={item}>— {item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-5 border-t border-border pt-8">
        <SectionHeading eyebrow="NEXT BUILD" title="接下来要验证的改造" />
        <div className="grid gap-3 md:grid-cols-3">
          <NextCard title="内容结构" detail="让项目能分别记录问题、结构、运行、决定、结果、证据和个人理解。" />
          <NextCard title="在线数据" detail="把 SQLite 迁移到托管 PostgreSQL，加入管理员身份认证、备份和恢复。" />
          <NextCard title="公开发布" detail="统一检查页面、接口、搜索、缓存和关系统计，确保个人数据不进入公开输出。" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/view/network" className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">查看当前关系图</Link>
          <Link href="/view/project-depth" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">查看项目节点</Link>
          <Link href="/api/graph" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-muted">打开公开图谱 API</Link>
        </div>
      </section>
    </main>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
    </div>
  );
}

function FileList({ files }: { files: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((file) => (
        <code key={file} className="max-w-full break-all rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">{file}</code>
      ))}
    </div>
  );
}

function BuildStep({ title, detail, last = false }: { title: string; detail: string; last?: boolean }) {
  return (
    <li className={`relative grid gap-1 pb-6 ${last ? "pb-0" : ""}`}>
      <span className="absolute -left-[1.65rem] top-1.5 size-2.5 rounded-full border-2 border-primary bg-background md:-left-[2.15rem]" />
      <h3 className="font-medium">{title}</h3>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{detail}</p>
    </li>
  );
}

function NextCard({ title, detail }: { title: string; detail: string }) {
  return (
    <article className="grid content-start gap-2 rounded-xl border border-border p-4">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
    </article>
  );
}
