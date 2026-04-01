import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Check, Minus, Eye, ClipboardList, Target, FileText, Camera } from "lucide-react";
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
import { useLesson, useLessonGoals, useDeleteLesson, useLessonStudentOverview, useLessonProofs, useLessonGoalProofCounts } from "@/hooks/useLessons";
import { useClasses } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { LESSON_STATUS_LABELS as statusLabels, LESSON_STATUS_COLORS as statusColors } from "@/constants/lessonStatus";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function D03LessonDetail() {
  usePageTitle("Detail lekce");
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const { data: classes = [] } = useClasses();
  const { data: lessonGoals = [] } = useLessonGoals(lessonId);
  const deleteLesson = useDeleteLesson();

  const cls = classes.find((c) => c.id === lesson?.class_id);
  const goalIds = useMemo(() => lessonGoals.map((g) => g.id), [lessonGoals]);

  const { data: studentOverview = [] } = useLessonStudentOverview(lesson?.class_id || undefined, goalIds);

  const { data: linkedProofs = [] } = useLessonProofs(lessonId);
  const { data: goalProofCounts = {} } = useLessonGoalProofCounts(goalIds);

  const handleDelete = async () => {
    if (!lessonId) return;
    try {
      await deleteLesson.mutateAsync(lessonId);
      toast({ title: "Lekce smazána" });
      navigate("/lessons");
    } catch (err) {
      console.error("Chyba při mazání", err);
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  if (isLoading || !lesson) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání…</div></AppLayout>;
  }

  // Students with zero evidence across all linked goals
  const studentsWithNoEvidence = studentOverview.filter(
    (so) => Object.values(so.goalCounts).every((c) => c === 0) || Object.keys(so.goalCounts).length === 0
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Lekce", href: "/lessons" },
            { label: lesson.title },
          ]}
        />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          {lesson.subjects?.name && <Badge variant="secondary">{lesson.subjects.name}</Badge>}
          {cls && <Badge variant="outline">{cls.name}</Badge>}
          {lesson.date && <Badge variant="outline">{lesson.date}</Badge>}
          <Badge className={statusColors[lesson.status] || ""}>{statusLabels[lesson.status] || lesson.status}</Badge>
          <div className="ml-auto flex gap-1">
            {lesson.course_id && (
              <Button variant="default" size="sm" className="gap-1.5" asChild>
                <Link to={`/capture/${lesson.course_id}?lesson=${lesson.id}`}>
                  <Camera className="h-4 w-4" />
                  Přidat důkazy
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/lessons/${lesson.id}/edit`}>
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
                  <AlertDialogTitle>Smazat lekci?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tím smažete lekci &bdquo;{lesson.title}&ldquo;. Důkazy o učení zůstanou zachovány.
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

        {/* Plan details */}
        {(lesson.planned_activities || lesson.observation_focus) && (
          <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border space-y-3">
            {lesson.planned_activities && (
              <div className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Plánované aktivity</span>
                  <p className="text-sm whitespace-pre-wrap">{lesson.planned_activities}</p>
                </div>
              </div>
            )}
            {lesson.observation_focus && (
              <div className="flex items-start gap-2">
                <Eye className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Na co se zaměřit</span>
                  <p className="text-sm whitespace-pre-wrap">{lesson.observation_focus}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Linked goals */}
        {lessonGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Vzdělávací cíle ({lessonGoals.length})
            </h2>
            <div className="space-y-2">
              {lessonGoals.map((goal) => (
                <Link
                  key={goal.id}
                  to={`/goals/${goal.id}`}
                  className="block p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-medium text-foreground">{goal.title}</span>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{goal.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {goalProofCounts[goal.id] || 0} důkazů
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pre-lesson student overview */}
        {studentOverview.length > 0 && goalIds.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Přehled žáků</h2>
            {studentsWithNoEvidence.length > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Bez důkazů ({studentsWithNoEvidence.length}):
                </span>{" "}
                <span className="text-amber-700 dark:text-amber-300">
                  {studentsWithNoEvidence.map((so) => getStudentDisplayName(so.student)).join(", ")}
                </span>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Žák</th>
                    {lessonGoals.map((g) => (
                      <th key={g.id} className="text-center py-2 px-2 text-xs font-medium text-muted-foreground max-w-[120px] truncate" title={g.title}>
                        {g.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentOverview.map((so) => (
                    <tr key={so.student.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <Link to={`/student-profiles/${so.student.id}`} className="hover:underline text-foreground">
                          {getStudentDisplayName(so.student)}
                        </Link>
                      </td>
                      {goalIds.map((gid) => {
                        const count = so.goalCounts[gid] || 0;
                        return (
                          <td key={gid} className="text-center py-2 px-2">
                            {count > 0 ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Linked proofs */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Důkazy z lekce ({linkedProofs.length})
          </h2>
          {linkedProofs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
              Zatím žádné důkazy propojené s touto lekcí.
            </div>
          ) : (
            <div className="space-y-2">
              {linkedProofs.map((proof) => (
                <div key={proof.id} className="p-4 rounded-xl bg-card border border-border">
                  <h3 className="font-medium text-foreground">{proof.title}</h3>
                  {proof.note && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{proof.note}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">{proof.date}</span>
                    <Badge variant="outline" className="text-xs capitalize">{proof.type}</Badge>
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
