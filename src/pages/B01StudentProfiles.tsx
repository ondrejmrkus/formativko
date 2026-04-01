import { useState, useMemo, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUp, ArrowDown } from "lucide-react";
import { useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useClasses, useAllClassStudents } from "@/hooks/useClasses";
import { useStudentProofCounts } from "@/hooks/useProofs";
import { Pagination } from "@/components/shared/Pagination";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ListSkeleton } from "@/components/shared/ListSkeleton";

const PAGE_SIZE = 50;

export default function B01StudentProfiles() {
  usePageTitle("Profily žáků");
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: classes = [] } = useClasses();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sortBy, setSortBy] = useState<"name" | "proofs">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const toggleSort = useCallback((col: "name" | "proofs") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }, [sortBy]);

  // Get all class_students mappings and proof counts in bulk
  const { data: classStudentMap = [] } = useAllClassStudents();
  const { data: proofCounts = [] } = useStudentProofCounts();

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

  const proofCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of proofCounts) {
      map[p.student_id] = (map[p.student_id] || 0) + 1;
    }
    return map;
  }, [proofCounts]);

  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q)
      );
    }

    const selectedClasses = filters["Třída"] || [];
    if (selectedClasses.length > 0) {
      const classIds = classes
        .filter((c) => selectedClasses.includes(c.name))
        .map((c) => c.id);
      const studentIdsInClasses = new Set(
        classStudentMap
          .filter((cs) => classIds.includes(cs.class_id))
          .map((cs) => cs.student_id)
      );
      result = result.filter((s) => studentIdsInClasses.has(s.id));
    }

    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "name") {
      result.sort((a, b) => a.last_name.localeCompare(b.last_name, "cs") * dir);
    } else {
      result.sort((a, b) => ((proofCountMap[a.id] || 0) - (proofCountMap[b.id] || 0)) * dir);
    }

    return result;
  }, [students, search, filters, classes, classStudentMap, sortBy, sortDir, proofCountMap]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, filters, sortBy, sortDir]);

  const paginatedStudents = useMemo(
    () => filteredStudents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredStudents, page]
  );

  const getStudentClassNames = (studentId: string) => {
    const cids = classStudentMap
      .filter((cs) => cs.student_id === studentId)
      .map((cs) => cs.class_id);
    return classes.filter((c) => cids.includes(c.id));
  };

  const getProofCount = (studentId: string) => proofCountMap[studentId] || 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Žáci" },
          ]}
        />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Profily žáků</h1>
          <Button asChild size="sm">
            <Link to="/create-student-profiles">
              <Plus className="h-4 w-4 mr-1" />
              Nový žák
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SearchBar placeholder="Hledat žáka..." value={search} onChange={setSearch} />
        </div>

        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
          ]}
          selectedValues={filters}
          onToggle={toggleFilter}
          addHref={{ "Třída": "/create-class" }}
        />

        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
          <span className="mr-1">Řazení:</span>
          <button onClick={() => toggleSort("name")} className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${sortBy === "name" ? "bg-accent text-foreground font-medium" : "hover:text-foreground"}`}>
            Jméno
            {sortBy === "name" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
          </button>
          <button onClick={() => toggleSort("proofs")} className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${sortBy === "proofs" ? "bg-accent text-foreground font-medium" : "hover:text-foreground"}`}>
            Důkazy
            {sortBy === "proofs" && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
          </button>
        </div>

        {studentsLoading ? (
          <ListSkeleton count={8} />
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {students.length === 0 ? (
              <div>
                <Plus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>Zatím nemáte žádné žáky.</p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to="/create-student-profiles">Přidat prvního žáka</Link>
                </Button>
              </div>
            ) : (
              "Žádní žáci neodpovídají vyhledávání."
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedStudents.map((student) => {
              const studentClasses = getStudentClassNames(student.id);
              const proofCount = getProofCount(student.id);
              return (
                <Link
                  key={student.id}
                  to={`/student-profiles/${student.id}`}
                  className="block p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-foreground truncate">
                        {getStudentDisplayName(student)}
                      </span>
                      {student.svp && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">SVP</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {studentClasses.map((c) => (
                        <Badge key={c.id} variant="secondary" className="text-xs hidden sm:inline-flex">
                          {c.name}
                        </Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {proofCount} {proofCount === 1 ? "důkaz" : proofCount < 5 ? "důkazy" : "důkazů"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={filteredStudents.length} onPageChange={setPage} />
      </div>
    </AppLayout>
  );
}
