import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Trash2, Book } from "lucide-react";
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
import { useSubjects, useDeleteSubject } from "@/hooks/useSubjects";
import { useGoals } from "@/hooks/useGoals";
import { useLessons } from "@/hooks/useLessons";
import { useToast } from "@/hooks/use-toast";

export default function H01Subjects() {
  const { data: subjects = [], isLoading } = useSubjects();
  const { data: goals = [] } = useGoals();
  const { data: lessons = [] } = useLessons();
  const deleteSubject = useDeleteSubject();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, search]);

  const goalCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of goals) {
      if (g.subject_id) {
        map[g.subject_id] = (map[g.subject_id] || 0) + 1;
      }
    }
    return map;
  }, [goals]);

  const lessonCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of lessons) {
      if (l.subject_id) {
        map[l.subject_id] = (map[l.subject_id] || 0) + 1;
      }
    }
    return map;
  }, [lessons]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Předměty" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Předměty</h1>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <SearchBar placeholder="Hledat předmět..." value={search} onChange={setSearch} />
          </div>
          <Button asChild className="gap-1 shrink-0">
            <Link to="/subjects/create">
              <Plus className="h-4 w-4" />
              Přidat předmět
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání...</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {subjects.length === 0 ? (
              <div>
                <Book className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>Zatím nemáte žádné předměty.</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to="/subjects/create">Vytvořit první předmět</Link>
                </Button>
              </div>
            ) : (
              "Žádné předměty neodpovídají vyhledávání."
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSubjects.map((subject) => {
              const goalCount = goalCountMap[subject.id] || 0;
              const lessonCount = lessonCountMap[subject.id] || 0;
              return (
                <div key={subject.id} className="flex items-center gap-2">
                  <Link
                    to={`/subjects/${subject.id}/edit`}
                    className="flex-1 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-medium text-foreground">{subject.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{goalCount} {goalCount === 1 ? "cíl" : goalCount >= 2 && goalCount <= 4 ? "cíle" : "cílů"}</span>
                        <span>{lessonCount} {lessonCount === 1 ? "lekce" : lessonCount >= 2 && lessonCount <= 4 ? "lekce" : "lekcí"}</span>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: subject.id, name: subject.name })}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Smazat předmět"
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
              <AlertDialogTitle>Smazat předmět</AlertDialogTitle>
              <AlertDialogDescription>
                Opravdu chcete smazat předmět &bdquo;{deleteTarget?.name}&ldquo;? Lekce a cíle s tímto předmětem zůstanou zachovány, ale nebudou mít přiřazený předmět.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) {
                    deleteSubject.mutate(deleteTarget.id, {
                      onSuccess: () => toast({ title: "Předmět smazán." }),
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
