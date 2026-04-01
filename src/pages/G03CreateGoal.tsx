import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, Trash2, Copy, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchBar } from "@/components/shared/SearchBar";
import { Badge } from "@/components/ui/badge";
import { useClasses } from "@/hooks/useClasses";
import { useGoals, useGoal, useCreateGoal, useUpdateGoal } from "@/hooks/useGoals";
import { useCourses, useCourse } from "@/hooks/useCourses";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_LEVEL_DESCRIPTORS, type LevelDescriptor } from "@/constants/goalLevels";
import { ShimmerField } from "@/components/ui/field-shimmer";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function G03CreateGoal() {
  usePageTitle("Vzdělávací cíl");
  const { goalId } = useParams<{ goalId: string }>();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  const rvpOutcome = searchParams.get("rvpOutcome");
  const rvpSubject = searchParams.get("rvpSubject");
  const isEdit = !!goalId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: classes = [] } = useClasses();
  const { data: courses = [] } = useCourses();
  const { data: courseFromParam } = useCourse(courseIdParam || undefined);
  const { data: existingGoal } = useGoal(isEdit ? goalId : undefined);
  const { data: allGoals = [] } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  /** Tracks which phase of AI generation is active */
  const [genPhase, setGenPhase] = useState<"idle" | "formulating" | "criteria">("idle");
  const generating = genPhase !== "idle";
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneSearch, setCloneSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [levels, setLevels] = useState<LevelDescriptor[]>(
    DEFAULT_LEVEL_DESCRIPTORS.map((d) => ({ ...d }))
  );
  const [criteriaTexts, setCriteriaTexts] = useState<string[]>([""]);

  // Resolve the selected course object
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || null;

  // Pre-fill from courseId param
  useEffect(() => {
    if (courseIdParam && !isEdit) {
      setSelectedCourseId(courseIdParam);
    }
  }, [courseIdParam, isEdit]);

  // Pre-fill from RVP outcome
  useEffect(() => {
    if (rvpOutcome && !isEdit) {
      setTitle(decodeURIComponent(rvpOutcome));
    }
  }, [rvpOutcome, isEdit]);

  // Pre-fill course from RVP subject hint
  useEffect(() => {
    if (rvpSubject && !isEdit && courses.length > 0 && !selectedCourseId) {
      const decoded = decodeURIComponent(rvpSubject);
      const match = courses.find(
        (c) => c.subjects?.name?.toLowerCase() === decoded.toLowerCase()
      );
      if (match) setSelectedCourseId(match.id);
    }
  }, [rvpSubject, isEdit, courses, selectedCourseId]);

  // Populate form when editing
  useEffect(() => {
    if (existingGoal) {
      setTitle(existingGoal.title);
      setDescription(existingGoal.description);
      // Find the course this goal belongs to
      if (existingGoal.course_id) {
        setSelectedCourseId(existingGoal.course_id);
      } else {
        // Legacy goal without course — try to find a matching course
        const match = courses.find(
          (c) =>
            c.class_id === existingGoal.class_id &&
            c.subject_id === existingGoal.subject_id
        );
        if (match) setSelectedCourseId(match.id);
      }
      if (existingGoal.evaluation_criteria.length > 0) {
        const firstLevels = existingGoal.evaluation_criteria[0].level_descriptors;
        if (firstLevels?.length > 0) {
          setLevels(firstLevels.map((ld) => ({ ...ld })));
        }
        setCriteriaTexts(
          existingGoal.evaluation_criteria.map((c) => c.description)
        );
      }
    }
  }, [existingGoal, courses]);

  const updateLevel = (idx: number, field: "level" | "description", value: string) => {
    setLevels((prev) =>
      prev.map((ld, i) => (i === idx ? { ...ld, [field]: value } : ld))
    );
  };

  const addLevel = () => {
    setLevels((prev) => [...prev, { level: "", description: "" }]);
  };

  const removeLevel = (idx: number) => {
    setLevels((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCriterion = () => {
    setCriteriaTexts((prev) => [...prev, ""]);
  };

  const removeCriterion = (idx: number) => {
    setCriteriaTexts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCriterion = (idx: number, value: string) => {
    setCriteriaTexts((prev) => prev.map((c, i) => (i === idx ? value : c)));
  };

  /** Single AI action: formulate goal + generate criteria in one step */
  const handleGenerate = async () => {
    if (!title.trim()) {
      toast({ title: "Nejdříve napište cíl svými slovy", variant: "destructive" });
      return;
    }

    setGenPhase("formulating");
    try {
      const subjectName = selectedCourse?.subjects?.name;
      const className = classes.find((c) => c.id === selectedCourse?.class_id)?.name;

      const hasThematicPlan = !!selectedCourse?.thematic_plan_file_url;
      const defaultNames = DEFAULT_LEVEL_DESCRIPTORS.map((d) => d.level);
      const currentNames = levels.map((l) => l.level).filter((l) => l.trim());
      const isDefaultLevels =
        currentNames.length === defaultNames.length &&
        currentNames.every((l, i) => l === defaultNames[i]);
      const sendLevelNames =
        currentNames.length > 0 && (!hasThematicPlan || !isDefaultLevels);

      // Step 1: Formulate goal
      const { data: formData, error: formErr } = await supabase.functions.invoke(
        "formulate-goal",
        {
          body: {
            rawGoal: title.trim(),
            subject: subjectName || undefined,
            className: className || undefined,
          },
        }
      );

      if (formErr) throw formErr;
      if (formData?.error) throw new Error(formData.error);

      const refinedTitle = formData?.title || title.trim();
      const refinedDescription = formData?.description || description.trim();
      setTitle(refinedTitle);
      if (refinedDescription) setDescription(refinedDescription);

      // Title+description done, now generating criteria
      setGenPhase("criteria");

      // Step 2: Generate criteria
      const { data: critData, error: critErr } = await supabase.functions.invoke(
        "generate-criteria",
        {
          body: {
            goalTitle: refinedTitle,
            goalDescription: refinedDescription || undefined,
            subject: subjectName || undefined,
            levelNames: sendLevelNames ? currentNames : undefined,
            className: className || undefined,
            thematicPlanFileUrl: hasThematicPlan
              ? selectedCourse.thematic_plan_file_url
              : undefined,
          },
        }
      );

      if (critErr) throw critErr;
      if (critData?.error) throw new Error(critData.error);

      if (critData?.criteria?.length > 0) {
        const aiLevels = critData.criteria[0].level_descriptors;
        if (aiLevels?.length > 0) {
          setLevels(
            aiLevels.map((ld: { level: string; description: string }) => ({
              level: ld.level || "",
              description: ld.description || "",
            }))
          );
        }
        setCriteriaTexts(
          critData.criteria.map((c: { description: string }) => c.description || "")
        );
      }

      toast({ title: "Cíl a kritéria vygenerovány" });
    } catch (err: unknown) {
      console.error("Generate error:", err);
      toast({
        title: "Chyba při generování",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setGenPhase("idle");
    }
  };

  const handleClone = async (cloneGoalId: string) => {
    try {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("*, evaluation_criteria(*)")
        .eq("id", cloneGoalId)
        .single();
      if (error) throw error;
      // Find matching course for the cloned goal
      const match = courses.find(
        (c) =>
          c.class_id === data.class_id && c.subject_id === data.subject_id
      );
      if (match) setSelectedCourseId(match.id);
      setTitle(data.title);
      setDescription(data.description || "");
      const crit = (data.evaluation_criteria || []).sort(
        (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
      );
      if (crit.length > 0) {
        const firstLevels = crit[0].level_descriptors || [];
        if (firstLevels.length > 0) {
          setLevels(firstLevels.map((ld: LevelDescriptor) => ({ ...ld })));
        }
        setCriteriaTexts(crit.map((c: { description: string }) => c.description));
      }
      setCloneOpen(false);
      toast({ title: "Cíl naklonován do formuláře" });
    } catch (err) {
      console.error("Chyba při klonování", err);
      toast({ title: "Chyba při klonování", variant: "destructive" });
    }
  };

  const filteredCloneGoals = allGoals.filter((g) => {
    if (!cloneSearch.trim()) return true;
    const q = cloneSearch.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      (g.subjects?.name || "").toLowerCase().includes(q)
    );
  });

  const handleSave = async () => {
    if (!selectedCourse) {
      toast({ title: "Vyberte kurz", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Zadejte název cíle", variant: "destructive" });
      return;
    }

    const validLevels = levels.filter((ld) => ld.level.trim());
    const validCriteria = criteriaTexts
      .filter((c) => c.trim())
      .map((c, i) => ({
        description: c.trim(),
        level_descriptors: validLevels,
        sort_order: i,
      }));

    try {
      if (isEdit) {
        await updateGoal.mutateAsync({
          id: goalId!,
          classId: selectedCourse.class_id,
          title: title.trim(),
          description: description.trim(),
          subjectId: selectedCourse.subject_id,
          criteria: validCriteria,
          courseId: selectedCourse.id,
        });
        toast({ title: "Cíl upraven" });
        navigate(`/goals/${goalId}`);
      } else {
        await createGoal.mutateAsync({
          classId: selectedCourse.class_id,
          title: title.trim(),
          description: description.trim(),
          subjectId: selectedCourse.subject_id,
          criteria: validCriteria,
          courseId: selectedCourse.id,
        });
        toast({ title: "Cíl vytvořen" });
        navigate(`/courses/${selectedCourse.id}`);
      }
    } catch (err) {
      console.error("Chyba při ukládání", err);
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const isPending = createGoal.isPending || updateGoal.isPending;

  // Breadcrumb context
  const breadcrumbCourse = selectedCourse || courseFromParam;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            ...(breadcrumbCourse
              ? [
                  { label: "Kurzy", href: "/courses" },
                  {
                    label: breadcrumbCourse.name,
                    href: `/courses/${breadcrumbCourse.id}`,
                  },
                ]
              : [{ label: "Cíle", href: "/goals" }]),
            { label: isEdit ? "Upravit cíl" : "Nový cíl" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">
          {isEdit ? "Upravit vzdělávací cíl" : "Nový vzdělávací cíl"}
        </h1>

        <div className="space-y-6">
          {/* Course selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Kurz
            </label>
            <div className="flex flex-wrap gap-2">
              {courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Zatím nemáte žádné kurzy.
                </p>
              ) : (
                courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCourseId(c.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selectedCourseId === c.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
            {selectedCourse && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {classes.find((cl) => cl.id === selectedCourse.class_id)?.name}
                {selectedCourse.subjects?.name && ` · ${selectedCourse.subjects.name}`}
              </p>
            )}
            {!isEdit && allGoals.length > 0 && (
              <Button
                variant="outline"
                className="mt-2 gap-1"
                onClick={() => setCloneOpen(true)}
              >
                <Copy className="h-4 w-4" />
                Klonovat z existujícího cíle
              </Button>
            )}
          </div>

          {/* Title + AI generate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Název cíle
              </label>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleGenerate}
                disabled={generating || !title.trim()}
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {generating ? "Generuji..." : "Vytvořit pomocí AI"}
              </Button>
            </div>
            <ShimmerField shimmer={genPhase === "formulating"}>
              <Input
                placeholder="Např. Žák řeší slovní úlohy s násobením..."
                className="bg-card"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </ShimmerField>
            <p className="text-xs text-muted-foreground mt-1.5">
              Napište cíl svými slovy a klikněte na „Vytvořit pomocí AI" — formulace i kritéria se vygenerují automaticky.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Popis (volitelný)
            </label>
            <ShimmerField shimmer={genPhase === "formulating"} lines={2}>
              <Textarea
                placeholder="Podrobnější popis cíle..."
                className="min-h-[80px] bg-card"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </ShimmerField>
          </div>

          {/* Levels — shared across all criteria */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Úrovně hodnocení
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Úrovně popisují, kde se žák na cestě k cíli nachází.
            </p>
            <div className="space-y-2">
              {levels.map((ld, idx) => (
                <ShimmerField key={idx} shimmer={genPhase === "criteria"}>
                  <div className="flex items-start gap-2">
                    <Input
                      className="w-32 shrink-0 text-sm"
                      placeholder="Úroveň"
                      value={ld.level}
                      onChange={(e) => updateLevel(idx, "level", e.target.value)}
                    />
                    <Input
                      className="flex-1 text-sm"
                      placeholder="Co žák na této úrovni zvládá..."
                      value={ld.description}
                      onChange={(e) =>
                        updateLevel(idx, "description", e.target.value)
                      }
                    />
                    {levels.length > 1 && (
                      <button
                        onClick={() => removeLevel(idx)}
                        className="p-1.5 hover:bg-destructive/10 rounded shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </ShimmerField>
              ))}
              <button
                onClick={addLevel}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Přidat úroveň
              </button>
            </div>
          </div>

          {/* Criteria — simple text list */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Kritéria hodnocení
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Na co se při hodnocení zaměříte — co konkrétně pozorujete.
            </p>
            <div className="space-y-2">
              {criteriaTexts.map((text, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <ShimmerField shimmer={genPhase === "criteria"} className="flex-1">
                    <Input
                      placeholder="Popis kritéria..."
                      className="bg-card"
                      value={text}
                      onChange={(e) => updateCriterion(idx, e.target.value)}
                    />
                  </ShimmerField>
                  {criteriaTexts.length > 1 && (
                    <button
                      onClick={() => removeCriterion(idx)}
                      className="p-1.5 hover:bg-destructive/10 rounded shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addCriterion}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Přidat kritérium
              </Button>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending
              ? "Ukládání..."
              : isEdit
                ? "Uložit změny"
                : "Vytvořit cíl"}
          </Button>
        </div>

        {/* Clone dialog */}
        <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Klonovat existující cíl</DialogTitle>
            </DialogHeader>
            <SearchBar
              placeholder="Hledat cíl..."
              value={cloneSearch}
              onChange={setCloneSearch}
            />
            <div className="space-y-1 mt-2">
              {filteredCloneGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Žádné cíle nenalezeny.
                </p>
              ) : (
                filteredCloneGoals.map((g) => {
                  const cls = classes.find((c) => c.id === g.class_id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleClone(g.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="font-medium text-sm text-foreground">
                        {g.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {g.subjects?.name && (
                          <Badge variant="secondary" className="text-xs">
                            {g.subjects.name}
                          </Badge>
                        )}
                        {cls && (
                          <Badge variant="outline" className="text-xs">
                            {cls.name}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
