import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { studentId, evalType, dateFrom, dateTo, preferences } = await req.json();

    // Fetch student info
    const { data: student } = await supabase
      .from("students")
      .select("first_name, last_name")
      .eq("id", studentId)
      .eq("teacher_id", user.id)
      .single();
    if (!student) throw new Error("Student not found");

    // Fetch proofs for this student in date range
    let proofsQuery = supabase
      .from("proof_students")
      .select("proof_id, proofs_of_learning(title, type, date, note)")
      .eq("student_id", studentId);

    const { data: proofLinks } = await proofsQuery;
    
    const proofs = (proofLinks || [])
      .map((pl: any) => pl.proofs_of_learning)
      .filter(Boolean)
      .filter((p: any) => {
        if (dateFrom && p.date < dateFrom) return false;
        if (dateTo && p.date > dateTo) return false;
        return true;
      });

    // If no proofs, return immediately with noProofs flag
    if (proofs.length === 0) {
      return new Response(JSON.stringify({ text: "", noProofs: true, proofCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabels: Record<string, string> = {
      prubezna: "průběžná zpětná vazba",
      tripartita: "hodnocení pro tripartitní schůzku",
      vysvedceni: "slovní hodnocení na vysvědčení",
      vlastni: "hodnocení",
    };

    const proofsSummary = proofs.map((p: any) => `- ${p.title} (${p.type}, ${p.date}): ${p.note || "bez poznámky"}`).join("\n");

    const systemPrompt = `Jsi zkušený český učitel, který píše slovní hodnocení žáků. Piš v češtině, vstřícně a konstruktivně. Zaměř se na konkrétní pozorování z důkazů o učení. Pokud není dostatek důkazů, napiš co nejlepší hodnocení z toho, co máš, a poznamenej, že by bylo vhodné doplnit více pozorování.`;

    const userPrompt = `Napiš ${typeLabels[evalType] || "hodnocení"} pro žáka ${student.first_name} ${student.last_name}.

Období: ${dateFrom || "neurčeno"} – ${dateTo || "neurčeno"}

Důkazy o učení:
${proofsSummary}

${preferences ? `Preference učitele: ${preferences}` : ""}

Napiš hodnocení v rozsahu 3-6 vět. Nepoužívej formátování markdown.`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Příliš mnoho požadavků, zkuste to znovu za chvíli." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Nedostatek kreditů pro AI generování." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI gateway error");
    }

    const result = await aiResponse.json();
    const text = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text, noProofs: false, proofCount: proofs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-evaluation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
