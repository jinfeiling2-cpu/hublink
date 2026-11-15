import { z } from "zod";

const profileSchema = z.object({
  nameZh: z.string(),
  nameEn: z.string(),
  shortIntro: z.string(),
  direction: z.string(),
  alignmentAim: z.string(),
  doctoralFramework: z.string(),
  sitePurpose: z.string(),
  siteBoundary: z.string(),
  readingPaths: z.array(z.object({ href: z.string(), label: z.string(), description: z.string() })),
});

const resumeSchema = z.object({
  intention: z.string(),
  overview: z.string(),
  education: z.array(z.tuple([z.string(), z.string(), z.string()])),
  researchDirection: z.string(),
  projects: z.array(z.object({ title: z.string(), meta: z.string(), date: z.string().optional(), body: z.array(z.string()) })),
  skills: z.array(z.string()),
  papers: z.array(z.string()),
});

const publicProfile = z.object({ profile: profileSchema, resume: resumeSchema }).parse({
  profile: {
    nameZh: "Hublink",
    nameEn: "Personal Work Graph",
    shortIntro: "A local prototype for organizing projects, evidence, and reader-specific views.",
    direction: "",
    alignmentAim: "",
    doctoralFramework: "",
    sitePurpose: "Hublink organizes projects, experience, ideas, and evidence into a traceable graph.",
    siteBoundary: "Personal material and unreviewed claims are not part of this public fallback profile.",
    readingPaths: [
      { href: "/resume", label: "Resume", description: "A structured view of reviewed experience." },
      { href: "/view/network", label: "Graph", description: "Explore public nodes and their relationships." },
      { href: "/ai", label: "Machine-readable context", description: "Read the public context and its boundaries." },
    ],
  },
  resume: {
    intention: "",
    overview: "",
    education: [],
    researchDirection: "",
    projects: [],
    skills: [],
    papers: [],
  },
});

export const profile = publicProfile.profile;
export const resume = publicProfile.resume;

export function publicSiteUrl() {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!configured) return "";
  try {
    const url = new URL(configured);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.toString().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}
