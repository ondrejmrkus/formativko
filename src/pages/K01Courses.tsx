import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Trash2, Layers } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCourses, useDeleteCourse } from "@/hooks/useCourses";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function K01Courses() {
  const { user } = useAuth();
  const { data: courses = [], isLoading } = useCourses();
  const { data: classes = [] } = useClasses();
  const { data: allSubjects = [] } = useSubjects();
  const deleteCourse = useDeleteCourse();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Count lessons and goals per course
  const { data: lessonCounts = {} } = useQuery({
    queryKey: ["courses", "lesson_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("course_id")
        .not("course_id", "is", null);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        if (r.course_id) map[r.course_id] = (map[r.course_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user,
  });

  const { data: goalCounts = {} } = useQuery({
    queryKey: ["courses", "goal_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("course_id")
        .not("course_id", "is", null);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        if (r.course_id) map[r.course_id] = (map[r.course_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user,
  });

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

  const subjects = useMemo(
    () => allSubjects.map((s) => s.name).sort(),
    [allSubjects]
  );

  const filteredCourses = useMemo(() => {
    let result = [...courses];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.classes?.name || "").toLowerCase().includes(q) ||
          (c.subjects?.name || "").toLowerCase().includes(q)
      );
    }
    const selectedClasses = filters["Třída"] || [];
    if (selectedClasses.length > 0) {
      const classIds = classes.filter((c) => selectedClasses.includes(c.name)).map((c) => c.id);
      result = result.filter((c) => classIds.includes(c.class_id));
    }
    const selectedSubjects = filters["Předmět"] || [];
    if (selectedSubjects.length > 0) {
      result = result.filter((c) => selectedSubjects.includes(c.subjects?.name || ""));
    }
    return result;
  }, [courses, search, filters, classes]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Kurzy" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Kurzy</h1>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <SearchBar placeholder="Hledat kurz..." value={search} onChange={setSearch} />
          </div>
          <Button asChild className="gap-1 shrink-0">
            <Link to="/courses/create">
              <Plus className="h-4 w-4" />
              Nový kurz
            </Link>
          </Button>
        </div>

        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
            { label: "Předmět", options: subjects },
          ]}
          selectedValues={filters}
          onToggle={toggleFilter}
          addHref={{ "Třída": "/create-class" }}
        />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {courses.length === 0 ? (
              <div>
                <Layers className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>Zatím nemáte žádné kurzy.</p>
                <p className="text-sm mt-1">Kurz spojuje třídu a předmět do jednoho pracovního prostoru.</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to="/courses/create">Vytvořit první kurz</Link>
                </Button>
              </div>
            ) : (
              "Žádné kurzy neodpovídají vyhledávání."
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCourses.map((course) => {
              const lCount = lessonCounts[course.id] || 0;
              const gCount = goalCounts[course.id] || 0;
              return (
                <div key={course.id} className="flex items-center gap-2">
                  <Link
                    to={`/courses/${course.id}`}
                    className="flex-1 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground">{course.name}</h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {course.classes?.name && (
                            <Badge variant="outline" className="text-xs">{course.classes.name}</Badge>
                          )}
                          {course.subjects?.name && (
                            <Badge variant="secondary" className="text-xs">{course.subjects.name}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {gCount} {gCount === 1 ? "cíl" : gCount >= 2 && gCount <= 4 ? "cíle" : "cílů"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {lCount} {lCount === 1 ? "lekce" : lCount >= 2 && lCount <= 4 ? "lekce" : "lekcí"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: course.id, name: course.name })}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Smazat kurz"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat kurz</AlertDialogTitle>
              <AlertDialogDescription>
                Opravdu chcete smazat kurz &bdquo;{deleteTarget?.name}&ldquo;? Lekce a cíle zůstanou zachovány, ale ztratí propojení s kurzem.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) {
                    deleteCourse.mutate(deleteTarget.id, {
                      onSuccess: () => toast({ title: "Kurz smazán." }),
                      onError: (err) => toast({ title: "Chyba při mazání", description: err.message, variant: "destructive" }),
                    });
                  }
                  setDeleteTarget(null);
                }}
              >
                Smazat
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
