import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useClasses, useClassStudents } from "@/hooks/useClasses";
import { useCreateEvaluationGroup, useCreateEvaluation } from "@/hooks/useEvaluations";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { useGoalsForClass } from "@/hooks/useGoals";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Sparkles, ChevronDown, RotateCcw, Code2 } from "lucide-react";

const evalTypes = [
  { id: "prubezna", label: "Průběžná zpětná vazba" },
  { id: "tripartita", label: "Tripartita" },
  { id: "vysvedceni", label: "Vysvědčení JINAK" },
  { id: "vlastni", label: "Vlastní" },
];

const toneOptions = [
  { id: "pratelsky", label: "Přátelský" },
  { id: "formalni", label: "Formální" },
];

const personOptions = [
  { id: "2", label: "2. osoba (dopis žákovi)" },
  { id: "3", label: "3. osoba (zpráva o žákovi)" },
];

const lengthOptions = [
  { id: "kratka", label: "Krátké (2–3 věty)" },
  { id: "stredni", label: "Střední (4–6 vět)" },
  { id: "dlouha", label: "Dlouhé (7–10 vět)" },
];

// Default output settings per evaluation type
const typeDefaults: Record<string, { tone: string; person: string; length: string }> = {
  prubezna: { tone: "pratelsky", person: "2", length: "kratka" },
  tripartita: { tone: "formalni", person: "3", length: "stredni" },
  vysvedceni: { tone: "formalni", person: "3", length: "dlouha" },
  vlastni: { tone: "pratelsky", person: "3", length: "stredni" },
};

const DEFAULT_SYSTEM_PROMPT = `Jsi profesionální pedagogický asistent a expert na formativní hodnocení. Tvým úkolem je vytvořit pro učitele návrh slovního hodnocení žáka. Tento text bude sloužit pouze jako draft, který učitel následně zkontroluje, upraví a převezme za něj finální zodpovědnost.

# Pravidla pro tvorbu textu (striktně dodržuj)

1. **Struktura a obsah:** Hodnocení musí posoudit výsledky žáka v jejich vývoji. Automaticky a vyváženě zapoj informace o silných stránkách, konkrétním pokroku a případných obtížích.

2. **Naznačení dalšího rozvoje:** Text musí obsahovat zdůvodnění a konkrétní, srozumitelná doporučení, jak předcházet případným neúspěchům a jak je překonávat.

3. **Oddělení chování od učení:** Nespojuj a nesměšuj hodnocení výsledků učení s hodnocením chování, snahy nebo aktivity. Vyvaruj se frází jako „málo se snažíš", „je pilný/á", „pracuje pomalu".

4. **Respektující a popisný jazyk:** Používej výhradně popisný jazyk zaměřený na proces a výsledky učení. Absolutně se vyvaruj hodnocení osobnosti žáka (např. „jsi roztržitý") a jakéhokoliv nálepkování (např. „jsi lajdák", „jsi pomalý").

5. **Bezpečné prostředí:** Text nesmí obsahovat sarkasmus, ironii ani srovnávání žáka s ostatními spolužáky. Nepoužívej hodnocení jako formu trestu nebo odměny závislé na pocitech učitele (např. „udělal jsi mi radost").

6. **Vazba na kritéria:** Zpětná vazba musí být opřena o dodaná kritéria a důkazy o učení. Vyhni se obecným a prázdným frázím (např. „skvělé", „mohlo by to být lepší"). Každé tvrzení musí být podloženo konkrétním důkazem.`;

