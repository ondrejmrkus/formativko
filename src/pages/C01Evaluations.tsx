import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { SearchBar } from "@/components/shared/SearchBar";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  students,
  classes,
  evaluations,
  getClassesForStudent,
  getStudentDisplayName,
} from "@/data/mockData";

const sortedStudents = [...students].sort((a, b) =>
  a.lastName.localeCompare(b.lastName, "cs")
);

function getEvalStatus(studentId: string) {
  const ev = evaluations.find((e) => e.studentId === studentId);
  if (!ev || ev.status === "none") return null;
  return ev.status;
}

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

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Hodnocení</h1>
          <Button asChild className="gap-1">
            <Link to="/evaluations/create">
              <Plus className="h-4 w-4" />
              Vytvořit hodnocení
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <SearchBar placeholder="Hledat žáka..." />
        </div>

        <ClassFilterBar
          groups={[
            { label: "Třída", options: classes.map((c) => c.name) },
          ]}
        />

        <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
          <span>Jméno</span>
          <span className="w-20 text-center">Třída</span>
          <span className="w-24 text-center">Stav</span>
        </div>

        <div className="divide-y divide-border">
          {sortedStudents.slice(0, 20).map((student) => {
            const studentClasses = getClassesForStudent(student.id);
            const status = getEvalStatus(student.id);
            return (
              <div
                key={student.id}
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
                <div className="w-24 text-center">
                  {status === "draft" && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      Koncept
                    </Badge>
                  )}
                  {status === "final" && (
                    <Badge variant="secondary" className="text-xs">
                      Hotovo
                    </Badge>
                  )}
                  {!status && (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
