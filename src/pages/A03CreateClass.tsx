import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

const fakeStudentInputs = [
  "Adam Novák",
  "Barbora Svobodová",
  "Cyril Dvořák",
  "Dana Černá",
  "Emil Procházka",
  "Františka Kučerová",
  "Gustav Veselý",
  "Hana Horáková",
  "",
];

export default function A03CreateClass() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <AppBreadcrumb
          items={[
            { label: "Úvod", href: "/" },
            { label: "Vytvořit třídu" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-6">Vytvořit třídu</h1>

        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Název třídy
          </label>
          <Input placeholder="např. 6.A" defaultValue="6.A" className="bg-card max-w-xs" />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Přidat žáky
          </label>
          <div className="space-y-3">
            {fakeStudentInputs.map((name, i) => (
              <Input
                key={i}
                placeholder="Začněte psát jméno žáka..."
                defaultValue={name}
                className="bg-card"
              />
            ))}
          </div>
        </div>

        <Button variant="ghost" className="gap-2 text-primary mb-8">
          <Plus className="h-4 w-4" />
          Přidat dalšího žáka
        </Button>

        <Button className="w-full" size="lg">
          Vytvořit třídu
        </Button>
      </div>
    </AppLayout>
  );
}