export default function C02aCreateEvaluationDraft() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: classes = [] } = useClasses();
  const createGroup = useCreateEvaluationGroup();
  const createEval = useCreateEvaluation();

  // Restore state if coming back from C02b
  const restored = location.state as any;

  const [selectedType, setSelectedType] = useState<string | null>(restored?.selectedType || null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(restored?.selectedClassId || null);
  const [dateFrom, setDateFrom] = useState(restored?.dateFrom || "2026-01-01");
  const [dateTo, setDateTo] = useState(restored?.dateTo || "2026-03-17");
  const [preferences, setPreferences] = useState(restored?.preferences || "");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(restored?.selectedStudentId || null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(restored?.selectedGoalId || null);
  const [generating, setGenerating] = useState(false);

  // Output options with defaults from evalType
  const defaults = typeDefaults[selectedType || "vlastni"] || typeDefaults.vlastni;
  const [tone, setTone] = useState<string>(restored?.tone || defaults.tone);
  const [person, setPerson] = useState<string>(restored?.person || defaults.person);
  const [evalLength, setEvalLength] = useState<string>(restored?.evalLength || defaults.length);
  const [outputOpen, setOutputOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptOpen, setPromptOpen] = useState(false);
  const systemPromptModified = systemPrompt !== DEFAULT_SYSTEM_PROMPT;

  // Update defaults when type changes
  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId);
    const d = typeDefaults[typeId] || typeDefaults.vlastni;
    setTone(d.tone);
    setPerson(d.person);
    setEvalLength(d.length);
  };

  const { data: classStudents = [] } = useClassStudents(selectedClassId || undefined);
  const { data: classGoals = [] } = useGoalsForClass(selectedClassId || undefined);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const handleGenerate = async () => {
    if (!selectedType || !selectedClassId || !selectedStudentId) {
      toast({ title: "Vyberte typ, třídu a žáka.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const typeName = evalTypes.find((t) => t.id === selectedType)?.label || selectedType;
      const groupName = `${typeName} – ${selectedClass?.name || ""} (${dateFrom} – ${dateTo})`;

      // Create evaluation group
      const group = await createGroup.mutateAsync({
        name: groupName,
        type: selectedType,
        classId: selectedClassId,
        dateFrom,
        dateTo,
      });

      // Generate evaluation for the selected student
      const student = classStudents.find((s: any) => s.id === selectedStudentId) as any;
      if (!student) throw new Error("Student not found");

      const { data, error } = await supabase.functions.invoke("generate-evaluation", {
        body: {
          studentId: student.id,
          evalType: selectedType,
          dateFrom,
          dateTo,
          preferences: preferences.trim() || null,
          goalId: selectedGoalId || null,
          className: selectedClass?.name || null,
          tone,
          person,
          length: evalLength,
          customSystemPrompt: systemPromptModified ? systemPrompt : null,
        },
      });

      if (error) throw error;

      const noProofs = data?.noProofs === true;
      const text = noProofs ? "" : (data?.text || "");
      const sourceProofs = data?.sourceProofs || [];
      const sourceProofIds = sourceProofs.map((p: any) => p.id);
      const period = `${dateFrom} – ${dateTo}`;
      const status = noProofs ? "insufficient" : "waiting";

      const evaluation = await createEval.mutateAsync({
        studentId: student.id,
        groupId: group.id,
        subject: typeName,
        period,
        text,
        status,
        goalId: selectedGoalId,
        sourceProofIds,
      });

      // Navigate to C02b with all context
      navigate("/evaluations/create/preview", {
        state: {
          groupId: group.id,
          evaluationId: evaluation.id,
          studentName: getStudentDisplayName(student),
          text,
          noProofs,
          sourceProofs,
          subject: typeName,
          period,
          // Params to pass back if teacher wants to retry
          selectedType,
          selectedClassId,
          selectedStudentId: student.id,
          selectedGoalId,
          dateFrom,
          dateTo,
          preferences,
          className: selectedClass?.name,
          totalStudents: classStudents.length,
          tone,
          person,
          evalLength,
          customSystemPrompt: systemPromptModified ? systemPrompt : null,
        },
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Chyba při generování", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Hodnocení", href: "/evaluations" },
            { label: "Tvorba hodnocení" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Tvorba hodnocení</h1>

        <div className="space-y-6">
          {/* System prompt editor */}
          <Collapsible open={promptOpen} onOpenChange={setPromptOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
              <Code2 className="h-3.5 w-3.5" />
              Systémový prompt
              {systemPromptModified && (
                <span className="text-[10px] normal-case tracking-normal font-normal px-1.5 py-0.5 rounded bg-primary/10 text-primary">upraveno</span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${promptOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Toto jsou instrukce pro AI model, který generuje hodnocení. Úpravy platí pouze pro tuto relaci.
                </p>
                <Textarea
                  className="min-h-[300px] bg-background font-mono text-xs leading-relaxed"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
                {systemPromptModified && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Obnovit výchozí
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Step 1: Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Typ hodnocení
            </label>
            <div className="grid grid-cols-2 gap-2">
              {evalTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
                  className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                    selectedType === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Period */}
          {selectedType && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Vyberte období
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Od</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-card" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Do</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-card" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Class */}
          {selectedType && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Vyberte třídu
              </label>
              <div className="flex flex-wrap gap-2">
                {classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Zatím nemáte žádné třídy.</p>
                ) : (
                  classes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedClassId(c.id);
                        setSelectedStudentId(null);
                      }}
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
          )}

          {/* Step 4: Student picker */}
          {selectedClassId && classStudents.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Vyberte žáka pro zkušební koncept
              </label>
              <div className="flex flex-wrap gap-2">
                {classStudents.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selectedStudentId === s.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {getStudentDisplayName(s)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Goal (optional) */}
          {selectedStudentId && classGoals.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Vzdělávací cíl (volitelné)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedGoalId(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    selectedGoalId === null
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  Bez cíle
                </button>
                {classGoals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGoalId(g.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                      selectedGoalId === g.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {g.title}
                    {g.subjects?.name && <span className="text-xs ml-1 opacity-60">({g.subjects.name})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Preferences */}
          {selectedStudentId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Pokyny pro hodnocení (volitelné)
              </label>
              <Textarea
                className="min-h-[100px] bg-card"
                placeholder="Např. zaměřte se na pokrok žáka, používejte pozitivní formulace..."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
              />
            </div>
          )}

          {/* Step 7: Output options */}
          {selectedStudentId && (
            <Collapsible open={outputOpen} onOpenChange={setOutputOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-full">
                Nastavení výstupu
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${outputOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-4">
                {/* Tone */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Tón</label>
                  <div className="flex gap-2">
                    {toneOptions.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setTone(o.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                          tone === o.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Person */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Forma</label>
                  <div className="flex flex-wrap gap-2">
                    {personOptions.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setPerson(o.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                          person === o.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Length */}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">Rozsah</label>
                  <div className="flex flex-wrap gap-2">
                    {lengthOptions.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setEvalLength(o.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                          evalLength === o.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Generate button */}
          {selectedStudentId && (
            <div>
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generuji zkušební koncept…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Vygenerovat zkušební koncept
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
