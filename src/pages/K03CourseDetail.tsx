import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Pencil, Trash2, Target, BookOpen, Users, FileDown, Camera, Plus,
  Sparkles, Loader2, Check, X, Link2,
} from "lucide-react";
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
import { useCourse, useCourseLessons, useCourseGoals, useDeleteCourse, useLinkGoalToCourse, useLinkLessonToCourse } from "@/hooks/useCourses";
import { useCreateGoal, useGoalsForClass } from "@/hooks/useGoals";
import { useCreateLesson, useLessons } from "@/hooks/useLessons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClassStudents } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentGoalLevels, useSetStudentGoalLevel } from "@/hooks/useStudentGoalLevels";
import { DEFAULT_LEVEL_DESCRIPTORS } from "@/constants/goalLevels";

const statusLabels: Record<string, string> = {
  prepared: "Připravená",
  ongoing: "Probíhající",
  past: "Proběhlá",
};

const statusColors: Record<string, string> = {
  prepared: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
  past: "bg-muted text-muted-foreground",
};

interface SuggestedGoal {
  title: string;
  description: string;
  criteria: {
    description: string;
    level_descriptors: { level: string; description: string }[];
  }[];
}

interface SuggestedLesson {
  title: string;
  planned_activities: string;
  observation_focus: string;
}

