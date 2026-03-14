import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { evaluationGroups } from "@/data/mockData";

export default function C01Evaluations() {
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
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <SearchBar placeholder="Hledat hodnocení..." />
          </div>
          <Button asChild className="gap-1 shrink-0">
            <Link to="/evaluations/create">
              <Plus className="h-4 w-4" />
              Vytvořit hodnocení
            </Link>
          </Button>
        </div>

        <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Název hodnocení</span>
          <span className="w-24 text-center">Počet žáků</span>
        </div>

        <div className="divide-y divide-border">
          {evaluationGroups.map((group) => (
            <Link
              key={group.id}
              to={`/evaluations/edit/${group.id}`}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4 px-4 py-3 hover:bg-accent/50 transition-colors rounded-lg items-center"
            >
              <span className="font-medium text-foreground">
                {group.name}
              </span>
              <span className="w-24 text-center text-sm text-muted-foreground">
                {group.studentCount}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
