import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { useClasses, useAllClassStudents } from "@/hooks/useClasses";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ListSkeleton } from "@/components/shared/ListSkeleton";

function ClassCard({ cls, studentCount }: { cls: { id: string; name: string }; studentCount: number }) {
  return (
    <Link
      to={`/edit-class/${cls.id}`}
      className="block p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{cls.name}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-4 w-4" />
          {studentCount} {studentCount === 1 ? "žák" : studentCount < 5 ? "žáci" : "žáků"}
        </span>
      </div>
    </Link>
  );
}

export default function F01Classes() {
  usePageTitle("Třídy");
  const { data: classes = [], isLoading } = useClasses();
  const [search, setSearch] = useState("");

  const { data: allClassStudents = [] } = useAllClassStudents();

  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    allClassStudents.forEach((cs) => {
      map[cs.class_id] = (map[cs.class_id] || 0) + 1;
    });
    return map;
  }, [allClassStudents]);

  const filtered = useMemo(() => {
    let result = [...classes].sort((a, b) => a.name.localeCompare(b.name, "cs"));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return result;
  }, [classes, search]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Třídy" },
          ]}
        />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Třídy</h1>
          <Button asChild size="sm">
            <Link to="/create-class">
              <Plus className="h-4 w-4 mr-1" />
              Nová třída
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SearchBar placeholder="Hledat třídu..." value={search} onChange={setSearch} />
        </div>

        {isLoading ? (
          <ListSkeleton variant="row" count={6} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {classes.length === 0 ? (
              <div>
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>Zatím nemáte žádné třídy.</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to="/create-class">Vytvořit první třídu</Link>
                </Button>
              </div>
            ) : (
              "Žádné třídy neodpovídají vyhledávání."
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((cls) => (
              <ClassCard key={cls.id} cls={cls} studentCount={countMap[cls.id] || 0} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
