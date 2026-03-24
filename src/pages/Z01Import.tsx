import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type TableName =
  | "students"
  | "classes"
  | "class_students"
  | "proofs_of_learning"
  | "proof_students"
  | "evaluation_groups"
  | "evaluations";

const IMPORT_ORDER: TableName[] = [
  "students",
  "classes",
  "class_students",
  "proofs_of_learning",
  "proof_students",
  "evaluation_groups",
  "evaluations",
];

const TABLE_LABELS: Record<TableName, string> = {
  students: "students.csv",
  classes: "classes.csv",
  class_students: "class_students.csv",
  proofs_of_learning: "proofs_of_learning.csv",
  proof_students: "proof_students.csv",
  evaluation_groups: "evaluation_groups.csv",
  evaluations: "evaluations.csv",
};

// Columns that contain the old teacher_id and need remapping
const TEACHER_ID_COLS: Partial<Record<TableName, string[]>> = {
  students: ["teacher_id"],
  classes: ["teacher_id"],
  proofs_of_learning: ["teacher_id"],
  evaluation_groups: ["teacher_id"],
  evaluations: ["teacher_id"],
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    // Simple CSV parse — handles quoted fields
    const values: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

export default function Z01Import() {
  const { user } = useAuth();
  const [files, setFiles] = useState<Record<TableName, File | null>>({
    students: null, classes: null, class_students: null,
    proofs_of_learning: null, proof_students: null,
    evaluation_groups: null, evaluations: null,
  });
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addLog = (msg: string) => setLog((l) => [...l, msg]);

  const handleFile = (table: TableName, file: File | null) => {
    setFiles((prev) => ({ ...prev, [table]: file }));
  };

  const handleImport = async () => {
    if (!user) return;
    setRunning(true);
    setLog([]);
    addLog(`ℹ️ Importing as user: ${user.id}`);

    for (const table of IMPORT_ORDER) {
      const file = files[table];
      if (!file) {
        addLog(`⏭ Skipped ${table} (no file)`);
        continue;
      }

      const text = await file.text();
      let rows = parseCSV(text);
      if (rows.length === 0) {
        addLog(`⚠️ ${table}: empty or unreadable`);
        continue;
      }

      // Remap teacher_id — replace any value with current user's id
      const teacherCols = TEACHER_ID_COLS[table] || [];
      if (teacherCols.length > 0) {
        rows = rows.map((row) => {
          const updated = { ...row };
          for (const col of teacherCols) {
            if (updated[col]) updated[col] = user.id;
          }
          return updated;
        });
      }

      // Clean empty string values to null for nullable columns
      rows = rows.map((row) => {
        const cleaned: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          cleaned[k] = v === "" ? null : v;
        }
        return cleaned;
      });

      // Remove updated_at/created_at to let DB set defaults, but keep IDs
      rows = rows.map((row) => {
        const r = { ...row };
        delete r.updated_at;
        return r;
      });

      const { error } = await supabase.from(table).insert(rows);
      if (error) {
        addLog(`❌ ${table}: ${error.message}`);
      } else {
        addLog(`✅ ${table}: ${rows.length} rows imported`);
      }
    }

    addLog("— Import complete —");
    setRunning(false);
    setDone(true);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Import dat z Lovable</h1>
          <p className="text-sm text-muted-foreground mt-1">Jednorázový nástroj pro migraci CSV souborů.</p>
        </div>

        <div className="space-y-2">
          {IMPORT_ORDER.map((table) => (
            <div key={table} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
              <span className="text-sm font-mono text-muted-foreground w-48 shrink-0">{TABLE_LABELS[table]}</span>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFile(table, e.target.files?.[0] ?? null)}
                className="text-sm text-foreground flex-1"
              />
              {files[table] && <span className="text-xs text-green-600">✓</span>}
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleImport}
          disabled={running || done}
        >
          {running ? "Importuji…" : done ? "Hotovo" : "Spustit import"}
        </Button>

        {log.length > 0 && (
          <div className="rounded-xl border border-border bg-muted p-4 space-y-1 font-mono text-sm">
            {log.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
