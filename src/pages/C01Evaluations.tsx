import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Trash2, Check, Clock, AlertTriangle } from "lucide-react";
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
import { useEvaluationGroups, useDeleteEvaluationGroup, useAllEvaluationStats } from "@/hooks/useEvaluations";
import { useClasses } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ListSkeleton } from "@/components/shared/ListSkeleton";

export default function C01Evaluations() {
  usePageTitle("Hodnocení");
  const { data: evaluationGroups = [], isLoading } = useEvaluationGroups();
  const { data: classes = [] } = useClasses();
  const deleteGroup = useDeleteEvaluationGroup();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: allEvaluations = [] } = useAllEvaluationStats();

  const groupStats = useMemo(() => {
    const map: Record<string, { total: number; approved: number; waiting: number; insufficient: number }> = {};
    for (const ev of allEvaluations) {
      if (!ev.group_id) continue;
      if (!map[ev.group_id]) map[ev.group_id] = { total: 0, approved: 0, waiting: 0, insufficient: 0 };
      map[ev.group_id].total++;
      if (ev.status === "approved") map[ev.group_id].approved++;
      else if (ev.status === "insufficient") map[ev.group_id].insufficient++;
      else map[ev.group_id].waiting++;
    }
    return map;
  }, [allEvaluations]);

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

  const filteredGroups = useMemo(() => {
    let result = [...evaluationGroups];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }

    const selectedClasses = filters["Třída"] || [];
    if (selectedClasses.length > 0) {
      const classIds = classes
        .filter((c) => selectedClasses.includes(c.name))
        .map((c) => c.id);
      result = result.filter((g) => g.class_id && classIds.includes(g.class_id));
    }

    return result;
  }, [evaluationGroups, search, filters, classes]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Hodnocení" },
          ]}
        />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Hodnocení</h1>
          <Button asChild size="sm" className="gap-1">
            <Link to="/evaluations/create">
              <Plus className="h-4 w-4" />
              Nové hodnocení
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SearchBar placeholder="Hledat hodnocení..." value={search} onChange={setSearch} />
        </div>

        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
          ]}
          selectedValues={filters}
          onToggle={toggleFilter}
          addHref={{ "Třída": "/create-class" }}
        />

        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Název hodnocení</span>
          <span className="w-48 text-center">Stav žáků</span>
          <span className="w-24 text-center">Třída</span>
          <span className="w-10"></span>
        </div>

        {isLoading ? (
          <ListSkeleton count={6} />
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {evaluationGroups.length === 0 ? (
              <div>
                <Plus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>Zatím nemáte žádná hodnocení.</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to="/evaluations/create">Vytvořit první hodnocení</Link>
                </Button>
              </div>
            ) : (
              "Žádná hodnocení neodpovídají vyhledávání."
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGroups.map((group) => {
              const cls = classes.find((c) => c.id === group.class_id);
              const stats = groupStats[group.id] || { total: 0, approved: 0, waiting: 0, insufficient: 0 };
              return (
                <div key={group.id} className="flex items-center gap-2">
                  <Link
                    to={`/evaluations/edit/${group.id}`}
                    className="flex-1 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-foreground">{group.name}</span>
                        <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                          {cls && <Badge variant="outline" className="text-xs">{cls.name}</Badge>}
                          {stats.approved > 0 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="h-3.5 w-3.5" />
                              {stats.approved}
                            </span>
                          )}
                          {stats.waiting > 0 && (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <Clock className="h-3.5 w-3.5" />
                              {stats.waiting}
                            </span>
                          )}
                          {stats.insufficient > 0 && (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {stats.insufficient}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            ({stats.total} celkem)
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: group.id, name: group.name })}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Smazat hodnocení"
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
              <AlertDialogTitle>Smazat hodnocení</AlertDialogTitle>
              <AlertDialogDescription>
                Opravdu chcete smazat hodnocení „{deleteTarget?.name}"? Tato akce je nevratná a smaže všechny koncepty v tomto hodnocení.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Zrušit</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) {
                    deleteGroup.mutate(deleteTarget.id, {
                      onSuccess: () => toast({ title: "Hodnocení smazáno." }),
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
