import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Pencil, Trash2, Target, BookOpen, Users, FileDown, Camera, Plus,
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
import { useCourse, useCourseLessons, useCourseGoals, useDeleteCourse } from "@/hooks/useCourses";
import { useClassStudents } from "@/hooks/useClasses";
import { useToast } from "@/hooks/use-toast";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  // Goal proof counts
  const goalIds = useMemo(() => goals.map((g: any) => g.id), [goals]);
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

  if (isLoading || !course) {
    return <AppLayout><div className="text-center py-12 text-muted-foreground">Načítání...</div></AppLayout>;
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
            {course.class_id && (
              <Button variant="default" size="sm" className="gap-1.5" asChild>
                <Link to={`/capture/${course.class_id}?courseId=${course.id}`}>
                  <Camera className="h-4 w-4" />
                  Zachycovat
                </Link>
              </Button>
            )}
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

        {/* Goals */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              Vzdělávací cíle ({goals.length})
            </h2>
            <Button size="sm" variant="outline" className="gap-1" asChild>
              <Link to={`/goals/create?courseId=${course.id}`}>
                <Plus className="h-3.5 w-3.5" />
                Přidat cíl
              </Link>
            </Button>
          </div>
          {goals.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
              Zatím žádné cíle v tomto kurzu.
            </div>
          ) : (
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
            <Button size="sm" variant="outline" className="gap-1" asChild>
              <Link to={`/lessons/create?courseId=${course.id}`}>
                <Plus className="h-3.5 w-3.5" />
                Nová lekce
              </Link>
            </Button>
          </div>
          {lessons.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
              Zatím žádné lekce v tomto kurzu.
            </div>
          ) : (
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
