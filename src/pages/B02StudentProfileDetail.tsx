import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { useStudent, getStudentDisplayName } from "@/hooks/useStudents";
import { useStudentClasses } from "@/hooks/useClasses";
import { useProofsForStudent } from "@/hooks/useProofs";

export default function B02StudentProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: student, isLoading } = useStudent(id);
  const { data: studentClasses = [] } = useStudentClasses(id);
  const { data: proofs = [] } = useProofsForStudent(id);

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

  const filteredProofs = useMemo(() => {
    let result = [...proofs];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.note || "").toLowerCase().includes(q)
      );
    }

    const selectedTypes = filters["Typ důkazu"] || [];
    if (selectedTypes.length > 0) {
      const typeMap: Record<string, string> = {
        Text: "text",
        Hlas: "voice",
        Foto: "camera",
        Soubor: "file",
      };
      const types = selectedTypes.map((t) => typeMap[t]).filter(Boolean);
      result = result.filter((p) => types.includes(p.type));
    }

    return result;
  }, [proofs, search, filters]);

  if (isLoading || !student) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Žáci", href: "/student-profiles" },
            { label: getStudentDisplayName(student) },
          ]}
        />

        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">{getStudentDisplayName(student)}</h1>
          {studentClasses.map((c) => (
            <Badge key={c.id} variant="secondary">{c.name}</Badge>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <SearchBar placeholder="Hledat důkaz..." value={search} onChange={setSearch} />
          </div>
          <Button asChild size="sm" className="gap-1">
            <Link to={`/student-profiles/${student.id}/add-proof`}>
              <Plus className="h-4 w-4" />
              Přidat důkaz
            </Link>
          </Button>
        </div>

        <ClassFilterBar
          vertical
          groups={[
            { label: "Typ důkazu", options: ["Text", "Hlas", "Foto", "Soubor"] },
          ]}
          selectedValues={filters}
          onToggle={toggleFilter}
        />

        {filteredProofs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {proofs.length === 0
              ? "Zatím žádné důkazy o učení."
              : "Žádné důkazy neodpovídají vyhledávání."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProofs.map((proof) => (
              <Link
                key={proof.id}
                to={
                  proof.type === "file" || proof.type === "camera"
                    ? `/student-profiles/${student.id}/proof-file/${proof.id}`
                    : `/student-profiles/${student.id}/proof/${proof.id}`
                }
                className="block p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{proof.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {proof.note}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">{proof.date}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {proof.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
