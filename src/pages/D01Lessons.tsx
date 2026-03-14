import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";
import { lessons, classes } from "@/data/mockData";

const ongoing = lessons.filter((l) => l.status === "ongoing");
const prepared = lessons.filter((l) => l.status === "prepared");
const past = lessons.filter((l) => l.status === "past");

interface LessonSectionProps {
  title: string;
  items: typeof lessons;
  showArrow?: boolean;
  dimmed?: boolean;
}

function LessonSection({ title, items, showArrow = false, dimmed = false }: LessonSectionProps) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((lesson) => (
          <div
            key={lesson.id}
            className={`flex items-center justify-between p-3 rounded-xl border border-border bg-card ${dimmed ? "opacity-60" : "hover:border-primary/30 hover:shadow-sm"} transition-all`}
          >
            <div>
              <span className={`font-medium text-sm ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
                {lesson.title}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{classes.find(c => c.id === lesson.classId)?.name}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{lesson.subject}</span>
              </div>
            </div>
            {showArrow && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function D01Lessons() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Lekce" },
          ]}
        />

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Lekce</h1>
          <Button className="gap-1">
            <Plus className="h-4 w-4" />
            Vytvořit lekci
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SearchBar placeholder="Hledat lekci..." />
        </div>

        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
            { label: "Předmět", options: ["Matematika", "Český jazyk", "Přírodopis", "Angličtina"] },
          ]}
        />

        <LessonSection title="Probíhající lekce" items={ongoing} showArrow />
        <LessonSection title="Připravené lekce" items={prepared} showArrow />
        <LessonSection title="Proběhlé lekce" items={past} dimmed />
      </div>
    </AppLayout>
  );
}
