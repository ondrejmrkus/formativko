import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function B01StudentProfiles() {
  const { user } = useAuth();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: classes = [] } = useClasses();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  // Get all class_students mappings and proof counts in bulk
  const { data: classStudentMap = [] } = useQuery({
    queryKey: ["all_class_students", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("student_id, class_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: proofCounts = [] } = useQuery({
    queryKey: ["all_proof_counts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proof_students")
        .select("student_id");
      if (error) throw error;
      return data;
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

  const filteredStudents = useMemo(() => {
    let result = [...students].sort((a, b) =>
      a.last_name.localeCompare(b.last_name, "cs")
    );

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

    return result;
  }, [students, search, filters, classes, classStudentMap]);

  const getStudentClassNames = (studentId: string) => {
    const cids = classStudentMap
      .filter((cs) => cs.student_id === studentId)
      .map((cs) => cs.class_id);
    return classes.filter((c) => cids.includes(c.id));
  };

  const getProofCount = (studentId: string) => {
    return proofCounts.filter((p) => p.student_id === studentId).length;
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Žáci" },
          ]}
        />

        <div className="flex items-center justify-between mb-4">
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
        />


        <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Jméno</span>
          <span className="w-20 text-center">Třída</span>
          <span className="w-20 text-center">Důkazy</span>
        </div>

        {studentsLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání…</div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {students.length === 0
              ? "Zatím nemáte žádné žáky."
              : "Žádní žáci neodpovídají vyhledávání."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredStudents.map((student) => {
              const studentClasses = getStudentClassNames(student.id);
              const proofCount = getProofCount(student.id);
              return (
                <Link
                  key={student.id}
                  to={`/student-profiles/${student.id}`}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 sm:gap-4 px-4 py-3 hover:bg-accent/50 transition-colors rounded-lg items-center"
                >
                  <span className="font-medium text-foreground">
                    {getStudentDisplayName(student)}
                  </span>
                  <div className="flex gap-1">
                    {studentClasses.map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-xs">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground w-20 text-center">
                    {proofCount}
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
