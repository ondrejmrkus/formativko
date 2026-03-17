import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useEvaluationsByGroup, useEvaluationGroups, useUpdateEvaluation } from "@/hooks/useEvaluations";
import { useStudents, getStudentDisplayName } from "@/hooks/useStudents";
import { useToast } from "@/hooks/use-toast";

type DraftStatus = "waiting" | "approved" | "insufficient";

const statusConfig: Record<DraftStatus, { label: string; className: string }> = {
  waiting: { label: "Čeká na kontrolu", className: "bg-destructive/10 text-destructive border-destructive/30" },
  approved: { label: "Schváleno", className: "bg-green-100 text-green-700 border-green-300" },
  insufficient: { label: "Nedostatek důkazů", className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
};

export default function C03EditEvaluationDrafts() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: groups = [] } = useEvaluationGroups();
  const { data: evaluations = [], isLoading } = useEvaluationsByGroup(id);
  const { data: allStudents = [] } = useStudents();
  const updateEval = useUpdateEvaluation();

  const group = groups.find((g) => g.id === id);
  const [selectedEvalId, setSelectedEvalId] = useState<string | null>(null);
  const [localTexts, setLocalTexts] = useState<Record<string, string>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, DraftStatus>>({});

  const activeEvalId = selectedEvalId || evaluations[0]?.id;
  const activeEval = evaluations.find((e) => e.id === activeEvalId);

  const getStudent = (studentId: string) => allStudents.find((s) => s.id === studentId);

  const getText = (evalId: string) => {
    if (localTexts[evalId] !== undefined) return localTexts[evalId];
    const e = evaluations.find((ev) => ev.id === evalId);
    return e?.text || "";
  };

  const getStatus = (evalId: string): DraftStatus => {
    if (localStatuses[evalId]) return localStatuses[evalId];
    const e = evaluations.find((ev) => ev.id === evalId);
    const s = e?.status || "waiting";
    if (s === "approved") return "approved";
    if (s === "insufficient") return "insufficient";
    return "waiting";
  };

  const handleApprove = async () => {
    if (!activeEvalId) return;
    setLocalStatuses((prev) => ({ ...prev, [activeEvalId]: "approved" }));
    try {
      await updateEval.mutateAsync({ id: activeEvalId, text: getText(activeEvalId), status: "approved" });
      const student = activeEval ? getStudent(activeEval.student_id) : null;
      toast({ title: `Hodnocení pro ${student ? getStudentDisplayName(student) : "žáka"} schváleno` });
    } catch {
      toast({ title: "Chyba při schvalování", variant: "destructive" });
    }
  };

  const handleSaveText = async () => {
    if (!activeEvalId) return;
    try {
      await updateEval.mutateAsync({ id: activeEvalId, text: getText(activeEvalId) });
      toast({ title: "Text uložen" });
    } catch {
      toast({ title: "Chyba při ukládání", variant: "destructive" });
    }
  };

  const handleCopy = () => {
    if (!activeEvalId) return;
    navigator.clipboard.writeText(getText(activeEvalId));
    toast({ title: "Text zkopírován do schránky" });
  };

  const handleExportAll = () => {
    const allText = evaluations.map((ev) => {
      const student = getStudent(ev.student_id);
      const name = student ? getStudentDisplayName(student) : ev.student_id;
      return `${name}\n${getText(ev.id)}\n`;
    }).join("\n---\n\n");
    navigator.clipboard.writeText(allText);
    toast({ title: "Všechna hodnocení zkopírována do schránky" });
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Hodnocení", href: "/evaluations" },
            { label: group ? `Draft: ${group.name}` : "Draft" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">{group ? `Draft: ${group.name}` : "Draft hodnocení"}</h1>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Načítání…</div>
        ) : evaluations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Žádná hodnocení v této skupině.</div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-72 shrink-0">
              <div className="hidden lg:grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border mb-1">
                <span>Jméno žáka</span>
                <span>Stav</span>
              </div>
              <div className="space-y-1">
                {evaluations.map((ev) => {
                  const student = getStudent(ev.student_id);
                  const status = getStatus(ev.id);
                  const cfg = statusConfig[status];
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEvalId(ev.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        activeEvalId === ev.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"
                      }`}
                    >
                      <span className="truncate">{student ? getStudentDisplayName(student) : ev.student_id}</span>
                      <Badge variant="outline" className={`text-[10px] shrink-0 whitespace-nowrap ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              <Button variant="outline" className="w-full mt-4" size="lg" onClick={handleExportAll}>
                Exportovat vše
              </Button>
            </div>

            <div className="flex-1 min-w-0">
              {activeEval && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-lg">
                      {(() => { const s = getStudent(activeEval.student_id); return s ? getStudentDisplayName(s) : activeEval.student_id; })()}
                    </h2>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleSaveText}>
                        Uložit text
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={handleApprove}
                        disabled={getStatus(activeEvalId!) === "approved"}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {getStatus(activeEvalId!) === "approved" ? "Schváleno" : "Schválit"}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={handleCopy}>
                        <Copy className="h-3.5 w-3.5" />
                        Kopírovat
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    className="min-h-[300px] bg-card"
                    value={getText(activeEvalId!)}
                    onChange={(e) => setLocalTexts((prev) => ({ ...prev, [activeEvalId!]: e.target.value }))}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
