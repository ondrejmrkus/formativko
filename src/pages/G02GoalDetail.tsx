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
import { useGoal, useDeleteGoal, useGoalLinkedProofs } from "@/hooks/useGoals";
import { useClasses, useClassStudents } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { useStudentGoalLevels, useSetStudentGoalLevel } from "@/hooks/useStudentGoalLevels";
import { DEFAULT_LEVEL_DESCRIPTORS, getLevelColor } from "@/constants/goalLevels";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function G02GoalDetail() {
  usePageTitle("Detail cíle");
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: goal, isLoading } = useGoal(goalId);
  const { data: classes = [] } = useClasses();
  const { data: classStudents = [] } = useClassStudents(goal?.class_id);
  const deleteGoal = useDeleteGoal();

  const cls = classes.find((c) => c.id === goal?.class_id);

  const { data: linkedProofs = [] } = useGoalLinkedProofs(goalId);

  // Student goal levels
  const goalIdArr = useMemo(() => (goalId ? [goalId] : []), [goalId]);
  const { data: studentGoalLevels = {} } = useStudentGoalLevels(goalIdArr);
  const setLevel = useSetStudentGoalLevel();

  // Resolve available levels from first criterion, or defaults
  const availableLevels = useMemo(() => {
    if (goal?.evaluation_criteria?.length > 0) {
      const descriptors = goal.evaluation_criteria[0].level_descriptors;
      if (descriptors?.length > 0) {
        return descriptors;
      }
    }
    return DEFAULT_LEVEL_DESCRIPTORS;
  }, [goal]);

  const availableLevelNames = useMemo(
    () => availableLevels.map((ld) => ld.level),
    [availableLevels]
  );

  const handleLevelClick = (studentId: string) => {
    if (!goalId || availableLevelNames.length === 0) return;
    const currentLevel = studentGoalLevels[studentId]?.[goalId] || null;
    const currentIdx = currentLevel
      ? availableLevelNames.indexOf(currentLevel)
      : -1;
    const nextIdx = currentIdx + 1;
    const nextLevel =
      nextIdx >= availableLevelNames.length ? null : availableLevelNames[nextIdx];
    setLevel.mutate({ studentId, goalId, level: nextLevel });
  };

  const handleDelete = async () => {
    if (!goalId) return;
    try {
      await deleteGoal.mutateAsync(goalId);
      toast({ title: "Cíl smazán" });
      navigate("/goals");
    } catch (err) {
      console.error("Chyba při mazání", err);
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  if (isLoading || !goal) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">
          Načítání…
        </div>
      </AppLayout>
    );
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
          {goal.subjects?.name && (
            <Badge variant="secondary">{goal.subjects.name}</Badge>
          )}
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
                    Tím smažete cíl &bdquo;{goal.title}&ldquo; a všechna jeho
                    kritéria. Tuto akci nelze vrátit zpět.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
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

        {/* Levels — shown once for the whole goal */}
        {availableLevels.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Úrovně hodnocení</h2>
            <div className="space-y-1.5">
              {availableLevels.map((ld, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 mt-0.5 ${getLevelColor(ld.level, availableLevelNames)}`}
                  >
                    {ld.level}
                  </Badge>
                  <span className="text-muted-foreground">
                    {ld.description || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Criteria — simple numbered list */}
        {goal.evaluation_criteria.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Kritéria hodnocení</h2>
            <div className="space-y-2">
              {goal.evaluation_criteria.map((criterion, idx) => (
                <div
                  key={criterion.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border"
                >
                  <span className="text-xs text-muted-foreground mt-0.5 w-5 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <p className="text-sm text-foreground">
                    {criterion.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student levels for this goal */}
        {classStudents.length > 0 && goalId && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Úroveň žáků</h2>
            <div className="flex flex-wrap gap-2">
              {[...classStudents]
                .sort((a: any, b: any) =>
                  a.last_name.localeCompare(b.last_name)
                )
                .map((student: any) => {
                  const level =
                    studentGoalLevels[student.id]?.[goalId] || null;
                  return (
                    <button
                      key={student.id}
                      onClick={() => handleLevelClick(student.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors cursor-pointer hover:scale-[1.03] ${
                        level
                          ? getLevelColor(level, availableLevelNames)
                          : "border-border bg-card text-muted-foreground hover:bg-accent"
                      }`}
                      title={
                        level
                          ? `${getStudentDisplayName(student)}: ${level} — klikněte pro změnu`
                          : `${getStudentDisplayName(student)}: nenastaveno — klikněte pro nastavení`
                      }
                    >
                      {level ? (
                        <span className="font-semibold text-xs w-4 text-center">
                          {level.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                      {getStudentDisplayName(student)}
                    </button>
                  );
                })}
            </div>
            {availableLevelNames.length > 0 && (
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
                <span className="text-muted-foreground/60">
                  Kliknutím měníte úroveň:
                </span>
                {availableLevelNames.map((lvl) => (
                  <span key={lvl} className="flex items-center gap-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-sm border ${getLevelColor(lvl, availableLevelNames)}`}
                    />
                    {lvl}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Linked proofs */}
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Propojené důkazy ({linkedProofs.length})
          </h2>
          {linkedProofs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
              Zatím žádné důkazy propojené s tímto cílem.
            </div>
          ) : (
            <div className="space-y-2">
              {linkedProofs.map((proof: any) => (
                <div
                  key={proof.id}
                  className="p-4 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">
                        {proof.title}
                      </h3>
                      {proof.note && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {proof.note}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {proof.date}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {proof.type}
                        </Badge>
                        {proof.students.map((s: any) => (
                          <Badge
                            key={s.id}
                            variant="secondary"
                            className="text-xs"
                          >
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
