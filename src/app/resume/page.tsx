import QRCode from "qrcode";
import Image from "next/image";
import Link from "next/link";
import { profile, publicSiteUrl, resume } from "@/content/profile";
import { listNodes, listResumeProjection } from "@/db/store";
import { buildResumeProjection } from "@/domain/resume-projection";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const siteUrl = publicSiteUrl();
  const qr = siteUrl ? await QRCode.toDataURL(siteUrl, { margin: 1, width: 150, color: { dark: "#1f3b5c", light: "#ffffff" } }) : null;
  const projectedProjects = buildResumeProjection(listNodes("public"), listResumeProjection());
  return <main className="resume-page mx-auto max-w-[8.5in] bg-white px-6 py-8 text-[#252525] shadow-sm print:max-w-none print:p-0">
    <header className="resume-header"><div><h1>个人简历</h1><h2>{profile.nameZh} <span>{profile.nameEn}</span></h2>{resume.researchDirection ? <p>{resume.researchDirection}</p> : null}</div><div className="resume-qr">{qr ? <a href={siteUrl}><Image src={qr} alt="扫码打开个人网站" width={78} height={78} unoptimized /></a> : <div className="qr-placeholder">个人网站<br />二维码预留</div>}<small>{siteUrl ? "扫码进入个人网站" : "网站地址待确定"}</small></div></header>
    <ResumeSection title="求职意向"><p className="resume-lead">{resume.intention}</p></ResumeSection>
    <ResumeSection title="个人概述"><p>{resume.overview}</p></ResumeSection>
    <ResumeSection title="教育背景"><div className="resume-rows">{resume.education.map(([name, degree, date]) => <ResumeRow key={name} title={`${name} ｜ ${degree}`} date={date} />)}</div><p className="resume-indent">研究方向：{resume.researchDirection}</p></ResumeSection>
    <ResumeSection title="项目经历">
      {resume.projects.map((project) => <article className="resume-project" key={project.title}><ResumeRow title={project.title + (project.meta ? `｜${project.meta}` : "")} date={project.date} />{project.body.map((paragraph) => <p className="resume-indent" key={paragraph}>{paragraph}</p>)}</article>)}
      {projectedProjects.map(({ node }) => <article className="resume-project" key={node.id}>
        <ResumeRow title={`${node.title}${node.role ? `｜${node.role}` : ""}`} date={formatNodeDate(node.timeStart, node.timeEnd)} />
        {node.summary ? <p className="resume-indent">{node.summary}</p> : null}
        {node.outcome ? <p className="resume-indent">阶段与产出：{node.outcome}</p> : null}
        {node.status ? <p className="resume-indent">当前状态：{statusLabel(node.status)}</p> : null}
        {node.primaryUrl ? <p className="resume-indent"><a href={node.primaryUrl}>项目资料</a></p> : null}
      </article>)}
    </ResumeSection>
    <ResumeSection title="专业技能"><ul className="resume-list">{resume.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul></ResumeSection>
    <ResumeSection title="论文与研究成果"><ol className="resume-list resume-papers">{resume.papers.map((paper) => <li key={paper}>{paper}</li>)}</ol></ResumeSection>
    <footer className="resume-footer"><Link href="/">Hublink 个人工作图谱</Link><span>内容以当前简历版本为依据；网站中的研究框架、候选解释与发布状态另有边界说明。</span></footer>
  </main>;
}

function ResumeSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="resume-section"><h3>{title}</h3>{children}</section>; }
function ResumeRow({ title, date }: { title: string; date?: string }) { return <div className="resume-row"><strong>{title}</strong>{date ? <span>{date}</span> : null}</div>; }

function formatNodeDate(start: string | null, end: string | null) {
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - 至今`;
  return end || undefined;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { exploring: "探索与规划中", in_progress: "进行中", completed: "已完成", paused: "暂停" };
  return labels[status] ?? status;
}
