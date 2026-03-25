import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLessons, type Lesson } from "@/hooks/useLessons";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";

interface LessonSectionProps {
  title: string;
  items: Lesson[];
  classes: { id: string; name: string }[];
  showArrow?: boolean;
  dimmed?: boolean;
}

function LessonSection({ title, items, classes, showArrow = false, dimmed = false }: LessonSectionProps) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((lesson) => (
          <Link
            key={lesson.id}
            to={`/lessons/${lesson.id}`}
            className={`flex items-center justify-between p-3 rounded-xl border border-border bg-card ${dimmed ? "opacity-60" : "hover:border-primary/30 hover:shadow-sm cursor-pointer"} transition-all`}
          >
            <div>
              <span className={`font-medium text-sm ${dimmed ? "text-muted-foreground" : "text-foreground"}`}>
                {lesson.title}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{classes.find(c => c.id === lesson.class_id)?.name}</span>
                <span className="text-xs text-muted-foreground">·</span>
                {lesson.subjects?.name && <span className="text-xs text-muted-foreground">{lesson.subjects.name}</span>}
              </div>
            </div>
            {showArrow && (
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function D01Lessons() {
  const { data: lessons = [], isLoading } = useLessons();
  const { data: classes = [] } = useClasses();
  const { data: allSubjects = [] } = useSubjects();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const toggleFilter = (group: string, option: string) => {
    setFilters((prev) => {
      const current = prev[group] || [];
      return {
        ...prev,
        [group]: current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option],
      };
    });
  };

  const subjects = useMemo(() => {
    return allSubjects.map((s) => s.name).sort();
  }, [allSubjects]);

  const filteredLessons = useMemo(() => {
    let result = [...lessons];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => l.title.toLowerCase().includes(q));
    }

    const selectedClasses = filters["Třída"] || [];
    if (selectedClasses.length > 0) {
      const classIds = classes
        .filter((c) => selectedClasses.includes(c.name))
        .map((c) => c.id);
      result = result.filter((l) => l.class_id && classIds.includes(l.class_id));
    }

    const selectedSubjects = filters["Předmět"] || [];
    if (selectedSubjects.length > 0) {
      result = result.filter((l) => selectedSubjects.includes(l.subjects?.name || ""));
    }

    return result;
  }, [lessons, search, filters, classes]);

  const ongoing = filteredLessons.filter((l) => l.status === "ongoing");
  const prepared = filteredLessons.filter((l) => l.status === "prepared");
  const past = filteredLessons.filter((l) => l.status === "past");

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
          <Button asChild className="gap-1">
            <Link to="/lessons/create">
              <Plus className="h-4 w-4" />
              Vytvořit lekci
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SearchBar placeholder="Hledat lekci..." value={search} onChange={setSearch} />
        </div>

        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
            { label: "Předmět", options: subjects },
          ]}
          selectedValues={filters}
          onToggle={toggleFilter}
        />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání…</div>
        ) : filteredLessons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {lessons.length === 0 ? "Zatím nemáte žádné lekce." : "Žádné lekce neodpovídají vyhledávání."}
          </div>
        ) : (
          <>
            <LessonSection title="Probíhající lekce" items={ongoing} classes={classes} showArrow />
            <LessonSection title="Připravené lekce" items={prepared} classes={classes} showArrow />
            <LessonSection title="Proběhlé lekce" items={past} classes={classes} dimmed />
          </>
        )}
      </div>
    </AppLayout>
  );
}
