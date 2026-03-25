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
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { topic, subject, classContext } = await req.json();

    if (!topic) throw new Error("Topic is required");

    const systemPrompt = `Jsi zkušený český pedagog a odborník na formativní hodnocení. Navrhni vzdělávací cíle s kritérii hodnocení pro danou lekci. Každý cíl by měl mít 1-2 kritéria, každé kritérium se 3 úrovněmi (Začínám, Rozvíjím se, Ovládám). Odpověz POUZE validním JSON objektem v tomto formátu:
{
  "goals": [
    {
      "title": "stručný název cíle",
      "description": "podrobnější popis",
      "criteria": [
        {
          "description": "co konkrétně hodnotíme",
          "level_descriptors": [
            { "level": "Začínám", "description": "popis úrovně" },
            { "level": "Rozvíjím se", "description": "popis úrovně" },
            { "level": "Ovládám", "description": "popis úrovně" }
          ]
        }
      ]
    }
  ]
}
Navrhni 2-3 cíle. Cíle by měly být konkrétní, měřitelné a relevantní pro danou lekci.`;

    const userPrompt = `Předmět: ${subject}${classContext ? `\nTřída/ročník: ${classContext}` : ""}

Téma lekce: ${topic}

Navrhni vzdělávací cíle s kritérii hodnocení.`;

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
    console.error("generate-goals error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
