import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import {
  Camera,
  FileText,
  BookOpen,
  Target,
  UserX,
  ChevronRight,
  Plus,
  CalendarDays,
  GraduationCap,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useStudents } from "@/hooks/useStudents";
import { useEvaluationGroups } from "@/hooks/useEvaluations";
import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";
import { useGoals } from "@/hooks/useGoals";
import { useLessons } from "@/hooks/useLessons";
import {
  useTodaysLessons,
  useNextLesson,
  useLessonGoalCounts,
  useClassGoalCoverage,
  useProofsThisWeek,
  useCourseStudentHeatmap,
  useHasProofs,
} from "@/hooks/useDashboard";
import eliImage from "@/assets/Eli.svg";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | null;

function getOnboardingStep(
  hasClasses: boolean,
  hasCourses: boolean,
  hasGoals: boolean,
  hasLessons: boolean,
  hasProofs: boolean
): OnboardingStep {
  if (!hasClasses) return 1;
  if (!hasCourses) return 2;
  if (!hasGoals) return 3;
  if (!hasLessons) return 4;
  if (!hasProofs) return 5;
  return null;
}

export default function A01Dashboard() {
  const { user } = useAuth();
  const { displayName } = useProfile();
  const { data: allStudents = [] } = useStudents();
  const { data: evaluationGroups = [] } = useEvaluationGroups();
  const { data: classes = [] } = useClasses();
  const { data: courses = [] } = useCourses();
  const { data: goals = [] } = useGoals();
  const { data: lessons = [] } = useLessons();
  const { data: hasProofs = false } = useHasProofs();

  // Dashboard data
  const { data: todaysLessons = [] } = useTodaysLessons();
  const { data: nextLesson } = useNextLesson(todaysLessons.length > 0);
  const { data: lessonGoalCounts = {} } = useLessonGoalCounts(
    todaysLessons.map((l) => l.id)
  );
  const { data: classProgress = [] } = useClassGoalCoverage();
  const { data: proofsThisWeek = 0 } = useProofsThisWeek();
  const { data: courseHeatmaps = [] } = useCourseStudentHeatmap();

  // Classes with today's lessons (for smart capture)
  const todayClassIds = new Set(todaysLessons.map((l) => l.class_id).filter(Boolean));

  // Onboarding state
  const step = getOnboardingStep(
    classes.length > 0,
    courses.length > 0,
    goals.length > 0,
    lessons.length > 0,
    hasProofs
  );

  // Build link with course context for goal/lesson creation
  const firstCourse = courses[0];
  const goalCreateUrl = firstCourse
    ? `/goals/create?courseId=${firstCourse.id}`
    : "/goals/create";
  const lessonCreateUrl = firstCourse
    ? `/lessons/create?courseId=${firstCourse.id}`
    : "/lessons/create";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">
            Dobrý den{displayName ? `, ${displayName}` : ""}!
          </h1>
          {step === null && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {proofsThisWeek > 0
                ? `Tento týden: ${proofsThisWeek} ${proofsThisWeek === 1 ? "důkaz" : proofsThisWeek < 5 ? "důkazy" : "důkazů"}. Skvělá práce!`
                : "Jak vám mohu dnes pomoci?"}
            </p>
          )}
        </div>

        {/* === ONBOARDING === */}
        {step !== null && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            {/* Completed steps */}
            {step > 1 && (
              <div className="space-y-1">
                {/* Step 1 completed */}
                <Link
                  to={classes.length === 1 ? `/edit-class/${classes[0].id}` : "/classes"}
                  className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span className="text-sm font-semibold text-foreground">
                    {classes.length} {classes.length === 1 ? "třída" : classes.length < 5 ? "třídy" : "tříd"}
                  </span>
                  <span className="text-sm text-foreground/60">
                    — {classes.map((c) => c.name).join(", ")}
                    {allStudents.length > 0 && ` · ${allStudents.length} ${allStudents.length === 1 ? "žák" : allStudents.length < 5 ? "žáci" : "žáků"}`}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                {/* Step 2 completed */}
                {step > 2 && (
                  <Link
                    to={courses.length === 1 ? `/courses/${courses[0].id}` : "/courses"}
                    className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">
                      {courses.length} {courses.length === 1 ? "kurz vytvořen" : courses.length < 5 ? "kurzy vytvořeny" : "kurzů vytvořeno"}
                    </span>
                    <span className="text-sm text-foreground/60">
                      — {courses.map((c) => c.name).join(", ")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )}

                {/* Step 3 completed */}
                {step > 3 && (
                  <Link
                    to={goals.length === 1 ? `/goals/${goals[0].id}` : "/goals"}
                    className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">
                      {goals.length} {goals.length === 1 ? "cíl stanoven" : goals.length < 5 ? "cíle stanoveny" : "cílů stanoveno"}
                    </span>
                    <span className="text-sm text-foreground/60">
                      — {goals.map((g) => g.title).join(", ")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )}

                {/* Step 4 completed */}
                {step > 4 && (
                  <Link
                    to={lessons.length === 1 ? `/lessons/${lessons[0].id}` : "/lessons"}
                    className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">
                      {lessons.length} {lessons.length === 1 ? "lekce naplánována" : lessons.length < 5 ? "lekce naplánovány" : "lekcí naplánováno"}
                    </span>
                    <span className="text-sm text-foreground/60">
                      — {lessons.map((l) => l.title).join(", ")}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )}

                <div className="border-t border-border mt-2" />
              </div>
            )}

            {/* Current step */}
            {step === 1 && (
              <div className="flex items-start gap-5">
                <img src={eliImage} alt="" className="h-16 w-16 shrink-0 hidden sm:block" />
                <div className="flex-1">
                  <p className="text-muted-foreground mb-4">
                    Pojďme společně připravit vše potřebné. Začneme vytvořením třídy a přidáním žáků.
                  </p>
                  <Link
                    to="/create-class"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Vytvořit první třídu
                  </Link>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-muted-foreground mb-1">
                  Vytvořte svůj první kurz.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Kurz propojí třídu s předmětem — například „Matematika 5.A".
                </p>
                <Link
                  to="/courses/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  <Layers className="h-4 w-4" />
                  Vytvořit kurz
                </Link>
              </div>
            )}

            {step === 3 && (
              <div>
                <p className="text-muted-foreground mb-1">
                  Stanovte první vzdělávací cíl pro váš kurz.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Cíl popisuje, co se žáci mají naučit — například „Žák rozliší sudá a lichá čísla."
                </p>
                <Link
                  to={goalCreateUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  <Target className="h-4 w-4" />
                  Vytvořit cíl
                </Link>
              </div>
            )}

            {step === 4 && (
              <div>
                <p className="text-muted-foreground mb-1">
                  Naplánujte svou první lekci.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Lekce vám pomůže strukturovat výuku a propojit ji s cíli.
                </p>
                <Link
                  to={lessonCreateUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  Vytvořit lekci
                </Link>
              </div>
            )}

            {step === 5 && (
              <div>
                <p className="text-muted-foreground mb-1">
                  Vše je připraveno!
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Zachyťte svůj první důkaz učení — pozorování, fotografii nebo poznámku z hodiny.
                </p>
                <Link
                  to="/capture"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Zachytit důkaz
                </Link>
              </div>
            )}
          </div>
        )}

        {/* === NORMAL DASHBOARD CONTENT (only when onboarding complete) === */}
        {step === null && (
          <>
            {/* === TODAY'S LESSONS === */}
            {todaysLessons.length > 0 ? (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Dnešní lekce
                </h2>
                <div className="space-y-2">
                  {todaysLessons.map((lesson) => {
                    const goalCount = lessonGoalCounts[lesson.id] || 0;
                    const hasObsFocus = !!lesson.observation_focus;
                    const cls = classes.find((c) => c.id === lesson.class_id);
                    return (
                      <Link
                        key={lesson.id}
                        to={`/lessons/${lesson.id}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {lesson.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {cls?.name}
                            {lesson.subjects?.name ? ` · ${lesson.subjects.name}` : ""}
                            {goalCount > 0 ? ` · ${goalCount} ${goalCount === 1 ? "cíl" : goalCount < 5 ? "cíle" : "cílů"}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {!hasObsFocus && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">
                              bez zaměření
                            </span>
                          )}
                          {lesson.status === "ongoing" && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                              probíhá
                            </span>
                          )}
                          {lesson.course_id && (
                            <Link
                              to={`/capture/${lesson.course_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Camera className="h-3 w-3" />
                              Zachytit
                            </Link>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : nextLesson ? (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Příští lekce
                </h2>
                <Link
                  to={`/lessons/${nextLesson.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {nextLesson.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {nextLesson.date
                        ? new Date(nextLesson.date).toLocaleDateString("cs-CZ", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })
                        : ""}
                      {nextLesson.subjects?.name ? ` · ${nextLesson.subjects.name}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </div>
            ) : null}

            {/* === STUDENT HEATMAP PER COURSE === */}
            {courseHeatmaps.filter((ch) => ch.students.length > 0).length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <UserX className="h-4 w-4" />
                  Žáci podle kurzů
                </h2>
                <div className="space-y-4">
                  {courseHeatmaps
                    .filter((ch) => ch.students.length > 0)
                    .map((ch) => (
                      <div key={ch.courseId} className="rounded-xl bg-card border border-border p-4">
                        <Link
                          to={`/courses/${ch.courseId}`}
                          className="flex items-center justify-between mb-3 hover:text-primary transition-colors"
                        >
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {ch.courseName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ch.className} · {ch.subjectName}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </Link>
                        <div className="flex flex-wrap gap-1.5">
                          {ch.students.map((s) => {
                            const bg =
                              s.proofCount === 0
                                ? "bg-red-100 text-red-800 border-red-200"
                                : s.proofCount <= 2
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-green-100 text-green-800 border-green-200";
                            return (
                              <Link
                                key={s.id}
                                to={`/student-profiles/${s.id}`}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-opacity hover:opacity-80 ${bg}`}
                                title={`${s.firstName} ${s.lastName}: ${s.proofCount} důkazů`}
                              >
                                {s.firstName} {s.lastName.charAt(0)}.
                                {s.proofCount > 0 && <span className="opacity-60">{s.proofCount}</span>}
                              </Link>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-4 mt-2.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200" />
                            0 důkazů
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-100 border border-yellow-200" />
                            1–2
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-200" />
                            3+
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* === QUICK CAPTURE === */}
            <div>
              <Link
                to="/capture"
                className="flex items-center gap-4 p-5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 shrink-0">
                  <Camera className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Přidat důkazy</p>
                  <p className="text-sm opacity-80">Spustit zachytávač pro třídu</p>
                </div>
              </Link>

              {/* Course shortcuts — today's first */}
              {courses.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 mt-3">
                  {[...courses]
                    .sort((a, b) => {
                      const aToday = todayClassIds.has(a.class_id) ? 0 : 1;
                      const bToday = todayClassIds.has(b.class_id) ? 0 : 1;
                      return aToday - bToday || a.name.localeCompare(b.name);
                    })
                    .map((c) => {
                      const isToday = todayClassIds.has(c.class_id);
                      return (
                        <Link
                          key={c.id}
                          to={`/capture/${c.id}`}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isToday
                              ? "bg-primary/5 border-primary/20 hover:border-primary/40"
                              : "bg-card border-border hover:border-primary/30"
                          }`}
                        >
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {c.name}
                              {isToday && (
                                <span className="ml-1.5 text-xs text-primary font-normal">
                                  dnes
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.classes?.name}{c.subjects?.name ? ` · ${c.subjects.name}` : ""}
                            </p>
                          </div>
                          <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>

            {/* === QUICK ACTIONS === */}
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Rychlé akce
              </h2>
              <div className="grid gap-2 sm:grid-cols-3">
                <Link
                  to="/evaluations/create"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-medium text-foreground text-sm">Slovní hodnocení</p>
                </Link>
                <Link
                  to="/lessons/create"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-medium text-foreground text-sm">Nová lekce</p>
                </Link>
                <Link
                  to="/goals/create"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-medium text-foreground text-sm">Nový cíl</p>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
