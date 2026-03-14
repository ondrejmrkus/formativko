import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { ClassFilterBar } from "@/components/shared/ClassFilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  getStudentById,
  getClassesForStudent,
  getProofsForStudent,
  getStudentDisplayName,
  getStudentById as getStudent,
  students,
} from "@/data/mockData";

export default function B02StudentProfileDetail() {
  const { id } = useParams<{ id: string }>();
  const student = getStudentById(id || "s1")!;
  const studentClasses = getClassesForStudent(student.id);
  const proofs = getProofsForStudent(student.id);

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

        <ClassFilterBar
          groups={[
            { label: "Typ důkazu", options: ["Text", "Hlas", "Foto", "Soubor"] },
            { label: "Předmět", options: ["Matematika", "Český jazyk"] },
          ]}
        />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Důkazy o učení</h2>
          <Button asChild size="sm" className="gap-1">
            <Link to={`/student-profiles/${student.id}/add-proof`}>
              <Plus className="h-4 w-4" />
              Přidat důkaz
            </Link>
          </Button>
        </div>

        {proofs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Zatím žádné důkazy o učení.
          </div>
        ) : (
          <div className="space-y-3">
            {proofs.map((proof) => (
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
                      {proof.studentIds.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          +{proof.studentIds.length - 1} žáků
                        </span>
                      )}
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
