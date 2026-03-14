import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload } from "lucide-react";

const fakeRows = [
  { first: "Jan", last: "Novotný" },
  { first: "Marie", last: "Dvořáková" },
  { first: "Petr", last: "Svoboda" },
  { first: "", last: "" },
  { first: "", last: "" },
];

export default function A02CreateStudentProfiles() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Vytvořit žákovské profily" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Vytvořit žákovské profily</h1>

        <div className="space-y-3 mb-4">
          {fakeRows.map((row, i) => (
            <div key={i} className="flex gap-3">
              <Input placeholder="Jméno" defaultValue={row.first} className="bg-card" />
              <Input placeholder="Příjmení" defaultValue={row.last} className="bg-card" />
            </div>
          ))}
        </div>

        <Button variant="ghost" className="gap-2 text-primary mb-8">
          <Plus className="h-4 w-4" />
          Přidat dalšího žáka
        </Button>

        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-6 bg-card">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">
            Hromadné nahrání žáků
          </p>
          <p className="text-xs text-muted-foreground">
            Přetáhněte sem soubor CSV nebo klikněte pro výběr
          </p>
        </div>

        <Button className="w-full" size="lg">
          Uložit profily
        </Button>
      </div>
    </AppLayout>
  );
}
