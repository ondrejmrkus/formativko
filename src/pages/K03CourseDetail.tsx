import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Pencil, Trash2, Target, BookOpen, Users, FileDown, Camera, Plus,
  Sparkles, Loader2, Link2, AlertTriangle, RotateCcw,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCourse, useCourseLessons, useCourseGoals, useDeleteCourse, useLinkGoalToCourse, useLinkLessonToCourse } from "@/hooks/useCourses";
import { useCreateGoal, useGoalsForClass } from "@/hooks/useGoals";
import { useCreateLesson, useLessons } from "@/hooks/useLessons";
import { useClassStudents } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { useStudentGoalLevels, useSetStudentGoalLevel } from "@/hooks/useStudentGoalLevels";
import { useResolvedGoalLevels, useGoalProofCounts, useGoalCriteriaCounts } from "@/hooks/useCourseDetail";
import { StudentGoalMatrix } from "@/components/shared/StudentGoalMatrix";
import { LinkEntityDialog } from "@/components/shared/LinkEntityDialog";
import { AiSuggestionCards, AiShimmer } from "@/components/shared/AiSuggestionCards";
import type { SuggestedGoal, SuggestedLesson } from "@/types/ai";
import { LESSON_STATUS_LABELS as statusLabels, LESSON_STATUS_COLORS as statusColors } from "@/constants/lessonStatus";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function K03CourseDetail() {
  usePageTitle("Detail kurzu");
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: course, isLoading } = useCourse(courseId);
  const { data: lessons = [] } = useCourseLessons(courseId);
  const { data: goals = [] } = useCourseGoals(courseId);
  const { data: students = [] } = useClassStudents(course?.class_id || undefined);
  const deleteCourse = useDeleteCourse();
  const createGoal = useCreateGoal();
  const createLesson = useCreateLesson();
  const linkGoal = useLinkGoalToCourse();
  const linkLesson = useLinkLessonToCourse();

  // "Link existing" pickers
  const [linkGoalOpen, setLinkGoalOpen] = useState(false);
  const [linkLessonOpen, setLinkLessonOpen] = useState(false);
  const { data: classGoals = [] } = useGoalsForClass(course?.class_id);
  const { data: allLessons = [] } = useLessons();

  // AI generation state
  const [generatingGoals, setGeneratingGoals] = useState(false);
  const [generatingLessons, setGeneratingLessons] = useState(false);
  const [suggestedGoals, setSuggestedGoals] = useState<SuggestedGoal[]>([]);
  const [suggestedLessons, setSuggestedLessons] = useState<SuggestedLesson[]>([]);
  const [savingGoalIdx, setSavingGoalIdx] = useState<number | null>(null);
  const [savingLessonIdx, setSavingLessonIdx] = useState<number | null>(null);
  const [goalCount, setGoalCount] = useState("");
  const [lessonCount, setLessonCount] = useState("");
  const [goalGenError, setGoalGenError] = useState<string | null>(null);
  const [lessonGenError, setLessonGenError] = useState<string | null>(null);

  // Student-goal levels (extracted hooks)
  const goalIds = useMemo(() => goals.map((g: any) => g.id), [goals]);
  const { data: studentGoalLevels = {} } = useStudentGoalLevels(goalIds);
  const setLevel = useSetStudentGoalLevel();
  const resolvedGoalLevels = useResolvedGoalLevels(goalIds);
  const { data: goalProofCounts = {} } = useGoalProofCounts(goalIds);
  const { data: criteriaCounts = {} } = useGoalCriteriaCounts(goalIds);

  const handleLevelClick = (studentId: string, goalId: string) => {
    const levels = resolvedGoalLevels[goalId] || [];
    if (levels.length === 0) return;
    const currentLevel = studentGoalLevels[studentId]?.[goalId] || null;
    const currentIdx = currentLevel ? levels.indexOf(currentLevel) : -1;
    const nextIdx = currentIdx + 1;
    const nextLevel = nextIdx >= levels.length ? null : levels[nextIdx];
    setLevel.mutate({ studentId, goalId, level: nextLevel });
  };

  // Available goals/lessons for linking (same class, not already in this course)
  const courseGoalIds = useMemo(() => new Set(goals.map((g: any) => g.id)), [goals]);
  const courseLessonIds = useMemo(() => new Set(lessons.map((l: any) => l.id)), [lessons]);
  const availableGoals = useMemo(
    () => classGoals.filter((g) => !courseGoalIds.has(g.id)),
    [classGoals, courseGoalIds]
  );
  const availableLessons = useMemo(
    () => allLessons.filter((l: any) => l.class_id === course?.class_id && !courseLessonIds.has(l.id)),
    [allLessons, course?.class_id, courseLessonIds]
  );

  const handleLinkGoal = async (goalId: string) => {
    if (!courseId) return;
    try {
      await linkGoal.mutateAsync({ goalId, courseId });
      toast({ title: "Cíl přidán do kurzu" });
    } catch (err) {
      console.error("Chyba při přidávání cíle", err);
      toast({ title: "Chyba při přidávání", variant: "destructive" });
    }
  };

  const handleLinkLesson = async (lessonId: string) => {
    if (!courseId) return;
    try {
      await linkLesson.mutateAsync({ lessonId, courseId });
      toast({ title: "Lekce přidána do kurzu" });
    } catch (err) {
      console.error("Chyba při přidávání lekce", err);
      toast({ title: "Chyba při přidávání", variant: "destructive" });
    }
  };

  // Group lessons by status
  const lessonsByStatus = useMemo(() => {
    const groups: Record<string, any[]> = { ongoing: [], prepared: [], past: [] };
    for (const l of lessons) {
      const key = l.status || "prepared";
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    }
    return groups;
  }, [lessons]);

  const handleDelete = async () => {
    if (!courseId) return;
    try {
      await deleteCourse.mutateAsync(courseId);
      toast({ title: "Kurz smazán" });
      navigate("/courses");
    } catch (err) {
      console.error("Chyba při mazání", err);
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  // AI: Generate goals from thematic plan
  const handleGenerateGoals = async () => {
    if (!course?.thematic_plan_file_url) return;
    setGeneratingGoals(true);
    setSuggestedGoals([]);
    setGoalGenError(null);
    try {
      const parsedGoalCount = parseInt(goalCount, 10);
      const { data, error } = await supabase.functions.invoke("generate-goals-from-plan", {
        body: {
          fileUrl: course.thematic_plan_file_url,
          subject: course.subjects?.name || undefined,
          className: course.classes?.name || undefined,
          count: parsedGoalCount > 0 ? parsedGoalCount : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.goals?.length > 0) {
        setSuggestedGoals(data.goals);
      } else {
        toast({ title: "AI nenavrhla žádné cíle", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Generate goals from plan error:", err);
      setGoalGenError(err?.message || "Neznámá chyba");
      toast({ title: "Chyba při generování cílů", description: err?.message, variant: "destructive" });
    } finally {
      setGeneratingGoals(false);
    }
  };

  // AI: Generate lessons from thematic plan
  const handleGenerateLessons = async () => {
    if (!course?.thematic_plan_file_url) return;
    setGeneratingLessons(true);
    setSuggestedLessons([]);
    setLessonGenError(null);
    try {
      const parsedLessonCount = parseInt(lessonCount, 10);
      const { data, error } = await supabase.functions.invoke("generate-lessons-from-plan", {
        body: {
          fileUrl: course.thematic_plan_file_url,
          subject: course.subjects?.name || undefined,
          className: course.classes?.name || undefined,
          count: parsedLessonCount > 0 ? parsedLessonCount : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.lessons?.length > 0) {
        setSuggestedLessons(data.lessons);
      } else {
        toast({ title: "AI nenavrhla žádné lekce", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Generate lessons from plan error:", err);
      setLessonGenError(err?.message || "Neznámá chyba");
      toast({ title: "Chyba při generování lekcí", description: err?.message, variant: "destructive" });
    } finally {
      setGeneratingLessons(false);
    }
  };

  // Accept a single suggested goal
  const handleAcceptGoal = async (index: number) => {
    if (!course) return;
    const goal = suggestedGoals[index];
    setSavingGoalIdx(index);
    try {
      const validCriteria = (goal.criteria || []).map((c, i) => ({
        description: c.description || "",
        level_descriptors: (c.level_descriptors || []).map((ld) => ({
          level: ld.level || "",
          description: ld.description || "",
        })),
        sort_order: i,
      }));
      await createGoal.mutateAsync({
        classId: course.class_id,
        title: goal.title,
        description: goal.description || "",
        subjectId: course.subject_id,
        criteria: validCriteria,
        courseId: course.id,
      });
      setSuggestedGoals((prev) => prev.filter((_, i) => i !== index));
      toast({ title: "Cíl přijat" });
    } catch (err) {
      console.error("Chyba při ukládání cíle", err);
      toast({ title: "Chyba při ukládání cíle", variant: "destructive" });
    } finally {
      setSavingGoalIdx(null);
    }
  };

  const handleRejectGoal = (index: number) => {
    setSuggestedGoals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAcceptAllGoals = async () => {
    if (!course) return;
    for (let i = suggestedGoals.length - 1; i >= 0; i--) {
      await handleAcceptGoal(0);
    }
  };

  // Accept a single suggested lesson
  const handleAcceptLesson = async (index: number) => {
    if (!course) return;
    const lesson = suggestedLessons[index];
    setSavingLessonIdx(index);
    try {
      await createLesson.mutateAsync({
        classId: course.class_id,
        title: lesson.title,
        subjectId: course.subject_id,
        status: "prepared",
        date: null,
        plannedActivities: lesson.planned_activities || "",
        observationFocus: lesson.observation_focus || "",
        goalIds: [],
        courseId: course.id,
      });
      setSuggestedLessons((prev) => prev.filter((_, i) => i !== index));
      toast({ title: "Lekce přijata" });
    } catch (err) {
      console.error("Chyba při ukládání lekce", err);
      toast({ title: "Chyba při ukládání lekce", variant: "destructive" });
    } finally {
      setSavingLessonIdx(null);
    }
  };

  const handleRejectLesson = (index: number) => {
    setSuggestedLessons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAcceptAllLessons = async () => {
    if (!course) return;
    for (let i = suggestedLessons.length - 1; i >= 0; i--) {
      await handleAcceptLesson(0);
    }
  };

  if (isLoading || !course) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Kurzy", href: "/courses" },
            { label: course.name },
          ]}
        />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <h1 className="text-2xl font-bold">{course.name}</h1>
          {course.classes?.name && <Badge variant="outline">{course.classes.name}</Badge>}
          {course.subjects?.name && <Badge variant="secondary">{course.subjects.name}</Badge>}
          <div className="ml-auto flex gap-1">
            <Button variant="default" size="sm" className="gap-1.5" asChild>
              <Link to={`/capture/${course.id}`}>
                <Camera className="h-4 w-4" />
                Přidat důkazy
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/courses/${course.id}/edit`}>
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
                  <AlertDialogTitle>Smazat kurz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tím smažete kurz &bdquo;{course.name}&ldquo;. Lekce a cíle zůstanou zachovány.
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

        {/* Thematic plan */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Tematický plán</h2>
          {course.thematic_plan_file_url ? (
            <a
              href={course.thematic_plan_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all text-sm"
            >
              <FileDown className="h-4 w-4 text-muted-foreground" />
              <span>{course.thematic_plan_file_name || "Stáhnout"}</span>
            </a>
          ) : (
            <div className="text-sm text-muted-foreground p-4 rounded-xl border border-dashed border-border bg-muted/50">
              Žádný tematický plán nebyl nahrán.{" "}
              <Link to={`/courses/${course.id}/edit`} className="text-primary hover:underline">
                Nahrát
              </Link>
            </div>
          )}
        </div>

        {/* Students */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Žáci ({students.length})
          </h2>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground">Třída nemá žádné žáky.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {students.map((student: any) => (
                <Link
                  key={student.id}
                  to={`/student-profiles/${student.id}`}
                  className="px-3 py-1.5 rounded-full text-sm bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  {getStudentDisplayName(student)}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Student-Goal Matrix */}
        <StudentGoalMatrix
          students={students}
          goals={goals}
          resolvedGoalLevels={resolvedGoalLevels}
          studentGoalLevels={studentGoalLevels}
          onLevelClick={handleLevelClick}
        />

        {/* Goals */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Vzdělávací cíle ({goals.length})
            </h2>
            <div className="flex items-center gap-2">
              {course.thematic_plan_file_url && suggestedGoals.length === 0 && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Počet"
                    value={goalCount}
                    onChange={(e) => setGoalCount(e.target.value)}
                    className="w-16 h-8 text-xs text-center rounded-md border border-border bg-card px-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={handleGenerateGoals}
                    disabled={generatingGoals}
                  >
                    {generatingGoals ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generatingGoals ? "Generuji..." : "Generovat z plánu"}
                  </Button>
                </div>
              )}
              {availableGoals.length > 0 && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setLinkGoalOpen(true)}>
                  <Link2 className="h-3.5 w-3.5" />
                  Připojit existující
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link to={`/goals/create?courseId=${course.id}`}>
                  <Plus className="h-3.5 w-3.5" />
                  Nový cíl
                </Link>
              </Button>
            </div>
          </div>

          <LinkEntityDialog
            open={linkGoalOpen}
            onOpenChange={setLinkGoalOpen}
            title="Připojit existující cíl"
            emptyMessage="Žádné dostupné cíle"
            items={availableGoals}
            onSelect={handleLinkGoal}
          />

          {generatingGoals && <AiShimmer count={parseInt(goalCount, 10) || 3} />}

          {goalGenError && !generatingGoals && suggestedGoals.length === 0 && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-destructive font-medium">Generování selhalo</p>
                <p className="text-xs text-destructive/70 truncate">{goalGenError}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={handleGenerateGoals}>
                <RotateCcw className="h-3.5 w-3.5" />
                Zkusit znovu
              </Button>
            </div>
          )}

          <AiSuggestionCards
            items={suggestedGoals}
            label="Navrhované cíle"
            savingIdx={savingGoalIdx}
            onAccept={handleAcceptGoal}
            onReject={handleRejectGoal}
            onAcceptAll={handleAcceptAllGoals}
            onRejectAll={() => setSuggestedGoals([])}
            renderItem={(goal) => (
              <>
                <span className="font-medium text-foreground">{goal.title}</span>
                {goal.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{goal.description}</p>
                )}
                {goal.criteria?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {goal.criteria.map((c, ci) => (
                      <div key={ci} className="text-xs text-muted-foreground">
                        <span className="font-medium">Kritérium:</span> {c.description}
                        {c.level_descriptors?.length > 0 && (
                          <span className="ml-2 text-muted-foreground/70">
                            ({c.level_descriptors.map((ld) => ld.level).join(", ")})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          />

          {goals.length === 0 && suggestedGoals.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
              Zatím žádné cíle v tomto kurzu.
            </div>
          ) : goals.length > 0 && (
            <div className="space-y-2">
              {goals.map((goal: any) => (
                <Link
                  key={goal.id}
                  to={`/goals/${goal.id}`}
                  className="block p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{goal.title}</span>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{goal.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      <span>{criteriaCounts[goal.id] || 0} kritérií</span>
                      <span>{goalProofCounts[goal.id] || 0} důkazů</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Lessons */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              Lekce ({lessons.length})
            </h2>
            <div className="flex items-center gap-2">
              {course.thematic_plan_file_url && suggestedLessons.length === 0 && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="Počet"
                    value={lessonCount}
                    onChange={(e) => setLessonCount(e.target.value)}
                    className="w-16 h-8 text-xs text-center rounded-md border border-border bg-card px-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={handleGenerateLessons}
                    disabled={generatingLessons}
                  >
                    {generatingLessons ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {generatingLessons ? "Generuji..." : "Generovat z plánu"}
                  </Button>
                </div>
              )}
              {availableLessons.length > 0 && (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setLinkLessonOpen(true)}>
                  <Link2 className="h-3.5 w-3.5" />
                  Připojit existující
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link to={`/lessons/create?courseId=${course.id}`}>
                  <Plus className="h-3.5 w-3.5" />
                  Nová lekce
                </Link>
              </Button>
            </div>
          </div>

          <LinkEntityDialog
            open={linkLessonOpen}
            onOpenChange={setLinkLessonOpen}
            title="Připojit existující lekci"
            emptyMessage="Žádné dostupné lekce"
            items={availableLessons}
            onSelect={handleLinkLesson}
            renderItem={(lesson) => (
              <>
                <span className="text-sm font-medium text-foreground">{lesson.title}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {lesson.subjects?.name && (
                    <Badge variant="outline" className="text-[10px]">{lesson.subjects.name}</Badge>
                  )}
                  {lesson.date && (
                    <span className="text-xs text-muted-foreground">{lesson.date}</span>
                  )}
                  <Badge className={`text-[10px] ${statusColors[lesson.status] || ""}`}>
                    {statusLabels[lesson.status] || lesson.status}
                  </Badge>
                </div>
              </>
            )}
          />

          {generatingLessons && <AiShimmer count={parseInt(lessonCount, 10) || 3} />}

          {lessonGenError && !generatingLessons && suggestedLessons.length === 0 && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-destructive font-medium">Generování selhalo</p>
                <p className="text-xs text-destructive/70 truncate">{lessonGenError}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={handleGenerateLessons}>
                <RotateCcw className="h-3.5 w-3.5" />
                Zkusit znovu
              </Button>
            </div>
          )}

          <AiSuggestionCards
            items={suggestedLessons}
            label="Navrhované lekce"
            savingIdx={savingLessonIdx}
            onAccept={handleAcceptLesson}
            onReject={handleRejectLesson}
            onAcceptAll={handleAcceptAllLessons}
            onRejectAll={() => setSuggestedLessons([])}
            renderItem={(lesson) => (
              <>
                <span className="font-medium text-foreground">{lesson.title}</span>
                {lesson.planned_activities && (
                  <p className="text-sm text-muted-foreground mt-0.5">{lesson.planned_activities}</p>
                )}
                {lesson.observation_focus && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    Zaměření pozorování: {lesson.observation_focus}
                  </p>
                )}
              </>
            )}
          />

          {lessons.length === 0 && suggestedLessons.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
              Zatím žádné lekce v tomto kurzu.
            </div>
          ) : lessons.length > 0 && (
            <div className="space-y-4">
              {(["ongoing", "prepared", "past"] as const).map((statusKey) => {
                const items = lessonsByStatus[statusKey] || [];
                if (items.length === 0) return null;
                return (
                  <div key={statusKey}>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {statusLabels[statusKey]} ({items.length})
                    </h3>
                    <div className="space-y-1">
                      {items.map((lesson: any) => (
                        <Link
                          key={lesson.id}
                          to={`/lessons/${lesson.id}`}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-foreground">{lesson.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {lesson.date && (
                              <span className="text-xs text-muted-foreground">{lesson.date}</span>
                            )}
                            <Badge className={`text-xs ${statusColors[lesson.status] || ""}`}>
                              {statusLabels[lesson.status] || lesson.status}
                            </Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
