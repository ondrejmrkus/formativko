import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { ChevronRight, Sparkles } from "lucide-react";
import rvp1Raw from "@/../docs/Rámcový vzdělávací program pro základní vzdělávání 2025 1. stupeň.md?raw";
import rvp2Raw from "@/../docs/Rámcový vzdělávací program pro základní vzdělávání 2025 2. stupeň.md?raw";

type Stage = "1" | "2";

interface Section {
  level: number;
  title: string;
  content: string[];
  children: Section[];
}

function parseMarkdown(md: string): Section[] {
  const lines = md.split("\n");
  const root: Section[] = [];
  const stack: { level: number; section: Section }[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const section: Section = {
        level,
        title: headingMatch[2].trim(),
        content: [],
        children: [],
      };

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        root.push(section);
      } else {
        stack[stack.length - 1].section.children.push(section);
      }

      stack.push({ level, section });
    } else if (line.trim() && line.trim() !== "---") {
      if (stack.length > 0) {
        stack[stack.length - 1].section.content.push(line);
      }
    }
  }

  return root;
}

// Known group H1 titles (these contain H2 sub-sections and should stay as-is)
const GROUP_TITLES = [
  "Klíčové kompetence",
  "Průřezová témata",
  "Základní gramotnosti",
  "Vybrané vzdělávací obory",
];

function isGroupSection(title: string): boolean {
  return GROUP_TITLES.some((g) => title.includes(g));
}

function isSkippable(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes("rámcový vzdělávací program") ||
    lower === "obsah"
  );
}

/** Strip noise from section titles so both stages look the same */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*v novém RVP ZV\s*/g, "")
    .replace(/\s*\(úroveň \d\. ročník\)\s*/g, "")
    .replace(/\s*\(\d\. stupeň\)\s*/g, "")
    .replace(/\s*\(pouze \d\. stupeň\)\s*/g, "")
    .replace(/Vybrané vzdělávací obory/, "Vzdělávací obory")
    .trim();
}

function cleanSection(section: Section): Section {
  return {
    ...section,
    title: cleanTitle(section.title),
    children: section.children.map(cleanSection),
  };
}

/**
 * Normalize parsed sections so both stages have the same structure:
 * - Skip title & TOC sections
 * - Clean up titles
 * - Keep group sections (Kompetence, Průřezová témata, Gramotnosti) as-is
 * - Collect standalone subject H1s into a "Vzdělávací obory" wrapper
 */
function normalizeSections(sections: Section[]): Section[] {
  const result: Section[] = [];
  const subjectSections: Section[] = [];

  for (const s of sections) {
    if (isSkippable(s.title)) continue;

    const cleaned = cleanSection(s);
    if (isGroupSection(s.title)) {
      result.push(cleaned);
    } else {
      // Standalone subject H1 — collect to group later
      subjectSections.push(cleaned);
    }
  }

  if (subjectSections.length > 0) {
    // Convert each former H1 into an H2 child
    const children: Section[] = subjectSections.map((s) => ({
      ...s,
      level: 2,
      children: s.children.map((c) => ({ ...c, level: 3 })),
    }));

    result.push({
      level: 1,
      title: "Vzdělávací obory",
      content: [],
      children,
    });
  }

  return result;
}

function formatInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={key++} className="font-semibold text-foreground">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={key++}>{match[2]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function BulletItem({ text }: { text: string }) {
  // Pattern: **Label**: Description
  const labelMatch = text.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
  if (labelMatch) {
    return (
      <div className="py-2.5 text-sm leading-relaxed">
        <span className="font-semibold text-foreground">{labelMatch[1]}</span>
        <span className="text-foreground/70"> — {labelMatch[2]}</span>
      </div>
    );
  }

  // Pattern: **Label** (no colon)
  const boldOnlyMatch = text.match(/^\*\*(.+?)\*\*(.*)$/);
  if (boldOnlyMatch) {
    return (
      <div className="py-2.5 text-sm leading-relaxed">
        <span className="font-semibold text-foreground">{boldOnlyMatch[1]}</span>
        {boldOnlyMatch[2] && <span className="text-foreground/70">{boldOnlyMatch[2]}</span>}
      </div>
    );
  }

  return (
    <div className="py-2.5 text-sm leading-relaxed text-foreground/80">{formatInline(text)}</div>
  );
}

function ContentBlock({ lines }: { lines: string[] }) {
  const bullets: string[] = [];
  const paragraphs: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      bullets.push(trimmed.slice(2));
    } else {
      paragraphs.push(trimmed);
    }
  }

  return (
    <div>
      {paragraphs.length > 0 && (
        <div className="mb-3">
          {paragraphs.map((p, i) => (
            <p key={`p-${i}`} className="text-sm text-foreground/60 leading-relaxed mb-1">
              {formatInline(p)}
            </p>
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <div className="divide-y divide-border/40">
          {bullets.map((b, i) => (
            <BulletItem key={i} text={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionH2({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const hasContent = section.children.length > 0 || section.content.length > 0;

  return (
    <div className="rounded-lg bg-muted/30 overflow-hidden">
      <button
        onClick={() => hasContent && setOpen(!open)}
        className={`w-full text-left flex items-center gap-2.5 px-4 py-3 ${hasContent ? "cursor-pointer hover:bg-muted/50" : "cursor-default"} transition-colors`}
      >
        {hasContent && (
          <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        )}
        <h3 className="text-[15px] font-semibold">{section.title}</h3>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-10">
          {section.content.length > 0 && (
            <ContentBlock lines={section.content} />
          )}
          {section.children.length > 0 && (
            <div className="mt-2 space-y-3">
              {section.children.map((child, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-foreground/70 mb-1">{child.title}</h4>
                  {child.content.length > 0 && <ContentBlock lines={child.content} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionH1({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const hasContent = section.children.length > 0 || section.content.length > 0;

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => hasContent && setOpen(!open)}
        className={`w-full text-left flex items-center gap-3 p-5 ${hasContent ? "cursor-pointer hover:bg-muted/30" : "cursor-default"} transition-colors`}
      >
        {hasContent && (
          <ChevronRight className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        )}
        <h2 className="text-lg font-bold">{section.title}</h2>
      </button>
      {open && (
        <div className="px-5 pb-5">
          {section.content.length > 0 && (
            <div className="mb-3 pb-3 border-b border-border/40">
              <ContentBlock lines={section.content} />
            </div>
          )}
          {section.children.length > 0 && (
            <div className="space-y-2">
              {section.children.map((child, i) => (
                <SectionH2 key={i} section={child} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function R01Rvp() {
  const [stage, setStage] = useState<Stage>("1");

  const sections = useMemo(
    () => normalizeSections(parseMarkdown(stage === "1" ? rvp1Raw : rvp2Raw)),
    [stage],
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <AppBreadcrumb items={[{ label: "RVP 2025" }]} />

        <h1 className="text-2xl font-bold mt-2 mb-4">Rámcový vzdělávací program pro základní vzdělávání 2025</h1>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            Formativko pracuje s novým RVP 2025. Obsah rámcového vzdělávacího programu se automaticky promítá do všech vzdělávacích cílů a hodnocení.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setStage("1")}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              stage === "1"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30"
            }`}
          >
            1. stupeň
          </button>
          <button
            onClick={() => setStage("2")}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              stage === "2"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30"
            }`}
          >
            2. stupeň
          </button>
        </div>

        <div className="space-y-3">
          {sections.map((section, i) => (
            <SectionH1 key={`${stage}-${i}`} section={section} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
