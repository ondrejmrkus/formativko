import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
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
import { useEvaluationGroups, useDeleteEvaluationGroup } from "@/hooks/useEvaluations";
import { useClasses } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function C01Evaluations() {
  const { user } = useAuth();
  const { data: evaluationGroups = [], isLoading } = useEvaluationGroups();
  const { data: classes = [] } = useClasses();
  const deleteGroup = useDeleteEvaluationGroup();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  // Fetch all evaluations to compute per-group stats
  const { data: allEvaluations = [] } = useQuery({
    queryKey: ["evaluations", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations")
        .select("id, group_id, status");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

        <h1 className="text-2xl font-bold mb-6">Hodnocení</h1>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <SearchBar placeholder="Hledat hodnocení..." value={search} onChange={setSearch} />
          </div>
          <Button asChild className="gap-1 shrink-0">
            <Link to="/evaluations/create">
              <Plus className="h-4 w-4" />
              Vytvořit hodnocení
            </Link>
          </Button>
        </div>

        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
          ]}
          selectedValues={filters}
          onToggle={toggleFilter}
        />

        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Název hodnocení</span>
          <span className="w-48 text-center">Stav žáků</span>
          <span className="w-24 text-center">Třída</span>
          <span className="w-10"></span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání…</div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {evaluationGroups.length === 0 ? "Zatím nemáte žádná hodnocení." : "Žádná hodnocení neodpovídají vyhledávání."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroups.map((group) => {
              const cls = classes.find((c) => c.id === group.class_id);
              const stats = groupStats[group.id] || { total: 0, approved: 0, waiting: 0, insufficient: 0 };
              return (
                <div
                  key={group.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 px-4 py-3 hover:bg-accent/50 transition-colors rounded-lg items-center"
                >
                  <Link to={`/evaluations/edit/${group.id}`} className="font-medium text-foreground hover:underline">
                    {group.name}
                  </Link>
                  <div className="w-48 flex items-center justify-center gap-3 text-xs">
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
                      ({stats.total} žáků)
                    </span>
                  </div>
                  <span className="w-24 text-center text-sm text-muted-foreground">
                    {cls?.name || "—"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteGroup.mutate(group.id, {
                        onSuccess: () => toast({ title: "Hodnocení smazáno." }),
                        onError: (err) => toast({ title: "Chyba při mazání", description: err.message, variant: "destructive" }),
                      });
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Smazat hodnocení"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
