import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Trash2, Target } from "lucide-react";
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
import { useGoals, useDeleteGoal } from "@/hooks/useGoals";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function G01Goals() {
  const { user } = useAuth();
  const { data: goals = [], isLoading } = useGoals();
  const { data: classes = [] } = useClasses();
  const { data: allSubjects = [] } = useSubjects();
  const deleteGoal = useDeleteGoal();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Fetch criteria counts and proof counts per goal
  const { data: criteriaCountMap = {} } = useQuery({
    queryKey: ["goals", "criteria_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select("goal_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        map[r.goal_id] = (map[r.goal_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user,
  });

  const { data: proofCountMap = {} } = useQuery({
    queryKey: ["goals", "proof_counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proof_goals")
        .select("goal_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        map[r.goal_id] = (map[r.goal_id] || 0) + 1;
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

  const filteredGoals = useMemo(() => {
    let result = [...goals];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q) || (g.subjects?.name || "").toLowerCase().includes(q)
      );
    }
    const selectedClasses = filters["Třída"] || [];
    if (selectedClasses.length > 0) {
      const classIds = classes.filter((c) => selectedClasses.includes(c.name)).map((c) => c.id);
      result = result.filter((g) => classIds.includes(g.class_id));
    }
    const selectedSubjects = filters["Předmět"] || [];
    if (selectedSubjects.length > 0) {
      result = result.filter((g) => selectedSubjects.includes(g.subjects?.name || ""));
    }
    return result;
  }, [goals, search, filters, classes]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Cíle" },
          ]}
        />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Vzdělávací cíle</h1>
          <Button asChild size="sm" className="gap-1">
            <Link to="/goals/create">
              <Plus className="h-4 w-4" />
              Nový cíl
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SearchBar placeholder="Hledat cíl..." value={search} onChange={setSearch} />
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
          <div className="text-center py-12 text-muted-foreground">Načítání…</div>
        ) : filteredGoals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {goals.length === 0 ? (
              <div>
                <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>Zatím nemáte žádné vzdělávací cíle.</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to="/goals/create">Vytvořit první cíl</Link>
                </Button>
              </div>
            ) : (
              "Žádné cíle neodpovídají vyhledávání."
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGoals.map((goal) => {
              const cls = classes.find((c) => c.id === goal.class_id);
              const criteriaCount = criteriaCountMap[goal.id] || 0;
              const proofCount = proofCountMap[goal.id] || 0;
              return (
                <div
                  key={goal.id}
                  className="flex items-center gap-2"
                >
                  <Link
                    to={`/goals/${goal.id}`}
                    className="flex-1 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {goal.subjects?.name && <Badge variant="secondary" className="text-xs">{goal.subjects.name}</Badge>}
                          {cls && <Badge variant="outline" className="text-xs">{cls.name}</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {criteriaCount} {criteriaCount === 1 ? "kritérium" : criteriaCount >= 2 && criteriaCount <= 4 ? "kritéria" : "kritérií"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {proofCount} {proofCount === 1 ? "důkaz" : proofCount >= 2 && proofCount <= 4 ? "důkazy" : "důkazů"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: goal.id, title: goal.title })}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Smazat cíl"
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
              <AlertDialogTitle>Smazat vzdělávací cíl</AlertDialogTitle>
              <AlertDialogDescription>
                Opravdu chcete smazat cíl &bdquo;{deleteTarget?.title}&ldquo;? Tato akce je nevratná a smaže všechna kritéria a propojení s důkazy.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) {
                    deleteGoal.mutate(deleteTarget.id, {
                      onSuccess: () => toast({ title: "Cíl smazán." }),
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
