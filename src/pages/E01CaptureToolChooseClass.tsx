import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, BookOpen } from "lucide-react";
import { useCourses } from "@/hooks/useCourses";
import { useTodaysLessons } from "@/hooks/useDashboard";
import { useClassStudentCounts } from "@/hooks/useClasses";
import { useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function E01CaptureToolChooseClass() {
  usePageTitle("Zachytávač");
  const { data: courses = [], isLoading } = useCourses();
  const { data: todaysLessons = [] } = useTodaysLessons();

  // Course IDs that have a lesson today (via class_id match)
  const todayCourseIds = useMemo(() => {
    const todayClassIds = new Set(todaysLessons.map((l) => l.class_id).filter(Boolean));
    return new Set(
      courses
        .filter((c) => todayClassIds.has(c.class_id))
        .map((c) => c.id)
    );
  }, [todaysLessons, courses]);

  const { data: counts = {} } = useClassStudentCounts();

  // Sort: today's courses first, then alphabetically
  const sortedCourses = useMemo(() =>
    [...courses].sort((a, b) => {
      const aToday = todayCourseIds.has(a.id) ? 0 : 1;
      const bToday = todayCourseIds.has(b.id) ? 0 : 1;
      return aToday - bToday || a.name.localeCompare(b.name, "cs");
    }),
    [courses, todayCourseIds]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-3 border-b border-border bg-card">
        <h1 className="text-lg font-bold">Zachytávač</h1>
        <Link to="/" className="p-2 hover:bg-accent rounded-lg" title="Zpět na úvod">
          <Home className="h-5 w-5 text-muted-foreground" />
        </Link>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-3 max-w-md mx-auto w-full">
        <p className="text-sm text-muted-foreground">Vyberte kurz</p>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání…</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Zatím nemáte žádný kurz.</p>
            <div className="flex flex-col gap-2 max-w-xs mx-auto">
              <Button asChild>
                <Link to="/courses/create">Vytvořit kurz</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">Zpět na úvod</Link>
              </Button>
            </div>
          </div>
        ) : (
          sortedCourses.map((course) => {
            const isToday = todayCourseIds.has(course.id);
            return (
              <Link
                key={course.id}
                to={`/capture/${course.id}`}
                className={`flex items-center justify-between p-5 rounded-xl border transition-all hover:shadow-sm ${
                  isToday
                    ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <div>
                  <span className="text-lg font-semibold text-foreground">
                    {course.name}
                    {isToday && (
                      <span className="ml-2 text-xs font-normal text-primary">dnes</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {course.classes?.name && (
                      <span className="text-xs text-muted-foreground">{course.classes.name}</span>
                    )}
                    {course.subjects?.name && (
                      <span className="text-xs text-muted-foreground">· {course.subjects.name}</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">{counts[course.class_id] || 0} žáků</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
