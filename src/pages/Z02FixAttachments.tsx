import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Check, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ProofRow {
  id: string;
  title: string;
  type: string;
  date: string;
  file_url: string | null;
  file_name: string | null;
}

export default function Z02FixAttachments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [fixed, setFixed] = useState<Set<string>>(new Set());

  const { data: proofs = [], isLoading } = useQuery({
    queryKey: ["proofs-with-files", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proofs_of_learning")
        .select("id, title, type, date, file_url, file_name")
        .in("type", ["camera", "file"])
        .order("date", { ascending: false });
      if (error) throw error;
      return data as ProofRow[];
    },
    enabled: !!user,
  });

  const handleUpload = async (proof: ProofRow, file: File) => {
    setUploading(proof.id);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("proof-files")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("proof-files")
        .getPublicUrl(path);

      const { error: updateErr } = await supabase
        .from("proofs_of_learning")
        .update({ file_url: urlData.publicUrl, file_name: file.name })
        .eq("id", proof.id);
      if (updateErr) throw updateErr;

      setFixed((prev) => new Set([...prev, proof.id]));
      queryClient.invalidateQueries({ queryKey: ["proofs-with-files"] });
      toast({ title: `Soubor nahrán: ${proof.title}` });
    } catch (e: any) {
      toast({ title: "Chyba při nahrávání", description: e.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const isBroken = (proof: ProofRow) =>
    !proof.file_url || proof.file_url.includes("qwdmsfsflohupwlwukhn");

  const broken = proofs.filter(isBroken);
  const ok = proofs.filter((p) => !isBroken(p));

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Opravit přílohy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Znovu nahrajte obrázky a soubory ze starého projektu.
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Načítání…</p>
        ) : (
          <>
            {broken.length === 0 && (
              <div className="p-6 rounded-xl border border-border bg-card text-center text-muted-foreground">
                Všechny přílohy jsou v pořádku.
              </div>
            )}

            {broken.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <ImageOff className="h-4 w-4" />
                  Chybí soubor ({broken.length})
                </h2>
                {broken.map((proof) => (
                  <div
                    key={proof.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{proof.title}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {proof.file_url
                          ? proof.file_url.split("/").pop()?.replace(/\.[^.]+$/, "")
                          : proof.file_name}
                      </p>
                    </div>
                    <label className={`shrink-0 cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      fixed.has(proof.id)
                        ? "bg-green-100 text-green-700"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}>
                      {fixed.has(proof.id) ? (
                        <><Check className="h-4 w-4" /> Nahráno</>
                      ) : uploading === proof.id ? (
                        "Nahrávám…"
                      ) : (
                        <><Upload className="h-4 w-4" /> Nahrát</>
                      )}
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        disabled={uploading !== null}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(proof, file);
                        }}
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {ok.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  V pořádku ({ok.length})
                </h2>
                {ok.map((proof) => (
                  <div
                    key={proof.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card opacity-60"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{proof.title}</p>
                      <p className="text-xs text-muted-foreground">{proof.date} · {proof.type}</p>
                    </div>
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
