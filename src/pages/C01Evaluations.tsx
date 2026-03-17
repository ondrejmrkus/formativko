import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useEvaluationGroups, useDeleteEvaluationGroup } from "@/hooks/useEvaluations";
import { useClasses } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";

export default function C01Evaluations() {
  const { data: evaluationGroups = [], isLoading } = useEvaluationGroups();
  const { data: classes = [] } = useClasses();
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

        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vyhledat hodnocení</p>
        </div>
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

        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Filtrovat</p>
        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
          ]}
          selectedValues={filters}
          onToggle={toggleFilter}
        />

        <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Název hodnocení</span>
          <span className="w-24 text-center">Třída</span>
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
              return (
                <Link
                  key={group.id}
                  to={`/evaluations/edit/${group.id}`}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 px-4 py-3 hover:bg-accent/50 transition-colors rounded-lg items-center"
                >
                  <span className="font-medium text-foreground">
                    {group.name}
                  </span>
                  <span className="w-24 text-center text-sm text-muted-foreground">
                    {cls?.name || "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
