import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, Trash2, GripVertical, Copy, Sparkles, Loader2, Check, X } from "lucide-react";
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
import { useSubjects, useCreateSubject } from "@/hooks/useSubjects";
import { useCourse } from "@/hooks/useCourses";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_LEVEL_DESCRIPTORS, type LevelDescriptor } from "@/constants/goalLevels";

interface CriterionForm {
  description: string;
  level_descriptors: LevelDescriptor[];
}

export default function G03CreateGoal() {
  const { goalId } = useParams<{ goalId: string }>();
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  const isEdit = !!goalId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: classes = [] } = useClasses();
  const { data: courseContext } = useCourse(courseIdParam || undefined);
  const { data: existingGoal } = useGoal(isEdit ? goalId : undefined);
  const { data: allGoals = [] } = useGoals();
  const { data: subjects = [] } = useSubjects();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const createSubject = useCreateSubject();

  const [generatingCriteria, setGeneratingCriteria] = useState(false);
  const [formulatingGoal, setFormulatingGoal] = useState(false);
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null);
  const [suggestedDescription, setSuggestedDescription] = useState<string | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneSearch, setCloneSearch] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState<CriterionForm[]>([
    { description: "", level_descriptors: DEFAULT_LEVEL_DESCRIPTORS.map((d) => ({ ...d })) },
  ]);

  // Pre-fill from course context
  useEffect(() => {
    if (courseContext && !isEdit) {
      setSelectedClassId(courseContext.class_id);
      setSelectedSubjectId(courseContext.subject_id);
    }
  }, [courseContext, isEdit]);

  // Populate form when editing
  useEffect(() => {
    if (existingGoal) {
      setSelectedClassId(existingGoal.class_id);
      setSelectedSubjectId(existingGoal.subject_id);
      setTitle(existingGoal.title);
      setDescription(existingGoal.description);
      if (existingGoal.evaluation_criteria.length > 0) {
        setCriteria(
          existingGoal.evaluation_criteria.map((c) => ({
            description: c.description,
            level_descriptors: (c.level_descriptors || []).map((ld) => ({ ...ld })),
          }))
        );
      }
    }
  }, [existingGoal]);

  const addCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      { description: "", level_descriptors: DEFAULT_LEVEL_DESCRIPTORS.map((d) => ({ ...d })) },
    ]);
  };

  const removeCriterion = (index: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCriterionDesc = (index: number, value: string) => {
    setCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, description: value } : c)));
  };

  const updateLevelDesc = (criterionIdx: number, levelIdx: number, value: string) => {
    setCriteria((prev) =>
      prev.map((c, ci) =>
        ci === criterionIdx
          ? {
              ...c,
              level_descriptors: c.level_descriptors.map((ld, li) =>
                li === levelIdx ? { ...ld, description: value } : ld
              ),
            }
          : c
      )
    );
  };

  const updateLevelName = (criterionIdx: number, levelIdx: number, value: string) => {
    setCriteria((prev) =>
      prev.map((c, ci) =>
        ci === criterionIdx
          ? {
              ...c,
              level_descriptors: c.level_descriptors.map((ld, li) =>
                li === levelIdx ? { ...ld, level: value } : ld
              ),
            }
          : c
      )
    );
  };

  const addLevel = (criterionIdx: number) => {
    setCriteria((prev) =>
      prev.map((c, ci) =>
        ci === criterionIdx
          ? { ...c, level_descriptors: [...c.level_descriptors, { level: "", description: "" }] }
          : c
      )
    );
  };

  const removeLevel = (criterionIdx: number, levelIdx: number) => {
    setCriteria((prev) =>
      prev.map((c, ci) =>
        ci === criterionIdx
          ? { ...c, level_descriptors: c.level_descriptors.filter((_, li) => li !== levelIdx) }
          : c
      )
    );
  };

  const handleFormulateGoal = async () => {
    if (!title.trim()) {
      toast({ title: "Nejdříve napište cíl svými slovy", variant: "destructive" });
      return;
    }

    setFormulatingGoal(true);
    setSuggestedTitle(null);
    setSuggestedDescription(null);
    try {
      const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
      const selectedClass = classes.find((c) => c.id === selectedClassId);
      const { data, error } = await supabase.functions.invoke("formulate-goal", {
        body: {
          rawGoal: title.trim(),
          subject: selectedSubject?.name || undefined,
          className: selectedClass?.name || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.title) setSuggestedTitle(data.title);
      if (data.description) setSuggestedDescription(data.description);
    } catch (err: any) {
      console.error("Formulate goal error:", err);
      toast({ title: "Chyba při formulaci", description: err?.message, variant: "destructive" });
    } finally {
      setFormulatingGoal(false);
    }
  };

  const handleGenerateCriteria = async () => {
    if (!title.trim()) {
      toast({ title: "Nejdříve zadejte název cíle", variant: "destructive" });
      return;
    }

    setGeneratingCriteria(true);
    try {
      // Collect existing level names if user has customized them (not just defaults)
      const existingLevels = criteria[0]?.level_descriptors
        ?.map((ld) => ld.level)
        .filter((l) => l.trim());
      const defaultNames = DEFAULT_LEVEL_DESCRIPTORS.map((d) => d.level);
      const isDefaultLevels =
        existingLevels?.length === defaultNames.length &&
        existingLevels.every((l, i) => l === defaultNames[i]);
      const hasThematicPlan = !!courseContext?.thematic_plan_file_url;
      // Don't send default level names when a thematic plan exists — let the AI extract levels from the plan
      const sendLevelNames =
        existingLevels && existingLevels.length > 0 && (!hasThematicPlan || !isDefaultLevels);

      const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

      const selectedClass = classes.find((c) => c.id === selectedClassId);
      const { data, error } = await supabase.functions.invoke("generate-criteria", {
        body: {
          goalTitle: title.trim(),
          goalDescription: description.trim() || undefined,
          subject: selectedSubject?.name || undefined,
          levelNames: sendLevelNames ? existingLevels : undefined,
          className: selectedClass?.name || undefined,
          thematicPlanFileUrl: hasThematicPlan ? courseContext.thematic_plan_file_url : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data.criteria && data.criteria.length > 0) {
        setCriteria(
          data.criteria.map((c: any) => ({
            description: c.description || "",
            level_descriptors: (c.level_descriptors || []).map((ld: any) => ({
              level: ld.level || "",
              description: ld.description || "",
            })),
          }))
        );
        toast({ title: "Kritéria vygenerována" });
      }
    } catch (err: any) {
      console.error("Generate criteria error:", err);
      toast({ title: "Chyba při generování", description: err?.message, variant: "destructive" });
    } finally {
      setGeneratingCriteria(false);
    }
  };

  const handleClone = async (goalId: string) => {
    try {
      const { data, error } = await supabase
        .from("educational_goals")
        .select("*, evaluation_criteria(*)")
        .eq("id", goalId)
        .single();
      if (error) throw error;
      setSelectedSubjectId(data.subject_id);
      setTitle(data.title);
      setDescription(data.description || "");
      const crit = (data.evaluation_criteria || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order);
      if (crit.length > 0) {
        setCriteria(
          crit.map((c: any) => ({
            description: c.description,
            level_descriptors: (c.level_descriptors || []).map((ld: any) => ({ ...ld })),
          }))
        );
      }
      setCloneOpen(false);
      toast({ title: "Cíl naklonován do formuláře" });
    } catch {
      toast({ title: "Chyba při klonování", variant: "destructive" });
    }
  };

  const filteredCloneGoals = allGoals.filter((g) => {
    if (!cloneSearch.trim()) return true;
    const q = cloneSearch.toLowerCase();
    return g.title.toLowerCase().includes(q) || (g.subjects?.name || "").toLowerCase().includes(q);
  });

  const handleSave = async () => {
    if (!selectedClassId) {
      toast({ title: "Vyberte třídu", variant: "destructive" });
      return;
    }
    if (!selectedSubjectId) {
      toast({ title: "Vyberte předmět", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Zadejte název cíle", variant: "destructive" });
      return;
    }

    const validCriteria = criteria
      .filter((c) => c.description.trim())
      .map((c, i) => ({
        description: c.description.trim(),
        level_descriptors: c.level_descriptors.filter((ld) => ld.level.trim()),
        sort_order: i,
      }));

    try {
      if (isEdit) {
        await updateGoal.mutateAsync({
          id: goalId!,
          classId: selectedClassId,
          title: title.trim(),
          description: description.trim(),
          subjectId: selectedSubjectId,
          criteria: validCriteria,
          courseId: courseIdParam ?? existingGoal?.course_id ?? null,
        });
        toast({ title: "Cíl upraven" });
        navigate(`/goals/${goalId}`);
      } else {
        const goal = await createGoal.mutateAsync({
          classId: selectedClassId,
          title: title.trim(),
          description: description.trim(),
          subjectId: selectedSubjectId,
          criteria: validCriteria,
          courseId: courseIdParam,
        });
        toast({ title: "Cíl vytvořen" });
        navigate("/");
      }
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const isPending = createGoal.isPending || updateGoal.isPending;

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
              : [{ label: "Cíle", href: "/goals" }]),
            { label: isEdit ? "Upravit cíl" : "Nový cíl" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">{isEdit ? "Upravit vzdělávací cíl" : "Nový vzdělávací cíl"}</h1>

        <div className="space-y-6">
          {/* Class selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Třída
            </label>
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
            {!isEdit && allGoals.length > 0 && (
              <Button variant="outline" className="mt-2 gap-1" onClick={() => setCloneOpen(true)}>
                <Copy className="h-4 w-4" />
                Klonovat z existujícího cíle
              </Button>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Předmět
            </label>
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Název cíle
              </label>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleFormulateGoal}
                disabled={formulatingGoal || !title.trim()}
              >
                {formulatingGoal ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {formulatingGoal ? "Formuluji..." : "Formulovat pomocí AI"}
              </Button>
            </div>
            <Input
              placeholder="Např. Žák řeší slovní úlohy s násobením..."
              className="bg-card"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {suggestedTitle && (
              <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-primary">Navrhovaný název:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setTitle(suggestedTitle); setSuggestedTitle(null); }}
                      className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                      title="Přijmout"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSuggestedTitle(null)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground transition-colors"
                      title="Odmítnout"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm">{suggestedTitle}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Popis (volitelný)
            </label>
            <Textarea
              placeholder="Podrobnější popis cíle..."
              className="min-h-[80px] bg-card"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {suggestedDescription && (
              <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-primary">Navrhovaný popis:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setDescription(suggestedDescription); setSuggestedDescription(null); }}
                      className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                      title="Přijmout"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSuggestedDescription(null)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground transition-colors"
                      title="Odmítnout"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm">{suggestedDescription}</p>
              </div>
            )}
          </div>

          {/* Criteria */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Kritéria hodnocení
              </label>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleGenerateCriteria}
                disabled={generatingCriteria || !title.trim()}
              >
                {generatingCriteria ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {generatingCriteria ? "Generuji..." : "Vygenerovat pomocí AI"}
              </Button>
            </div>
            <div className="space-y-4">
              {criteria.map((criterion, cIdx) => (
                <div key={cIdx} className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground/30 mt-2 shrink-0" />
                    <div className="flex-1">
                      <Input
                        placeholder="Popis kritéria..."
                        value={criterion.description}
                        onChange={(e) => updateCriterionDesc(cIdx, e.target.value)}
                      />
                    </div>
                    {criteria.length > 1 && (
                      <button
                        onClick={() => removeCriterion(cIdx)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg shrink-0"
                        title="Odebrat kritérium"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    )}
                  </div>

                  {/* Level descriptors */}
                  <div className="ml-7 space-y-2">
                    <span className="text-xs text-muted-foreground">Úrovně:</span>
                    {criterion.level_descriptors.map((ld, lIdx) => (
                      <div key={lIdx} className="flex items-start gap-2">
                        <Input
                          className="w-32 shrink-0 text-sm"
                          placeholder="Úroveň"
                          value={ld.level}
                          onChange={(e) => updateLevelName(cIdx, lIdx, e.target.value)}
                        />
                        <Input
                          className="flex-1 text-sm"
                          placeholder="Popis úrovně..."
                          value={ld.description}
                          onChange={(e) => updateLevelDesc(cIdx, lIdx, e.target.value)}
                        />
                        {criterion.level_descriptors.length > 1 && (
                          <button
                            onClick={() => removeLevel(cIdx, lIdx)}
                            className="p-1 hover:bg-destructive/10 rounded shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addLevel(cIdx)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Přidat úroveň
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addCriterion} className="gap-1">
                <Plus className="h-4 w-4" />
                Přidat kritérium
              </Button>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handleSave} disabled={isPending}>
            {isPending ? "Ukládání..." : isEdit ? "Uložit změny" : "Vytvořit cíl"}
          </Button>
        </div>

        {/* Clone dialog */}
        <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Klonovat existující cíl</DialogTitle>
            </DialogHeader>
            <SearchBar placeholder="Hledat cíl..." value={cloneSearch} onChange={setCloneSearch} />
            <div className="space-y-1 mt-2">
              {filteredCloneGoals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Žádné cíle nenalezeny.</p>
              ) : (
                filteredCloneGoals.map((g) => {
                  const cls = classes.find((c) => c.id === g.class_id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleClone(g.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <span className="font-medium text-sm text-foreground">{g.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {g.subjects?.name && <Badge variant="secondary" className="text-xs">{g.subjects.name}</Badge>}
                        {cls && <Badge variant="outline" className="text-xs">{cls.name}</Badge>}
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
