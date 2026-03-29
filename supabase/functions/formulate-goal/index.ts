import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRvpContext } from "../_shared/rvp/rvp.ts";

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
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { rawGoal, subject, className } = await req.json();

    if (!rawGoal) throw new Error("Goal text is required");

    const rvpContext = getRvpContext(className);

    const systemPrompt = `Jsi zkušený český pedagog a odborník na formulaci vzdělávacích cílů podle českého RVP (Rámcový vzdělávací program). Učitel ti napíše vzdělávací cíl svými slovy a ty ho přeformuluješ do správné pedagogické formy.

Pravidla pro formulaci cíle:
- Cíl by měl být formulován z pohledu žáka ("Žák dokáže...", "Žák umí...", "Žák je schopen...")
- Měl by být konkrétní, měřitelný a pozorovatelný
- Měl by odpovídat terminologii RVP a očekávaným výstupům
- Zachovej původní záměr učitele, jen ho přeformuluj do správné formy
- Název cíle by měl být stručný (1 věta)

Odpověz POUZE validním JSON objektem:
{
  "title": "přeformulovaný název cíle",
  "description": "stručný popis cíle (1-2 věty) vysvětlující, co konkrétně se od žáka očekává a jak se to projeví"
}
${rvpContext}`;

    const userPrompt = `${subject ? `Předmět: ${subject}\n` : ""}Učitelova formulace cíle: ${rawGoal}

Přeformuluj tento cíl do správné pedagogické formy podle RVP.`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Příliš mnoho požadavků, zkuste to znovu za chvíli." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      throw new Error("AI gateway error");
    }

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("AI returned invalid JSON");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("formulate-goal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
