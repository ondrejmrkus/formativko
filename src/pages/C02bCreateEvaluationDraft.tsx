import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useClassStudents } from "@/hooks/useClasses";
import { useCreateEvaluation, useUpdateEvaluation } from "@/hooks/useEvaluations";
import { getStudentDisplayName } from "@/hooks/useStudents";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";

export default function C02bCreateEvaluationDraft() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const createEval = useCreateEvaluation();
  const updateEval = useUpdateEvaluation();

  const state = location.state as any;

  const {
    groupId, evaluationId, studentName, text: initialText, noProofs,
    subject, period,
    selectedType, selectedClassId, selectedStudentId, selectedGoalId,
    dateFrom, dateTo, preferences, className, totalStudents,
    tone, person, evalLength, customSystemPrompt,
  } = state || {};

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
    navigate("/evaluations/create", {
      state: {
        selectedType,
        selectedClassId,
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

          await createEval.mutateAsync({
            studentId: student.id,
            groupId,
            subject,
            period,
            text: evalText,
            status: evalStatus,
            goalId: selectedGoalId,
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

            <Textarea
              className="min-h-[280px] lg:min-h-[400px] bg-background"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={noProofs ? "Žádné hodnocení — nedostatek důkazů o učení." : ""}
            />
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
