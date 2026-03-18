import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateStudents } from "@/hooks/useStudents";

function parseNamesFromText(text: string): { first: string; last: string }[] {
  const results: { first: string; last: string }[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Try splitting by comma, semicolon, or tab (CSV-like)
    const parts = line.split(/[,;\t]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      results.push({ first: parts[0], last: parts[1] });
    } else {
      // Split by spaces
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        const first = words.slice(0, -1).join(" ");
        const last = words[words.length - 1];
        results.push({ first, last });
      } else if (words.length === 1) {
        results.push({ first: words[0], last: "" });
      }
    }
  }
  return results;
}

export default function A02CreateStudentProfiles() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createStudents = useCreateStudents();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState([
    { first: "", last: "" },
    { first: "", last: "" },
    { first: "", last: "" },
  ]);
  const [isDragOver, setIsDragOver] = useState(false);

  const updateRow = (index: number, field: "first" | "last", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { first: "", last: "" }]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const processFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = parseNamesFromText(text);
      if (parsed.length === 0) {
        toast({ title: "V souboru nebyla nalezena žádná jména", variant: "destructive" });
        return;
      }
      setRows((prev) => {
        const nonEmpty = prev.filter((r) => r.first.trim() || r.last.trim());
        return [...nonEmpty, ...parsed];
      });
      toast({ title: `Načteno ${parsed.length} ${parsed.length === 1 ? "jméno" : "jmen"} ze souboru` });
    } catch {
      toast({ title: "Nepodařilo se přečíst soubor", variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,.tsv,.text"
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 bg-card cursor-pointer transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-border"}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Hromadné nahrání žáků</p>
          <p className="text-xs text-muted-foreground">Přetáhněte sem soubor nebo klikněte pro výběr (CSV, TXT, …)</p>
          <p className="text-xs text-muted-foreground mt-1">Formát: jedno jméno na řádek (Jméno Příjmení) nebo oddělené čárkou</p>
        </div>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={createStudents.isPending}>
          {createStudents.isPending ? "Ukládání…" : "Uložit profily"}
        </Button>
      </div>
    </AppLayout>
  );
}