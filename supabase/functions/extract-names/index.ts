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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file provided");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const base64 = btoa(String.fromCharCode(...fileBytes));

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    // Build message content
    const textPrompt = `Extract all student names from this ${isImage ? "image" : "document"}. 
Return ONLY a JSON array of objects with "first" and "last" keys. 
Example: [{"first": "Jan", "last": "Novák"}, {"first": "Marie", "last": "Dvořáková"}]
If you find a single name without surname, put it in "first" and leave "last" empty.
If you cannot find any names, return an empty array [].
Return ONLY the JSON array, no other text.`;

    let messages: any[];

    if (isImage || isPdf) {
      // Use vision model for images and PDFs
      const mimeType = file.type || "application/octet-stream";
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ];
    } else {
      // For text-based documents, decode and send as text
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const textContent = decoder.decode(fileBytes);
      messages = [
        {
          role: "user",
          content: `${textPrompt}\n\nDocument content:\n${textContent.substring(0, 50000)}`,
        },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isImage || isPdf ? "google/gemini-2.5-flash" : "google/gemini-2.5-flash-lite",
        messages,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "[]";

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const names = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(JSON.stringify({ names }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