export default function K03CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
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

  // Student-goal levels
  const goalIds = useMemo(() => goals.map((g: any) => g.id), [goals]);
  const { data: studentGoalLevels = {} } = useStudentGoalLevels(goalIds);
  const setLevel = useSetStudentGoalLevel();

  // Resolve available levels for a goal from its criteria's level_descriptors.
  // Falls back to DEFAULT_LEVEL_DESCRIPTORS.
  const goalLevelsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const goal of goals) {
      // We'll resolve from criteria query below; for now use defaults
      map[goal.id] = DEFAULT_LEVEL_DESCRIPTORS.map((ld) => ld.level);
    }
    return map;
  }, [goals]);

  // Fetch criteria for all course goals to get custom level descriptors
  const { data: goalCriteriaMap = {} } = useQuery({
    queryKey: ["course_goal_criteria", goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return {};
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select("goal_id, level_descriptors")
        .in("goal_id", goalIds)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      // Use the first criterion's levels per goal (they should be consistent)
      const map: Record<string, string[]> = {};
      for (const row of data || []) {
        if (map[row.goal_id]) continue; // already got levels from first criterion
        const descriptors = row.level_descriptors as any[];
        if (descriptors?.length > 0) {
          map[row.goal_id] = descriptors.map((ld: any) => ld.level);
        }
      }
      return map;
    },
    enabled: !!user && goalIds.length > 0,
  });

  // Merged levels: criteria-based if available, else defaults
  const resolvedGoalLevels = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const gId of goalIds) {
      map[gId] = goalCriteriaMap[gId] || goalLevelsMap[gId] || DEFAULT_LEVEL_DESCRIPTORS.map((ld) => ld.level);
    }
    return map;
  }, [goalIds, goalCriteriaMap, goalLevelsMap]);

  const handleLevelClick = (studentId: string, goalId: string) => {
    const levels = resolvedGoalLevels[goalId] || [];
    if (levels.length === 0) return;
    const currentLevel = studentGoalLevels[studentId]?.[goalId] || null;
    const currentIdx = currentLevel ? levels.indexOf(currentLevel) : -1;
    // Cycle: none -> level0 -> level1 -> ... -> levelN -> none
    const nextIdx = currentIdx + 1;
    const nextLevel = nextIdx >= levels.length ? null : levels[nextIdx];
    setLevel.mutate({ studentId, goalId, level: nextLevel });
  };

  // Goal proof counts (total)
  const { data: goalProofCounts = {} } = useQuery({
    queryKey: ["course_goal_proof_counts", goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return {};
      const { data, error } = await supabase
        .from("proof_goals")
        .select("goal_id")
        .in("goal_id", goalIds);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        map[r.goal_id] = (map[r.goal_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user && goalIds.length > 0,
  });

  // Criteria counts per goal
  const { data: criteriaCounts = {} } = useQuery({
    queryKey: ["course_goal_criteria_counts", goalIds],
    queryFn: async () => {
      if (goalIds.length === 0) return {};
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select("goal_id")
        .in("goal_id", goalIds);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of data) {
        map[r.goal_id] = (map[r.goal_id] || 0) + 1;
      }
      return map;
    },
    enabled: !!user && goalIds.length > 0,
  });

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
    } catch {
      toast({ title: "Chyba při přidávání", variant: "destructive" });
    }
  };

  const handleLinkLesson = async (lessonId: string) => {
    if (!courseId) return;
    try {
      await linkLesson.mutateAsync({ lessonId, courseId });
      toast({ title: "Lekce přidána do kurzu" });
    } catch {
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
    } catch {
      toast({ title: "Chyba při mazání", variant: "destructive" });
    }
  };

  // AI: Generate goals from thematic plan
  const handleGenerateGoals = async () => {
    if (!course?.thematic_plan_file_url) return;
    setGeneratingGoals(true);
    setSuggestedGoals([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-goals-from-plan", {
        body: {
          fileUrl: course.thematic_plan_file_url,
          subject: course.subjects?.name || undefined,
          className: course.classes?.name || undefined,
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
    try {
      const { data, error } = await supabase.functions.invoke("generate-lessons-from-plan", {
        body: {
          fileUrl: course.thematic_plan_file_url,
          subject: course.subjects?.name || undefined,
          className: course.classes?.name || undefined,
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
    } catch {
      toast({ title: "Chyba při ukládání cíle", variant: "destructive" });
    } finally {
      setSavingGoalIdx(null);
    }
  };

  // Reject a single suggested goal
  const handleRejectGoal = (index: number) => {
    setSuggestedGoals((prev) => prev.filter((_, i) => i !== index));
  };

  // Accept all goals
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
    } catch {
      toast({ title: "Chyba při ukládání lekce", variant: "destructive" });
    } finally {
      setSavingLessonIdx(null);
    }
  };

  // Reject a single suggested lesson
  const handleRejectLesson = (index: number) => {
    setSuggestedLessons((prev) => prev.filter((_, i) => i !== index));
  };

  // Accept all lessons
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
                Zachycovat
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
        {students.length > 0 && goals.length > 0 && (() => {
          const getLevelColor = (level: string, goalId: string) => {
            const levels = resolvedGoalLevels[goalId] || [];
            const idx = levels.indexOf(level);
            if (idx < 0) return "bg-muted text-muted-foreground border-border";
            const len = levels.length;
            if (len <= 1) return "bg-green-100 text-green-700 border-green-200";
            if (len === 2) return idx === 0
              ? "bg-red-100 text-red-700 border-red-200"
              : "bg-green-100 text-green-700 border-green-200";
            if (len === 3) {
              if (idx === 0) return "bg-red-100 text-red-700 border-red-200";
              if (idx === 1) return "bg-yellow-100 text-yellow-700 border-yellow-200";
              return "bg-green-100 text-green-700 border-green-200";
            }
            // 4 levels: red, orange, yellow, green
            if (idx === 0) return "bg-red-100 text-red-700 border-red-200";
            if (idx === 1) return "bg-orange-100 text-orange-700 border-orange-200";
            if (idx === 2) return "bg-yellow-100 text-yellow-700 border-yellow-200";
            return "bg-green-100 text-green-700 border-green-200";
          };

          // Abbreviate level for cell display — first letter only
          const abbreviateLevel = (level: string) => {
            return level.charAt(0).toUpperCase();
          };

          return (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                Úroveň žáků podle cílů
              </h2>
              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left font-medium text-muted-foreground px-3 py-2 sticky left-0 bg-muted/50 z-10 min-w-[120px]">
                        Žák
                      </th>
                      {goals.map((goal: any) => (
                        <th
                          key={goal.id}
                          className="px-1.5 py-2 text-center font-medium text-muted-foreground"
                        >
                          <Link
                            to={`/goals/${goal.id}`}
                            className="hover:text-primary transition-colors"
                            title={goal.title}
                          >
                            <span className="block max-w-[80px] truncate text-xs mx-auto">
                              {goal.title}
                            </span>
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...students]
                      .sort((a: any, b: any) => a.last_name.localeCompare(b.last_name))
                      .map((student: any) => (
                        <tr
                          key={student.id}
                          className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-3 py-1.5 sticky left-0 bg-card z-10 font-medium">
                            <Link
                              to={`/student-profiles/${student.id}`}
                              className="hover:text-primary transition-colors whitespace-nowrap"
                            >
                              {getStudentDisplayName(student)}
                            </Link>
                          </td>
                          {goals.map((goal: any) => {
                            const level =
                              studentGoalLevels[student.id]?.[goal.id] || null;
                            return (
                              <td
                                key={goal.id}
                                className="px-1.5 py-1.5 text-center"
                              >
                                <button
                                  onClick={() =>
                                    handleLevelClick(student.id, goal.id)
                                  }
                                  className={`inline-flex items-center justify-center min-w-[2rem] h-7 px-1.5 rounded-md text-[11px] font-medium border cursor-pointer transition-all hover:scale-105 ${
                                    level
                                      ? getLevelColor(level, goal.id)
                                      : "bg-muted/50 text-muted-foreground/40 border-transparent hover:border-border"
                                  }`}
                                  title={
                                    level
                                      ? `${level} — klikněte pro změnu`
                                      : "Klikněte pro nastavení úrovně"
                                  }
                                >
                                  {level
                                    ? abbreviateLevel(level)
                                    : "–"}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Legend: show levels from first goal as example */}
              {(() => {
                const exampleGoalId = goalIds[0];
                const levels = resolvedGoalLevels[exampleGoalId] || [];
                if (levels.length === 0) return null;
                return (
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
                    <span className="text-muted-foreground/60">Kliknutím měníte úroveň:</span>
                    {levels.map((lvl) => (
                      <span key={lvl} className="flex items-center gap-1">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-sm border ${getLevelColor(lvl, exampleGoalId)}`}
                        />
                        {lvl}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Goals */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Vzdělávací cíle ({goals.length})
            </h2>
            <div className="flex items-center gap-2">
              {course.thematic_plan_file_url && suggestedGoals.length === 0 && (
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

          {/* Link existing goal dialog */}
          <Dialog open={linkGoalOpen} onOpenChange={setLinkGoalOpen}>
            <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Připojit existující cíl</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto space-y-1">
                {availableGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Žádné dostupné cíle</p>
                ) : (
                  availableGoals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => { handleLinkGoal(goal.id); setLinkGoalOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">{goal.title}</span>
                      {goal.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{goal.description}</p>
                      )}
                      {goal.subjects?.name && (
                        <Badge variant="outline" className="text-[10px] mt-1">{goal.subjects.name}</Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Suggested goals from AI */}
          {suggestedGoals.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Navrhované cíle ({suggestedGoals.length})
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs h-7"
                    onClick={handleAcceptAllGoals}
                  >
                    <Check className="h-3 w-3" />
                    Přijmout vše
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs h-7 text-muted-foreground"
                    onClick={() => setSuggestedGoals([])}
                  >
                    <X className="h-3 w-3" />
                    Odmítnout vše
                  </Button>
                </div>
              </div>
              {suggestedGoals.map((goal, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-primary/5 border border-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
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
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleAcceptGoal(idx)}
                        disabled={savingGoalIdx === idx}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                        title="Přijmout"
                      >
                        {savingGoalIdx === idx ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectGoal(idx)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground transition-colors"
                        title="Odmítnout"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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

          {/* Link existing lesson dialog */}
          <Dialog open={linkLessonOpen} onOpenChange={setLinkLessonOpen}>
            <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Připojit existující lekci</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto space-y-1">
                {availableLessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Žádné dostupné lekce</p>
                ) : (
                  availableLessons.map((lesson: any) => (
                    <button
                      key={lesson.id}
                      onClick={() => { handleLinkLesson(lesson.id); setLinkLessonOpen(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
                    >
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
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Suggested lessons from AI */}
          {suggestedLessons.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Navrhované lekce ({suggestedLessons.length})
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs h-7"
                    onClick={handleAcceptAllLessons}
                  >
                    <Check className="h-3 w-3" />
                    Přijmout vše
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs h-7 text-muted-foreground"
                    onClick={() => setSuggestedLessons([])}
                  >
                    <X className="h-3 w-3" />
                    Odmítnout vše
                  </Button>
                </div>
              </div>
              {suggestedLessons.map((lesson, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-primary/5 border border-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground">{lesson.title}</span>
                      {lesson.planned_activities && (
                        <p className="text-sm text-muted-foreground mt-0.5">{lesson.planned_activities}</p>
                      )}
                      {lesson.observation_focus && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          Zaměření pozorování: {lesson.observation_focus}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleAcceptLesson(idx)}
                        disabled={savingLessonIdx === idx}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                        title="Přijmout"
                      >
                        {savingLessonIdx === idx ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectLesson(idx)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground transition-colors"
                        title="Odmítnout"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
