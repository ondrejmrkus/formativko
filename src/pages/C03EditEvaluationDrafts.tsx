import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { getStudentById, getStudentDisplayName } from "@/data/mockData";

type DraftStatus = "waiting" | "approved" | "insufficient";

const draftStudents: { id: string; status: DraftStatus }[] = [
  { id: "s1", status: "waiting" },
  { id: "s2", status: "approved" },
  { id: "s3", status: "waiting" },
  { id: "s4", status: "insufficient" },
  { id: "s5", status: "waiting" },
];

const statusConfig: Record<DraftStatus, { label: string; className: string }> = {
  waiting: {
    label: "Čeká na kontrolu",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  approved: {
    label: "Schváleno",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  insufficient: {
    label: "Nedostatek důkazů",
    className: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
};

const draftTexts: Record<string, string> = {
  s1: "Adam se v hodinách českého jazyka aktivně zapojuje do diskuzí a prokazuje dobré porozumění literárním textům. Jeho písemný projev se zlepšuje, ale stále je třeba pracovat na pravopisu.",
  s2: "Barbora je výborná studentka s vynikajícím písemným projevem. Její slohové práce jsou kreativní a gramaticky správné.",
  s3: "Cyril se v hodinách snaží, ale potřebuje více času na zpracování úkolů. Doporučuji individuální přístup.",
  s4: "Dana — nedostatek důkazů pro vytvoření hodnocení. Doporučuji doplnit záznamy z hodin.",
  s5: "Emil projevuje zájem o předmět, aktivně se hlásí. Jeho výsledky testů jsou nadprůměrné.",
};

export default function C03EditEvaluationDrafts() {
  const [selectedStudentId, setSelectedStudentId] = useState("s1");
  const selectedStudent = getStudentById(selectedStudentId)!;
  const selectedDraft = draftStudents.find((d) => d.id === selectedStudentId)!;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Hodnocení", href: "/evaluations" },
            { label: "Draft: Průběžné hodnocení 03/2026" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Draft: Průběžné hodnocení 03/2026</h1>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: student list */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="hidden lg:grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border mb-1">
              <span>Jméno žáka</span>
              <span>Stav</span>
            </div>
            <div className="space-y-1">
              {draftStudents.map((ds) => {
                const student = getStudentById(ds.id);
                if (!student) return null;
                const cfg = statusConfig[ds.status];
                return (
                  <button
                    key={ds.id}
                    onClick={() => setSelectedStudentId(ds.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      selectedStudentId === ds.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <span className="truncate">{getStudentDisplayName(student)}</span>
                    <Badge variant="outline" className={`text-[10px] shrink-0 whitespace-nowrap ${cfg.className}`}>
                      {cfg.label}
                    </Badge>
                  </button>
                );
              })}
            </div>

            <Button variant="outline" className="w-full mt-4" size="lg">
              Exportovat vše
            </Button>
          </div>

          {/* Right: editor */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">{getStudentDisplayName(selectedStudent)}</h2>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1">
                  <Check className="h-3.5 w-3.5" />
                  Schválit
                </Button>
                <Button size="sm" variant="outline" className="gap-1">
                  <Copy className="h-3.5 w-3.5" />
                  Zkopírovat text
                </Button>
              </div>
            </div>

            <Textarea
              className="min-h-[300px] bg-card"
              defaultValue={draftTexts[selectedStudentId] || ""}
              key={selectedStudentId}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
