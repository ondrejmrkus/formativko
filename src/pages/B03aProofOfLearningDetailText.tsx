import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { StudentChip } from "@/components/shared/StudentChip";
import { Pencil } from "lucide-react";
import { LessonLinkField } from "@/components/shared/LessonLinkField";
import { DateField } from "@/components/shared/DateField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useStudent, useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useProof, useUpdateProof, useDeleteProof } from "@/hooks/useProofs";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function B03aProofOfLearningDetailText() {
  const { id, proofId } = useParams<{ id: string; proofId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: student, isLoading: studentLoading } = useStudent(id);
  const { data: proof, isLoading: proofLoading } = useProof(proofId);
  const { data: allStudents = [] } = useStudents();
  const updateProof = useUpdateProof();
  const deleteProof = useDeleteProof();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && proof) {
      setTitle(proof.title);
      setNote(proof.note || "");
      setInitialized(true);
    }
  }, [proof, initialized]);

  if (studentLoading || proofLoading || !student || !proof) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání…</div></AppLayout>;
  }

  const linkedStudents = proof.studentIds
    .map((sid) => allStudents.find((s) => s.id === sid))
    .filter(Boolean);

  const handleSave = async () => {
    if (!proofId) return;
    try {
      await updateProof.mutateAsync({ id: proofId, title, note, date: proof.date, lessonId: proof.lesson_id });
      toast({ title: "Důkaz uložen" });
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!proofId) return;
    try {
      await deleteProof.mutateAsync(proofId);
      toast({ title: "Důkaz smazán" });
      navigate(`/student-profiles/${id}`);
    } catch {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

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
          {editingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              className="text-2xl font-bold bg-card border border-border rounded-lg px-3 py-1 h-auto flex-1"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="flex items-center gap-2 text-2xl font-bold text-foreground hover:text-primary transition-colors text-left flex-1 group"
            >
              <span>{title || proof.title}</span>
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="p-2 hover:bg-destructive/10 rounded-lg">
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Smazat důkaz o učení?</AlertDialogTitle>
                <AlertDialogDescription>Tuto akci nelze vrátit zpět.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Smazat</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="space-y-4">
          <LessonLinkField lessonId={proof.lesson_id || null} />
          <DateField date={new Date(proof.date)} />

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Žáci</label>
            <div className="flex flex-wrap gap-2">
              {linkedStudents.map((s) => (
                <StudentChip key={s!.id} name={getStudentDisplayName(s!)} removable />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Poznámka</label>
            <Textarea
              className="min-h-[120px] bg-card"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button className="w-full" size="lg" onClick={handleSave} disabled={updateProof.isPending}>
            {updateProof.isPending ? "Ukládání…" : "Uložit"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
