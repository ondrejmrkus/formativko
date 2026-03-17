import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
import { useState } from "react";
import { useClasses } from "@/hooks/useClasses";

const evalTypes = [
  { id: "prubezna", label: "Průběžná zpětná vazba" },
  { id: "tripartita", label: "Tripartita" },
  { id: "vysvedceni", label: "Vysvědčení JINAK" },
  { id: "vlastni", label: "Vlastní" },
];

export default function C02aCreateEvaluationDraft() {
  const { data: classes = [] } = useClasses();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

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
                  <Input type="date" defaultValue="2026-01-01" className="bg-card" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Do</label>
                  <Input type="date" defaultValue="2026-03-14" className="bg-card" />
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
                {classes.map((c) => (
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
                ))}
              </div>
            </div>
          )}

          {selectedClassId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Popište vaše preference pro hodnocení
              </label>
              <Textarea
                className="min-h-[100px] bg-card mb-3"
                placeholder="Např. zaměřte se na pokrok žáka, používejte pozitivní formulace..."
              />
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Nahrát předlohu
              </Button>
            </div>
          )}

          {selectedClassId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                Nejdříve vytvořím hodnocení pro jednoho žáka jako předlohu. Kým začneme?
              </label>
              <Input
                className="bg-card"
                placeholder="Začněte psát jméno žáka..."
              />
            </div>
          )}

          {selectedClassId && (
            <Button asChild className="w-full" size="lg">
              <Link to="/evaluations/create/preview">
                Vytvořit draft hodnocení
              </Link>
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
