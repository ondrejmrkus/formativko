import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { students, classes, getClassesForStudent, getProofsForStudent, getStudentDisplayName } from "@/data/mockData";

const sortedStudents = [...students].sort((a, b) =>
  a.lastName.localeCompare(b.lastName, "cs")
);

export default function B01StudentProfiles() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Žáci" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-4">Profily žáků</h1>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SearchBar placeholder="Hledat žáka..." />
        </div>

        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
          ]}
        />

        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Jméno</span>
          <span className="w-20 text-center">Třída</span>
          <span className="w-20 text-center">Důkazy</span>
        </div>

        <div className="divide-y divide-border">
          {sortedStudents.map((student) => {
            const studentClasses = getClassesForStudent(student.id);
            const proofCount = getProofsForStudent(student.id).length;
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
      </div>
    </AppLayout>
  );
}
