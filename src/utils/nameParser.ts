import { supabase } from "@/integrations/supabase/client";

export function parseNamesFromText(text: string): { first: string; last: string }[] {
  const results: { first: string; last: string }[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/[,;\t]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      results.push({ first: parts[0], last: parts[1] });
    } else {
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

const TEXT_EXTENSIONS = [".csv", ".txt", ".tsv", ".text"];

export function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  const name = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function processFileWithAI(file: File): Promise<{ first: string; last: string }[]> {
  const formData = new FormData();
  formData.append("file", file);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-names`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Chyba při zpracování souboru");
  }

  const { names } = await res.json();
  return (names || []) as { first: string; last: string }[];
}
