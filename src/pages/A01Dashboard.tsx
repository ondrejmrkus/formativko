import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import {
  Camera,
  BookOpen,
  Target,
  ChevronRight,
  CalendarDays,
  GraduationCap,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useStudents } from "@/hooks/useStudents";
import { useClasses } from "@/hooks/useClasses";
import { useCourses } from "@/hooks/useCourses";
import { useGoals } from "@/hooks/useGoals";
import { useLessons } from "@/hooks/useLessons";
import {
  useTodaysLessons,
  useNextLesson,
  useLessonGoalCounts,
  useCourseStudentHeatmap,
  useHasProofs,
} from "@/hooks/useDashboard";
import eliImage from "@/assets/Eli.svg";

/**
 * Convert a Czech first name to vocative case (5. pád).
 * Covers the most common patterns for Czech first names.
 */
function toVocative(name: string): string {
  if (!name || name.length < 2) return name;

  // Names ending in -ia, -ie, -ie → unchanged (Marie, Lucie, Sofie)
  if (/i[eaě]$/i.test(name)) return name;

  // Names ending in -a → -o (Ondra→Ondro, Honza→Honzo, Eva→Evo, Jana→Jano)
  if (name.endsWith("a")) return name.slice(0, -1) + "o";

  // Names ending in -e, -ě, -i, -í, -o → unchanged
  if (/[eěiíoó]$/i.test(name)) return name;

  // Names ending in -ek → -ku (Marek→Marku, Radek→Radku, Zdeněk→Zdeňku)
  if (name.endsWith("ek")) return name.slice(0, -2) + "ku";
  if (name.endsWith("ěk")) return name.slice(0, -2) + "ňku";

  // Names ending in -el → -le (Pavel→Pavle)
  if (name.endsWith("el")) return name.slice(0, -2) + "le";

  // Names ending in soft/hushing consonants → add -i
  // (Tomáš→Tomáši, Lukáš→Lukáši, Miloš→Miloši, Matouš→Matouši)
  if (/[šžčřďťň]$/.test(name)) return name + "i";

  // Names ending in -ec → -če (but rare for first names)
  if (name.endsWith("ec")) return name.slice(0, -2) + "če";

  // Names ending in -r after consonant → -ře (Petr→Petře, Alexandr→Alexandre... well Petře)
  if (/[^aeiouáéíóúůýě]r$/i.test(name)) return name.slice(0, -1) + "ře";

  // Names ending in -k (not -ek, handled above) → -ku (Erik→Eriku)
  if (name.endsWith("k")) return name.slice(0, -1) + "ku";

  // Default for other consonants → add -e
  // (Jan→Jane, Adam→Adame, Filip→Filipe, Jakub→Jakube, David→Davide)
  if (/[bcdfghjlmnprstvzBCDFGHJLMNPRSTVZ]$/.test(name)) return name + "e";

  return name;
}

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
  const { displayName } = useProfile();
  const { data: allStudents = [] } = useStudents();
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
  const { data: courseHeatmaps = [] } = useCourseStudentHeatmap();

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

  const hour = new Date().getHours();
  const greeting = hour < 9 ? "Dobré ráno" : hour < 18 ? "Dobrý den" : "Dobrý večer";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}{displayName ? `, ${toVocative(displayName)}` : ""}!
          </h1>
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
                  Přidat důkaz
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
                              Přidat důkazy
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

            {/* === COURSE CARDS === */}
            {courseHeatmaps.filter((ch) => ch.students.length > 0).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Vaše kurzy
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
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
                <div className="space-y-4">
                  {courseHeatmaps
                    .filter((ch) => ch.students.length > 0)
                    .map((ch) => (
                      <div key={ch.courseId} className="rounded-xl bg-card border border-border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Link
                            to={`/courses/${ch.courseId}`}
                            className="min-w-0 hover:text-primary transition-colors"
                          >
                            <p className="font-medium text-foreground text-sm">
                              {ch.courseName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ch.className} · {ch.subjectName}
                              {ch.totalGoals > 0 && (
                                <span>
                                  {" · "}{ch.coveredGoals} / {ch.totalGoals}{" "}
                                  {ch.totalGoals === 1 ? "cíl" : ch.totalGoals < 5 ? "cíle" : "cílů"}
                                </span>
                              )}
                            </p>
                          </Link>
                          <Link
                            to={`/capture/${ch.courseId}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0 ml-3"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            Přidat důkazy
                          </Link>
                        </div>
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
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
