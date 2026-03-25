import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Check, Minus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGoal, useDeleteGoal } from "@/hooks/useGoals";
import { useClasses, useClassStudents } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStudentDisplayName } from "@/hooks/useStudents";

export default function G02GoalDetail() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: goal, isLoading } = useGoal(goalId);
  const { data: classes = [] } = useClasses();
  const { data: classStudents = [] } = useClassStudents(goal?.class_id);
  const deleteGoal = useDeleteGoal();

  const cls = classes.find((c) => c.id === goal?.class_id);

  // Fetch linked proofs with student info
  const { data: linkedProofs = [] } = useQuery({
    queryKey: ["goals", "linked_proofs", goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proof_goals")
        .select("proof_id, proofs_of_learning(id, title, type, date, note)")
        .eq("goal_id", goalId!);
      if (error) throw error;

      // For each proof, fetch student links
      const proofs = data.map((r: any) => r.proofs_of_learning).filter(Boolean);
      const proofIds = proofs.map((p: any) => p.id);
      if (proofIds.length === 0) return [];

      const { data: ps } = await supabase
        .from("proof_students")
        .select("proof_id, student_id, students(id, first_name, last_name)")
        .in("proof_id", proofIds);

      const studentMap: Record<string, any[]> = {};
      for (const link of ps || []) {
        if (!studentMap[link.proof_id]) studentMap[link.proof_id] = [];
        if (link.students) studentMap[link.proof_id].push(link.students);
      }

      return proofs.map((p: any) => ({
        ...p,
        students: studentMap[p.id] || [],
      }));
    },
    enabled: !!user && !!goalId,
  });

  // Goal coverage per student
  const studentCoverage = useMemo(() => {
    const proofStudentIds = new Set<string>();
    for (const proof of linkedProofs) {
      for (const s of proof.students) {
        proofStudentIds.add(s.id);
      }
    }
    return classStudents.map((s: any) => ({
      student: s,
      hasEvidence: proofStudentIds.has(s.id),
    }));
  }, [classStudents, linkedProofs]);

  const handleDelete = async () => {
    if (!goalId) return;
    try {
      await deleteGoal.mutateAsync(goalId);
      toast({ title: "Cíl smazán" });
      navigate("/goals");
    } catch {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  if (isLoading || !goal) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání...</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Cíle", href: "/goals" },
            { label: goal.title },
          ]}
        />

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h1 className="text-2xl font-bold">{goal.title}</h1>
          {goal.subjects?.name && <Badge variant="secondary">{goal.subjects.name}</Badge>}
          {cls && <Badge variant="outline">{cls.name}</Badge>}
          <div className="ml-auto flex gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/goals/${goal.id}/edit`}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Smazat vzdělávací cíl?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tím smažete cíl &bdquo;{goal.title}&ldquo; a všechna jeho kritéria. Tuto akci nelze vrátit zpět.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Smazat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {goal.description && (
          <p className="text-muted-foreground mb-6">{goal.description}</p>
        )}

        {/* Criteria */}
        {goal.evaluation_criteria.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Kritéria hodnocení</h2>
            <div className="space-y-3">
              {goal.evaluation_criteria.map((criterion) => (
                <div key={criterion.id} className="p-4 rounded-xl bg-card border border-border">
                  <p className="font-medium text-foreground mb-2">{criterion.description}</p>
                  {criterion.level_descriptors.length > 0 && (
                    <div className="space-y-1.5">
                      {criterion.level_descriptors.map((ld, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{ld.level}</Badge>
                          <span className="text-muted-foreground">{ld.description || "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goal coverage per student */}
        {studentCoverage.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Pokrytí cíle</h2>
            <div className="flex flex-wrap gap-2">
              {studentCoverage.map(({ student, hasEvidence }) => (
                <Link
                  key={student.id}
                  to={`/student-profiles/${student.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm hover:bg-accent transition-colors"
                >
                  {hasEvidence ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {getStudentDisplayName(student)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Linked proofs */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Propojené důkazy ({linkedProofs.length})</h2>
          {linkedProofs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
              Zatím žádné důkazy propojené s tímto cílem.
            </div>
          ) : (
            <div className="space-y-2">
              {linkedProofs.map((proof: any) => (
                <div key={proof.id} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{proof.title}</h3>
                      {proof.note && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{proof.note}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{proof.date}</span>
                        <Badge variant="outline" className="text-xs capitalize">{proof.type}</Badge>
                        {proof.students.map((s: any) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {getStudentDisplayName(s)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
