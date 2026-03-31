import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getRvpContext } from "../_shared/rvp/rvp.ts";

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK))));
  }
  return btoa(parts.join(""));
}

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

    const { goalTitle, goalDescription, subject, levelNames, className, thematicPlanFileUrl } = await req.json();

    if (!goalTitle) throw new Error("Goal title is required");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    // If a thematic plan file is provided, fetch it and prepare for AI
    let thematicPlanContent = "";
    let thematicPlanIsImage = false;
    let thematicPlanImageBase64 = "";
    let thematicPlanImageMime = "";
    let thematicPlanPdfBase64 = "";

    if (thematicPlanFileUrl) {
      try {
        const fileResponse = await fetch(thematicPlanFileUrl);
        if (fileResponse.ok) {
          const mimeType = fileResponse.headers.get("content-type") || "application/octet-stream";
          const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());

          if (mimeType === "application/pdf") {
            thematicPlanPdfBase64 = bytesToBase64(fileBytes);
          } else if (mimeType.startsWith("image/")) {
            thematicPlanIsImage = true;
            thematicPlanImageMime = mimeType;
            thematicPlanImageBase64 = bytesToBase64(fileBytes);
          } else {
            const decoder = new TextDecoder("utf-8", { fatal: false });
            thematicPlanContent = decoder.decode(fileBytes).substring(0, 50000);
          }
        }
      } catch (e) {
        console.error("Failed to fetch thematic plan:", e);
      }
    }

    const hasThematicPlan = thematicPlanContent || thematicPlanIsImage || thematicPlanPdfBase64;

    // Step 1: If thematic plan exists and no custom levels, extract levels from the plan first
    // Uses the Responses API which has native PDF support via inline file_data
    let extractedLevelNames: string[] | null = null;
    if (hasThematicPlan && !(levelNames && levelNames.length > 0)) {
      try {
        const extractPrompt = `Analyzuj tento dokument (tematický plán) a najdi definice úrovní hodnocení žáků.

Hledej sekce, tabulky nebo odstavce, které definují úrovně jako např.:
- "Základní", "Optimální", "Nadstandardní"
- "Začínám", "Rozvíjím se", "Ovládám"
- "Výborně", "Dobře", "Dostatečně"
- nebo jakékoli jiné pojmenované úrovně hodnocení

Odpověz POUZE validním JSON objektem:
- Pokud jsi našel definice úrovní: {"found": true, "levels": ["Název úrovně 1", "Název úrovně 2", "Název úrovně 3"]}
- Pokud žádné úrovně v dokumentu nejsou: {"found": false, "levels": []}

Úrovně seřaď od nejnižší po nejvyšší (od začátečníka po experta).`;

        let inputContent: any[];
        if (thematicPlanPdfBase64) {
          inputContent = [
            { type: "input_text", text: extractPrompt },
            { type: "input_file", file_data: `data:application/pdf;base64,${thematicPlanPdfBase64}` },
          ];
        } else if (thematicPlanIsImage) {
          inputContent = [
            { type: "input_text", text: extractPrompt },
            { type: "input_image", image_url: `data:${thematicPlanImageMime};base64,${thematicPlanImageBase64}` },
          ];
        } else {
          inputContent = [
            { type: "input_text", text: `${extractPrompt}\n\nObsah dokumentu:\n${thematicPlanContent}` },
          ];
        }

        const extractResponse = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: (thematicPlanPdfBase64 || thematicPlanIsImage) ? "gpt-4o" : "gpt-4o-mini",
            input: [{ role: "user", content: inputContent }],
            text: { format: { type: "json_object" } },
          }),
        });

        if (extractResponse.ok) {
          const extractResult = await extractResponse.json();
          const extractText = extractResult.output?.find((o: any) => o.type === "message")
            ?.content?.find((c: any) => c.type === "output_text")?.text || "{}";
          const extractParsed = JSON.parse(extractText);
          console.log("Level extraction result:", JSON.stringify(extractParsed));
          if (extractParsed.found && extractParsed.levels?.length > 0) {
            extractedLevelNames = extractParsed.levels;
            console.log("Extracted levels from thematic plan:", extractedLevelNames);
          }
        } else {
          const errText = await extractResponse.text();
          console.error("Level extraction API error:", extractResponse.status, errText);
        }
      } catch (e) {
        console.error("Level extraction failed, continuing without:", e);
      }
    }

    // Step 2: Build criteria generation prompt with extracted or provided levels
    const effectiveLevels = (levelNames && levelNames.length > 0) ? levelNames : extractedLevelNames;
    const levelsInstruction = effectiveLevels && effectiveLevels.length > 0
      ? `Použij přesně tyto názvy úrovní (v tomto pořadí): ${effectiveLevels.join(", ")}.`
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

    const userPrompt = `Vzdělávací cíl: ${goalTitle}${goalDescription ? `\nPopis: ${goalDescription}` : ""}${subject ? `\nPředmět: ${subject}` : ""}${thematicPlanContent ? `\n\nTematický plán kurzu:\n${thematicPlanContent}` : ""}

Navrhni kritéria hodnocení s popisy úrovní.`;

    // Build messages for criteria generation (no file needed — levels already extracted)
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
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
