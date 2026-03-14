import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { StudentChip } from "@/components/shared/StudentChip";
import { LessonLinkField } from "@/components/shared/LessonLinkField";
import { DateField } from "@/components/shared/DateField";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Download, Maximize2 } from "lucide-react";
import { useParams } from "react-router-dom";
import {
  getStudentById,
  getStudentDisplayName,
  proofsOfLearning,
} from "@/data/mockData";

export default function B03bProofOfLearningDetailFile() {
  const { id, proofId } = useParams<{ id: string; proofId: string }>();
  const student = getStudentById(id || "s1")!;
  const proof = proofsOfLearning.find((p) => p.id === proofId) || proofsOfLearning[1];

  const linkedStudents = proof.studentIds
    .map((sid) => getStudentById(sid))
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
          {/* File preview */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Příloha</label>
            <div className="relative rounded-xl border border-border bg-muted overflow-hidden">
              <div className="aspect-video bg-[repeating-conic-gradient(hsl(var(--muted))_0%_25%,hsl(var(--card))_0%_50%)] bg-[length:20px_20px] flex items-center justify-center">
                <span className="text-muted-foreground text-sm">{proof.fileName || "soubor.jpg"}</span>
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                <button className="p-2 bg-card/80 backdrop-blur rounded-lg hover:bg-card">
                  <Download className="h-4 w-4 text-foreground" />
                </button>
                <button className="p-2 bg-card/80 backdrop-blur rounded-lg hover:bg-card">
                  <Maximize2 className="h-4 w-4 text-foreground" />
                </button>
              </div>
            </div>
          </div>

          <LessonLinkField lessonTitle="Skupinová práce — zlomky" />
          <DateField date={proof.date} />

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
            <Textarea className="min-h-[120px] bg-card" defaultValue={proof.note} />
          </div>

          <Button className="w-full" size="lg">
            Uložit
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
