import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { StudentChip } from "@/components/shared/StudentChip";
import { LessonLinkField } from "@/components/shared/LessonLinkField";
import { DateField } from "@/components/shared/DateField";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { useParams } from "react-router-dom";
import { useStudent, useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useProof } from "@/hooks/useProofs";

export default function B03aProofOfLearningDetailText() {
  const { id, proofId } = useParams<{ id: string; proofId: string }>();
  const { data: student, isLoading: studentLoading } = useStudent(id);
  const { data: proof, isLoading: proofLoading } = useProof(proofId);
  const { data: allStudents = [] } = useStudents();

  if (studentLoading || proofLoading || !student || !proof) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání…</div></AppLayout>;
  }

  const linkedStudents = proof.studentIds
    .map((sid) => allStudents.find((s) => s.id === sid))
    .filter(Boolean);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Žáci", href: "/student-profiles" },
            { label: getStudentDisplayName(student), href: `/student-profiles/${student.id}` },
            { label: proof.title },
          ]}
        />

        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold flex-1">{proof.title}</h1>
          <button className="p-2 hover:bg-accent rounded-lg">
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <LessonLinkField lessonId={proof.lesson_id || null} />
          <DateField date={new Date(proof.date)} />

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Žáci</label>
            <div className="flex flex-wrap gap-2">
              {linkedStudents.map((s) => (
                <StudentChip key={s!.id} name={getStudentDisplayName(s!)} removable />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Poznámka</label>
            <Textarea
              className="min-h-[120px] bg-card"
              defaultValue={proof.note || ""}
            />
          </div>

          <Button className="w-full" size="lg">
            Uložit
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
