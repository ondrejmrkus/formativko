import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClasses, useClassStudents } from "@/hooks/useClasses";
import { useCreateEvaluationGroup, useCreateEvaluation } from "@/hooks/useEvaluations";
import { getStudentDisplayName } from "@/hooks/useStudents";
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
  const { toast } = useToast();
  const { data: classes = [] } = useClasses();
  const createGroup = useCreateEvaluationGroup();
  const createEval = useCreateEvaluation();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-17");
  const [preferences, setPreferences] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  const { data: classStudents = [] } = useClassStudents(selectedClassId || undefined);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const handleGenerate = async () => {
    if (!selectedType || !selectedClassId || classStudents.length === 0) {
      toast({ title: "Vyberte typ, třídu a ujistěte se, že třída má žáky.", variant: "destructive" });
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

      // Generate evaluations for each student
      for (let i = 0; i < classStudents.length; i++) {
        const student = classStudents[i] as any;
        setProgress(`Generuji hodnocení pro ${getStudentDisplayName(student)} (${i + 1}/${classStudents.length})…`);

        try {
          const { data, error } = await supabase.functions.invoke("generate-evaluation", {
            body: {
              studentId: student.id,
              evalType: selectedType,
              dateFrom,
              dateTo,
              preferences: preferences.trim() || null,
            },
          });

          if (error) throw error;

          const text = data?.text || "Nepodařilo se vygenerovat hodnocení.";
          const period = `${dateFrom} – ${dateTo}`;

          await createEval.mutateAsync({
            studentId: student.id,
            groupId: group.id,
            subject: typeName,
            period,
            text,
          });
        } catch (e: any) {
          console.error(`Error generating for ${student.id}:`, e);
          // Still create evaluation with error message
          await createEval.mutateAsync({
            studentId: student.id,
            groupId: group.id,
            subject: typeName,
            period: `${dateFrom} – ${dateTo}`,
            text: `[Chyba při generování: ${e?.message || "neznámá chyba"}]`,
          });
        }
      }

      toast({ title: "Hodnocení vygenerována!", description: `${classStudents.length} konceptů vytvořeno.` });
      navigate(`/evaluations/edit/${group.id}`);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Chyba při generování", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
      setProgress("");
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
              {selectedClassId && (
                <p className="text-xs text-muted-foreground mt-2">
                  {classStudents.length} žáků ve třídě
                </p>
              )}
            </div>
          )}

          {selectedClassId && (
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

          {selectedClassId && classStudents.length > 0 && (
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
                    Generuji…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Vygenerovat hodnocení AI ({classStudents.length} žáků)
                  </>
                )}
              </Button>
              {progress && (
                <p className="text-sm text-muted-foreground text-center mt-3">{progress}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
