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
import { Loader2, Sparkles } from "lucide-react";

const evalTypes = [
  { id: "prubezna", label: "Průběžná zpětná vazba" },
  { id: "tripartita", label: "Tripartita" },
  { id: "vysvedceni", label: "Vysvědčení JINAK" },
  { id: "vlastni", label: "Vlastní" },
];

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
        },
      });

      if (error) throw error;

      const noProofs = data?.noProofs === true;
      const text = noProofs ? "" : (data?.text || "");
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
      });

      // Navigate to C02b with all context
      navigate("/evaluations/create/preview", {
        state: {
          groupId: group.id,
          evaluationId: evaluation.id,
          studentName: getStudentDisplayName(student),
          text,
          noProofs,
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
          {/* Step 1: Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
              Typ hodnocení
            </label>
            <div className="grid grid-cols-2 gap-2">
              {evalTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
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
                Preference pro hodnocení (volitelné)
              </label>
              <Textarea
                className="min-h-[100px] bg-card"
                placeholder="Např. zaměřte se na pokrok žáka, používejte pozitivní formulace..."
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
              />
            </div>
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
