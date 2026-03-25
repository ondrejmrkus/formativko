import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Sparkles, Loader2, Plus, Check } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useLesson, useLessonGoals, useCreateLesson, useUpdateLesson } from "@/hooks/useLessons";
import { useGoalsForClass, useCreateGoal } from "@/hooks/useGoals";
import { useSubjects, useCreateSubject } from "@/hooks/useSubjects";
import { useCourse } from "@/hooks/useCourses";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { LevelDescriptor } from "@/constants/goalLevels";

const statusOptions = [
  { id: "prepared", label: "Připravená" },
  { id: "ongoing", label: "Probíhající" },
  { id: "past", label: "Proběhlá" },
];

interface SuggestedGoal {
  title: string;
  description: string;
  criteria: { description: string; level_descriptors: LevelDescriptor[] }[];
}

export default function D02CreateLesson() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  const isEdit = !!lessonId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: classes = [] } = useClasses();
  const { data: courseContext } = useCourse(courseIdParam || undefined);
  const { data: existingLesson } = useLesson(isEdit ? lessonId : undefined);
  const { data: existingLessonGoals = [] } = useLessonGoals(isEdit ? lessonId : undefined);
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const createGoal = useCreateGoal();
  const { data: subjects = [] } = useSubjects();
  const createSubject = useCreateSubject();

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("prepared");
  const [plannedActivities, setPlannedActivities] = useState("");
  const [observationFocus, setObservationFocus] = useState("");
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestedGoals, setSuggestedGoals] = useState<SuggestedGoal[]>([]);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<number>>(new Set());

  const { data: classGoals = [] } = useGoalsForClass(selectedClassId || undefined);

  // Pre-fill from course context
  useEffect(() => {
    if (courseContext && !isEdit) {
      setSelectedClassId(courseContext.class_id);
      setSelectedSubjectId(courseContext.subject_id);
    }
  }, [courseContext, isEdit]);

  // Populate form when editing
  useEffect(() => {
    if (existingLesson) {
      setSelectedClassId(existingLesson.class_id);
      setSelectedSubjectId(existingLesson.subject_id);
      setTitle(existingLesson.title);
      setDate(existingLesson.date || new Date().toISOString().split("T")[0]);
      setStatus(existingLesson.status);
      setPlannedActivities(existingLesson.planned_activities || "");
      setObservationFocus(existingLesson.observation_focus || "");
    }
  }, [existingLesson]);

  useEffect(() => {
    if (existingLessonGoals.length > 0) {
      setSelectedGoalIds(existingLessonGoals.map((g) => g.id));
    }
  }, [existingLessonGoals]);

  // Reset goals when class changes (except during initial load)
  const [classInitialized, setClassInitialized] = useState(false);
  useEffect(() => {
    if (classInitialized) {
      setSelectedGoalIds([]);
    }
    if (selectedClassId) {
      setClassInitialized(true);
    }
  }, [selectedClassId]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
  };

  const handleSave = async () => {
    if (!selectedClassId) {
      toast({ title: "Vyberte třídu", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Zadejte název lekce", variant: "destructive" });
      return;
    }

    try {
      if (isEdit) {
        await updateLesson.mutateAsync({
          id: lessonId!,
          classId: selectedClassId,
          title: title.trim(),
          subjectId: selectedSubjectId,
          status,
          date: date || null,
          plannedActivities: plannedActivities.trim(),
          observationFocus: observationFocus.trim(),
          goalIds: selectedGoalIds,
          courseId: courseIdParam,
        });
        toast({ title: "Lekce upravena" });
        navigate(`/lessons/${lessonId}`);
      } else {
        const lesson = await createLesson.mutateAsync({
          classId: selectedClassId,
          title: title.trim(),
          subjectId: selectedSubjectId,
          status,
          date: date || null,
          plannedActivities: plannedActivities.trim(),
          observationFocus: observationFocus.trim(),
          goalIds: selectedGoalIds,
          courseId: courseIdParam,
        });
        toast({ title: "Lekce vytvořena" });
        navigate(`/lessons/${lesson.id}`);
      }
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const handleAiSuggest = async () => {
    const topic = [title.trim(), plannedActivities.trim()].filter(Boolean).join(". ");
    if (!topic) {
      toast({ title: "Vyplňte název nebo plánované aktivity", variant: "destructive" });
      return;
    }

    setAiLoading(true);
    setSuggestedGoals([]);
    setAddedSuggestions(new Set());
    setAiOpen(true);

    try {
      const subjectName = subjects.find((s) => s.id === selectedSubjectId)?.name || "obecný";
      const { data, error } = await supabase.functions.invoke("generate-goals", {
        body: { topic, subject: subjectName },
      });
      if (error) throw error;
      setSuggestedGoals(data?.goals || []);
    } catch (e: any) {
      toast({ title: "Chyba při generování", description: e?.message, variant: "destructive" });
      setAiOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddSuggestion = async (idx: number) => {
    if (!selectedClassId) return;
    const sg = suggestedGoals[idx];
    try {
      const goal = await createGoal.mutateAsync({
        classId: selectedClassId,
        title: sg.title,
        description: sg.description,
        subjectId: selectedSubjectId,
        criteria: (sg.criteria || []).map((c, i) => ({
          description: c.description,
          level_descriptors: c.level_descriptors || [],
          sort_order: i,
        })),
      });
      setSelectedGoalIds((prev) => [...prev, goal.id]);
      setAddedSuggestions((prev) => new Set(prev).add(idx));
      toast({ title: `Cíl "${sg.title}" přidán` });
    } catch {
      toast({ title: "Chyba při ukládání cíle", variant: "destructive" });
    }
  };

  const isPending = createLesson.isPending || updateLesson.isPending;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            ...(courseContext
              ? [
                  { label: "Kurzy", href: "/courses" },
                  { label: courseContext.name, href: `/courses/${courseContext.id}` },
                ]
              : [{ label: "Lekce", href: "/lessons" }]),
            { label: isEdit ? "Upravit lekci" : "Nová lekce" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">{isEdit ? "Upravit lekci" : "Nová lekce"}</h1>

        <div className="space-y-6">
          {/* Class */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Třída</label>
            <div className="flex flex-wrap gap-2">
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Zatím nemáte žádné třídy.</p>
              ) : (
                classes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selectedClassId === c.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Předmět</label>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubjectId(s.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    selectedSubjectId === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Nový předmět..."
                className="bg-card flex-1"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newSubjectName.trim()) {
                      createSubject.mutate({ name: newSubjectName.trim() }, {
                        onSuccess: (data) => {
                          setSelectedSubjectId(data.id);
                          setNewSubjectName("");
                        },
                      });
                    }
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newSubjectName.trim() || createSubject.isPending}
                onClick={() => {
                  if (newSubjectName.trim()) {
                    createSubject.mutate({ name: newSubjectName.trim() }, {
                      onSuccess: (data) => {
                        setSelectedSubjectId(data.id);
                        setNewSubjectName("");
                      },
                    });
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Název lekce</label>
            <Input placeholder="Např. Slovní úlohy s násobením..." className="bg-card" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Datum</label>
              <Input type="date" className="bg-card" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Stav</label>
              <div className="flex gap-2">
                {statusOptions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatus(s.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      status === s.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Planned activities */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Plánované aktivity</label>
            <Textarea
              placeholder="Co plánuji dělat v hodině..."
              className="min-h-[80px] bg-card"
              value={plannedActivities}
              onChange={(e) => setPlannedActivities(e.target.value)}
            />
          </div>

          {/* Observation focus */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Na co se zaměřit při pozorování</label>
            <Textarea
              placeholder="Na co budu u žáků sledovat..."
              className="min-h-[60px] bg-card"
              value={observationFocus}
              onChange={(e) => setObservationFocus(e.target.value)}
            />
          </div>

          {/* Linked goals */}
          {selectedClassId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Vzdělávací cíle</label>
              {classGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tato třída nemá žádné cíle.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classGoals.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleGoal(g.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selectedGoalIds.includes(g.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {g.title}
                      {g.subjects?.name && <span className="text-xs ml-1 opacity-60">({g.subjects.name})</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* AI suggest */}
              {(title.trim() || plannedActivities.trim()) && (
                <Button
                  variant="outline"
                  className="mt-3 gap-2"
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
                >
                  <Sparkles className="h-4 w-4" />
                  Navrhnout cíle z AI
                </Button>
              )}
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleSave} disabled={isPending}>
            {isPending ? "Ukládání..." : isEdit ? "Uložit změny" : "Vytvořit lekci"}
          </Button>
        </div>

        {/* AI suggestions dialog */}
        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Navržené vzdělávací cíle</DialogTitle>
            </DialogHeader>
            {aiLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Generuji návrhy...
              </div>
            ) : suggestedGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nepodařilo se vygenerovat návrhy.</p>
            ) : (
              <div className="space-y-3">
                {suggestedGoals.map((sg, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground">{sg.title}</h3>
                        {sg.description && (
                          <p className="text-sm text-muted-foreground mt-1">{sg.description}</p>
                        )}
                        {sg.criteria?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {sg.criteria.map((c, ci) => (
                              <div key={ci} className="text-xs text-muted-foreground">
                                <span className="font-medium">{c.description}</span>
                                {c.level_descriptors?.length > 0 && (
                                  <span className="ml-1">
                                    ({c.level_descriptors.map((ld) => ld.level).join(" → ")})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={addedSuggestions.has(idx) ? "secondary" : "default"}
                        onClick={() => handleAddSuggestion(idx)}
                        disabled={addedSuggestions.has(idx) || createGoal.isPending}
                        className="shrink-0 gap-1"
                      >
                        {addedSuggestions.has(idx) ? (
                          <><Check className="h-3.5 w-3.5" /> Přidáno</>
                        ) : (
                          <><Plus className="h-3.5 w-3.5" /> Přidat</>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
