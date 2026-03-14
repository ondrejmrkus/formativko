import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { students, classes, getStudentDisplayName } from "@/data/mockData";

const selectedStudentIds = ["s1", "s2", "s3", "s4", "s5"];
const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

export default function C02aCreateEvaluationDraft() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Hodnocení", href: "/evaluations" },
            { label: "Vytvořit hodnocení" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-2">Vytvořit hodnocení</h1>
        <p className="text-muted-foreground mb-6">Krok 1 ze 2 — Nastavení</p>

        <div className="space-y-6">
          {/* Select students */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Vybrat žáky
            </label>
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border bg-card min-h-[48px]">
              {selectedStudents.map((s) => (
                <Badge key={s.id} variant="secondary" className="py-1">
                  {getStudentDisplayName(s)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Evaluation type */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Typ hodnocení
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button className="p-3 rounded-xl border border-primary bg-primary/10 text-primary text-sm font-medium">
                Slovní hodnocení
              </button>
              <button className="p-3 rounded-xl border border-border bg-card text-muted-foreground text-sm hover:border-primary/30">
                Vysvědčení
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Předmět</label>
            <Input defaultValue="Český jazyk" className="bg-card" />
          </div>

          {/* Period */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Období</label>
            <Input defaultValue="1. pololetí" className="bg-card" />
          </div>

          <Button asChild className="w-full" size="lg">
            <Link to="/evaluations/create/preview">
              Vygenerovat koncept
            </Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
