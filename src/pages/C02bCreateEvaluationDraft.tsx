import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShimmerField } from "@/components/ui/field-shimmer";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useClassStudents } from "@/hooks/useClasses";
import { useCreateEvaluation, useUpdateEvaluation } from "@/hooks/useEvaluations";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, ArrowRight, AlertTriangle, FileSearch } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function C02bCreateEvaluationDraft() {
  usePageTitle("Náhled konceptu");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const createEval = useCreateEvaluation();
  const updateEval = useUpdateEvaluation();

  // Read from location.state first, fall back to sessionStorage on page refresh
  const state = (location.state as any) || (() => {
    try {
      const stored = sessionStorage.getItem("evalPreviewState");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  })();

  const {
    groupId, evaluationId, studentName, text: initialText, noProofs,
    sourceProofs: initialSourceProofs,
    subject, period,
    selectedType, selectedCourseId, selectedClassId, selectedStudentId, selectedGoalId,
    dateFrom, dateTo, preferences, className, totalStudents,
    tone, person, evalLength, customSystemPrompt,
  } = state || {};

  interface SourceProof { id: string; title: string; type: string; date: string; }
  const [sourceProofs] = useState<SourceProof[]>(initialSourceProofs || []);

  const [draftText, setDraftText] = useState(initialText || "");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");

  const { data: classStudents = [] } = useClassStudents(selectedClassId || undefined);
  const remainingStudents = classStudents.filter((s: any) => s.id !== selectedStudentId);

  // If no state, show fallback
  if (!groupId) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-muted-foreground mb-4">Chybí data pro náhled.</p>
          <Button variant="outline" onClick={() => navigate("/evaluations/create")}>
            Zpět na tvorbu hodnocení
          </Button>
        </div>
      </AppLayout>
    );
  }

  const handleBack = () => {
    sessionStorage.removeItem("evalPreviewState");
    navigate("/evaluations/create", {
      state: {
        selectedType,
        selectedCourseId,
        selectedStudentId,
        dateFrom,
        dateTo,
        preferences,
        tone,
        person,
        evalLength,
      },
    });
  };

  const handleContinueForAll = async () => {
    if (remainingStudents.length === 0) {
      if (draftText !== initialText) {
        await updateEval.mutateAsync({ id: evaluationId, text: draftText });
      }
      navigate(`/evaluations/edit/${groupId}`);
      return;
    }

    setGenerating(true);
    try {
      if (draftText !== initialText) {
        await updateEval.mutateAsync({ id: evaluationId, text: draftText });
      }

      for (let i = 0; i < remainingStudents.length; i++) {
        const student = remainingStudents[i] as any;
        setProgress(`Generuji hodnocení pro ${getStudentDisplayName(student)} (${i + 1}/${remainingStudents.length})…`);

        try {
          const { data, error } = await supabase.functions.invoke("generate-evaluation", {
            body: {
              studentId: student.id,
              evalType: selectedType,
              dateFrom,
              dateTo,
              preferences: preferences?.trim() || null,
              goalId: selectedGoalId || null,
              className: className || null,
              tone: tone || null,
              person: person || null,
              length: evalLength || null,
              customSystemPrompt: customSystemPrompt || null,
            },
          });

          if (error) throw error;

          const studentNoProofs = data?.noProofs === true;
          const evalText = studentNoProofs ? "" : (data?.text || "");
          const evalStatus = studentNoProofs ? "insufficient" : "waiting";
          const evalSourceProofIds = (data?.sourceProofs || []).map((p: any) => p.id);

          await createEval.mutateAsync({
            studentId: student.id,
            groupId,
            subject,
            period,
            text: evalText,
            status: evalStatus,
            goalId: selectedGoalId,
            sourceProofIds: evalSourceProofIds,
          });
        } catch (e: any) {
          console.error(`Error generating for ${student.id}:`, e);
          await createEval.mutateAsync({
            studentId: student.id,
            groupId,
            subject,
            period,
            text: `[Chyba při generování: ${e?.message || "neznámá chyba"}]`,
          });
        }
      }

      toast({ title: "Hodnocení vygenerována!", description: `${totalStudents} konceptů celkem.` });
      sessionStorage.removeItem("evalPreviewState");
      navigate(`/evaluations/edit/${groupId}`);
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
            { label: "Tvorba hodnocení", href: "/evaluations/create" },
            { label: "Náhled konceptu" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Náhled konceptu</h1>
        <p className="text-muted-foreground mb-6">
          Zkontrolujte vygenerované hodnocení a rozhodněte se, zda pokračovat.
        </p>

        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-card border border-border">
            <h2 className="font-semibold mb-1">{studentName}</h2>
            <p className="text-xs text-muted-foreground mb-3">{subject} · {period}</p>

            {noProofs && (
              <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Žák nemá žádné důkazy o učení v daném období. Hodnocení nebylo vygenerováno.</span>
              </div>
            )}

            <ShimmerField shimmer={generating} lines={6}>
              <Textarea
                className="min-h-[280px] lg:min-h-[400px] bg-background"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder={noProofs ? "Žádné hodnocení — nedostatek důkazů o učení." : ""}
              />
            </ShimmerField>

            {sourceProofs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                  <FileSearch className="h-3.5 w-3.5" />
                  Podklady ({sourceProofs.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sourceProofs.map((p) => (
                    <a
                      key={p.id}
                      href={`/student-profiles/${selectedStudentId}/proof/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 text-foreground transition-colors"
                      title={`${p.title} (${p.date})`}
                    >
                      <span className="truncate max-w-[180px]">{p.title}</span>
                      <span className="text-muted-foreground shrink-0">{p.date}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              size="lg"
              onClick={handleBack}
              disabled={generating}
            >
              <ArrowLeft className="h-4 w-4" />
              Zpět k nastavení
            </Button>
            <Button
              className="flex-1 gap-2"
              size="lg"
              onClick={handleContinueForAll}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generuji…
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Pokračovat pro celou třídu ({remainingStudents.length})
                </>
              )}
            </Button>
          </div>

          {progress && (
            <p className="text-sm text-muted-foreground text-center">{progress}</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
