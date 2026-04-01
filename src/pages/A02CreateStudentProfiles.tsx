import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateStudents } from "@/hooks/useStudents";
import { parseNamesFromText, isTextFile, processFileWithAI } from "@/utils/nameParser";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function A02CreateStudentProfiles() {
  usePageTitle("Vytvořit žákovské profily");
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
  const [isProcessing, setIsProcessing] = useState(false);

  const updateRow = (index: number, field: "first" | "last", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { first: "", last: "" }]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addParsedNames = (parsed: { first: string; last: string }[]) => {
    if (parsed.length === 0) {
      toast({ title: "V souboru nebyla nalezena žádná jména", variant: "destructive" });
      return;
    }
    setRows((prev) => {
      const nonEmpty = prev.filter((r) => r.first.trim() || r.last.trim());
      return [...nonEmpty, ...parsed];
    });
    toast({ title: `Načteno ${parsed.length} ${parsed.length === 1 ? "jméno" : "jmen"} ze souboru` });
  };

  const processFile = async (file: File) => {
    try {
      if (isTextFile(file)) {
        const text = await file.text();
        const parsed = parseNamesFromText(text);
        addParsedNames(parsed);
      } else {
        setIsProcessing(true);
        const parsed = await processFileWithAI(file);
        addParsedNames(parsed);
      }
    } catch (err) {
      console.error("Nepodařilo se zpracovat soubor", err);
      toast({ title: "Nepodařilo se zpracovat soubor", variant: "destructive" });
    } finally {
      setIsProcessing(false);
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
    } catch (err) {
      console.error("Chyba při vytváření profilů", err);
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
          accept=".csv,.txt,.tsv,.text,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.heic,.bmp,.gif"
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 bg-card cursor-pointer transition-colors ${isDragOver ? "border-primary bg-primary/5" : "border-border"} ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground mb-1">Zpracovávám soubor…</p>
              <p className="text-xs text-muted-foreground">AI rozpoznává jména ze souboru</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Hromadné nahrání žáků</p>
              <p className="text-xs text-muted-foreground">Přetáhněte sem soubor nebo klikněte pro výběr</p>
              <p className="text-xs text-muted-foreground mt-1">CSV, TXT, PDF, Word, Excel, nebo fotografie seznamu</p>
            </>
          )}
        </div>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={createStudents.isPending || isProcessing}>
          {createStudents.isPending ? "Ukládání…" : "Uložit profily"}
        </Button>
      </div>
    </AppLayout>
  );
}
