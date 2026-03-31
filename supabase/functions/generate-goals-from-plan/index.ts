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

    const { fileUrl, subject, className, count } = await req.json();
    if (!fileUrl) throw new Error("fileUrl is required");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    // Fetch the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) throw new Error("Failed to fetch thematic plan file");
    const fileBytes = new Uint8Array(await fileResponse.arrayBuffer());

    const mimeType = fileResponse.headers.get("content-type") || "application/octet-stream";

    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    const rvpContext = getRvpContext(className);

    const systemPrompt = `Jsi zkušený český pedagog a odborník na formativní hodnocení podle RVP. Analyzuj přiložený tematický plán a navrhni vzdělávací cíle s kritérii hodnocení.

Pravidla:
- Navrhni ${count ? `přesně ${count}` : "5-8"} vzdělávacích cílů pokrývajících klíčová témata z plánu
- Každý cíl formuluj z pohledu žáka ("Žák dokáže...", "Žák rozliší...", "Žák aplikuje...")
- Ke každému cíli navrhni 1-2 kritéria hodnocení
- Každé kritérium má 3 úrovně: Začínám, Rozvíjím se, Ovládám
- Cíle by měly být konkrétní, měřitelné a relevantní
- Inspiruj se přiloženým RVP ZV 2025 — cíle by měly odpovídat očekávaným výsledkům učení a klíčovým kompetencím pro daný stupeň a předmět

Odpověz POUZE validním JSON objektem v tomto formátu:
{
  "goals": [
    {
      "title": "stručný název cíle",
      "description": "podrobnější popis co žák dokáže",
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
${rvpContext}`;

    const userPrompt = `Předmět: ${subject || "neurčen"}${className ? `\nTřída/ročník: ${className}` : ""}

Analyzuj tento tematický plán a navrhni vzdělávací cíle s kritérii hodnocení.`;

    let messages: any[];
    let uploadedFileId = "";

    if (isPdf) {
      // Upload PDF to OpenAI Files API, then reference by file_id
      const formData = new FormData();
      formData.append("file", new Blob([fileBytes], { type: "application/pdf" }), "thematic_plan.pdf");
      formData.append("purpose", "assistants");

      const uploadRes = await fetch("https://api.openai.com/v1/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        console.error("File upload error:", uploadRes.status, errText);
        throw new Error("Failed to upload file for AI processing");
      }

      const uploadData = await uploadRes.json();
      uploadedFileId = uploadData.id;

      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "file", file: { file_id: uploadedFileId } },
          ],
        },
      ];
    } else if (isImage) {
      const base64 = bytesToBase64(fileBytes);
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ];
    } else {
      // Text files
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const textContent = decoder.decode(fileBytes);
      messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${userPrompt}\n\nObsah tematického plánu:\n${textContent.substring(0, 50000)}`,
        },
      ];
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: (isPdf || isImage) ? "gpt-4o" : "gpt-4o-mini",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    // Clean up uploaded file (fire and forget)
    if (uploadedFileId) {
      fetch(`https://api.openai.com/v1/files/${uploadedFileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      }).catch(() => {});
    }

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Příliš mnoho požadavků, zkuste to znovu za chvíli." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
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
    console.error("generate-goals-from-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
