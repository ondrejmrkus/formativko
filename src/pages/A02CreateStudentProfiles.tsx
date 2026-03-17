import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateStudents } from "@/hooks/useStudents";

export default function A02CreateStudentProfiles() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createStudents = useCreateStudents();
  const [rows, setRows] = useState([
    { first: "", last: "" },
    { first: "", last: "" },
    { first: "", last: "" },
  ]);

  const updateRow = (index: number, field: "first" | "last", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { first: "", last: "" }]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const filled = rows.filter((r) => r.first.trim() && r.last.trim());
    if (filled.length === 0) {
      toast({ title: "Vyplňte alespoň jednoho žáka", variant: "destructive" });
      return;
    }
    try {
      await createStudents.mutateAsync(
        filled.map((r) => ({ first_name: r.first.trim(), last_name: r.last.trim() }))
      );
      toast({ title: `${filled.length} ${filled.length === 1 ? "profil vytvořen" : "profilů vytvořeno"}` });
      navigate("/student-profiles");
    } catch {
      toast({ title: "Chyba při vytváření profilů", variant: "destructive" });
    }
  };

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
          {rows.map((row, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Input
                placeholder="Jméno"
                value={row.first}
                onChange={(e) => updateRow(i, "first", e.target.value)}
                className="bg-card"
              />
              <Input
                placeholder="Příjmení"
                value={row.last}
                onChange={(e) => updateRow(i, "last", e.target.value)}
                className="bg-card"
              />
              {rows.length > 1 && (
                <button onClick={() => removeRow(i)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <Button variant="ghost" className="gap-2 text-primary mb-8" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Přidat dalšího žáka
        </Button>

        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-6 bg-card">
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Hromadné nahrání žáků</p>
          <p className="text-xs text-muted-foreground">Přetáhněte sem soubor CSV nebo klikněte pro výběr</p>
        </div>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={createStudents.isPending}>
          {createStudents.isPending ? "Ukládání…" : "Uložit profily"}
        </Button>
      </div>
    </AppLayout>
  );
}
