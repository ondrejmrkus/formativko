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

    const { goalTitle, goalDescription, subject, levelNames, className } = await req.json();

    if (!goalTitle) throw new Error("Goal title is required");

    const levelsInstruction = levelNames && levelNames.length > 0
      ? `Použij přesně tyto názvy úrovní (od nejlepší po nejhorší): ${levelNames.join(", ")}.`
      : `Použij 3-4 úrovně, např. "Výborně ovládl/a", "Dobře zvládl/a", "S pomocí zvládl/a", "Zatím příliš nezvládl/a".`;

    const rvpContext = getRvpContext(className);

    const systemPrompt = `Jsi zkušený český pedagog a odborník na formativní hodnocení. Na základě vzdělávacího cíle navrhni kritéria hodnocení s popisy úrovní. ${levelsInstruction}

Odpověz POUZE validním JSON objektem v tomto formátu:
{
  "criteria": [
    {
      "description": "co konkrétně hodnotíme",
      "level_descriptors": [
        { "level": "název úrovně", "description": "konkrétní popis, co žák na této úrovni dokáže" }
      ]
    }
  ]
}

Navrhni 1-3 kritéria podle složitosti cíle. Popisy úrovní by měly být konkrétní, pozorovatelné a měřitelné. Piš stručně (1-2 věty na úroveň). Inspiruj se přiloženým RVP ZV 2025 — kritéria by měla odpovídat očekávaným výsledkům učení.
${rvpContext}`;

    const userPrompt = `Vzdělávací cíl: ${goalTitle}${goalDescription ? `\nPopis: ${goalDescription}` : ""}${subject ? `\nPředmět: ${subject}` : ""}

Navrhni kritéria hodnocení s popisy úrovní.`;

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
    console.error("generate-criteria error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
