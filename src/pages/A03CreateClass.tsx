import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Upload, Loader2, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStudents, useCreateStudents } from "@/hooks/useStudents";
import { useCreateClass } from "@/hooks/useClasses";
import { StudentPicker } from "@/components/shared/StudentPicker";
import { parseNamesFromText, isTextFile, processFileWithAI } from "@/utils/nameParser";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function A03CreateClass() {
  usePageTitle("Vytvořit třídu");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: allStudents = [] } = useStudents();
  const createStudents = useCreateStudents();
  const createClass = useCreateClass();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [className, setClassName] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // New student rows
  const [newRows, setNewRows] = useState([
    { first: "", last: "" },
    { first: "", last: "" },
    { first: "", last: "" },
  ]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const addStudent = (id: string) => {
    setSelectedStudentIds((prev) => [...prev, id]);
  };

  const removeStudent = (id: string) => {
    setSelectedStudentIds((prev) => prev.filter((s) => s !== id));
  };

  // New student row handlers
  const updateRow = (index: number, field: "first" | "last", value: string) => {
    setNewRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setNewRows((prev) => [...prev, { first: "", last: "" }]);

  const removeRow = (index: number) => {
    if (newRows.length <= 1) return;
    setNewRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addParsedNames = (parsed: { first: string; last: string }[]) => {
    if (parsed.length === 0) {
      toast({ title: "V souboru nebyla nalezena žádná jména", variant: "destructive" });
      return;
    }
    setNewRows((prev) => {
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
    } catch (err: any) {
      console.error("File processing error:", err);
      toast({ title: "Nepodařilo se zpracovat soubor", description: err?.message, variant: "destructive" });
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

  const handleCreate = async () => {
    if (!className.trim()) {
      toast({ title: "Zadejte název třídy", variant: "destructive" });
      return;
    }

    const filledNewRows = newRows.filter((r) => r.first.trim() && r.last.trim());
    if (selectedStudentIds.length === 0 && filledNewRows.length === 0) {
      toast({ title: "Přidejte alespoň jednoho žáka", variant: "destructive" });
      return;
    }

    try {
      // 1. Create new students if any
      let newStudentIds: string[] = [];
      if (filledNewRows.length > 0) {
        const created = await createStudents.mutateAsync(
          filledNewRows.map((r) => ({ first_name: r.first.trim(), last_name: r.last.trim() }))
        );
        newStudentIds = created.map((s) => s.id);
      }

      // 2. Create class with all student IDs
      const allStudentIds = [...selectedStudentIds, ...newStudentIds];
      await createClass.mutateAsync({ name: className.trim(), studentIds: allStudentIds });

      const totalStudents = allStudentIds.length;
      toast({
        title: `Třída „${className}" vytvořena`,
        description: `${totalStudents} ${totalStudents === 1 ? "žák přidán" : totalStudents < 5 ? "žáci přidáni" : "žáků přidáno"}`,
      });
      navigate("/");
    } catch (err) {
      console.error("Chyba při vytváření třídy", err);
      toast({ title: "Chyba při vytváření třídy", variant: "destructive" });
    }
  };

  const isPending = createStudents.isPending || createClass.isPending;

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
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Název třídy</label>
          <Input
            placeholder="např. 5.A"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="bg-card max-w-xs"
          />
        </div>

        {/* Existing students picker — only shown when there are existing students */}
        {allStudents.length > 0 && (
          <div className="mb-6">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Existující žáci</label>
            <StudentPicker
              allStudents={allStudents}
              selectedStudentIds={selectedStudentIds}
              onAdd={addStudent}
              onRemove={removeStudent}
              addLabel="Vybrat žáka"
            />
          </div>
        )}

        {/* New students section */}
        <div className="mb-6">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Noví žáci</label>

          {/* Helpful tip */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Nemusíte žáky vypisovat ručně — nahrajte fotografii seznamu nebo tabulku a my jména rozpoznáme automaticky.
            </p>
          </div>

          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,.text,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.heic,.bmp,.gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center bg-card cursor-pointer transition-colors mb-4 ${isDragOver ? "border-primary bg-primary/5" : "border-border"} ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-6 w-6 text-primary mx-auto mb-1.5 animate-spin" />
                <p className="text-sm text-muted-foreground">Zpracovávám soubor…</p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                <p className="text-sm text-muted-foreground">Nahrát seznam žáků ze souboru</p>
                <p className="text-xs text-muted-foreground mt-0.5">CSV, TXT, PDF, Word, Excel, nebo fotografie</p>
              </>
            )}
          </div>

          <div className="space-y-2 mb-3">
            {newRows.map((row, i) => (
              <div key={i} className="flex gap-2 items-center">
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
                {newRows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button variant="ghost" className="gap-2 text-primary mb-4" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Přidat dalšího žáka
          </Button>
        </div>

        <Button className="w-full" size="lg" onClick={handleCreate} disabled={isPending || isProcessing}>
          {isPending ? "Vytváření…" : "Vytvořit třídu"}
        </Button>
      </div>
    </AppLayout>
  );
}
