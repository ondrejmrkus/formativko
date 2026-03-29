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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { studentId, evalType, dateFrom, dateTo, preferences, goalId, className, tone, person, length, customSystemPrompt } = await req.json();

    // --- Fetch all context data in parallel ---

    const studentPromise = supabase
      .from("students")
      .select("first_name, last_name, svp, interests, communication_preferences, learning_styles, svp_details, notes")
      .eq("id", studentId)
      .eq("teacher_id", user.id)
      .single();

    const proofsPromise = supabase
      .from("proof_students")
      .select("proof_id, proofs_of_learning(id, title, type, date, note, lesson_id)")
      .eq("student_id", studentId);

    const previousEvalsPromise = supabase
      .from("evaluations")
      .select("text, period, created_at, goal_id")
      .eq("student_id", studentId)
      .eq("teacher_id", user.id)
      .not("text", "is", null)
      .order("created_at", { ascending: false })
      .limit(2);

    // Goal + criteria (if goalId provided)
    const goalPromise = goalId
      ? supabase.from("educational_goals").select("title, description, subject_id, subjects(name)").eq("id", goalId).single()
      : Promise.resolve({ data: null });

    const criteriaPromise = goalId
      ? supabase.from("evaluation_criteria").select("description, level_descriptors, sort_order").eq("goal_id", goalId).order("sort_order")
      : Promise.resolve({ data: null });

    // Student goal level (if goalId provided)
    const goalLevelPromise = goalId
      ? supabase.from("student_goal_levels").select("level").eq("student_id", studentId).eq("goal_id", goalId).maybeSingle()
      : Promise.resolve({ data: null });

    // Proof-goal links (to show which proofs support which goals)
    const proofGoalsPromise = supabase
      .from("proof_goals")
      .select("proof_id, goal_id, educational_goals(title)")
      .eq("educational_goals.teacher_id", user.id);

    const [
      { data: student },
      { data: proofLinks },
      { data: previousEvals },
      { data: goal },
      { data: criteria },
      { data: goalLevel },
      { data: proofGoalsRaw },
    ] = await Promise.all([
      studentPromise, proofsPromise, previousEvalsPromise,
      goalPromise, criteriaPromise, goalLevelPromise, proofGoalsPromise,
    ]);

    // Build proof→goals lookup
    const proofGoalsMap: Record<string, string[]> = {};
    for (const pg of proofGoalsRaw || []) {
      const goalTitle = (pg as any).educational_goals?.title;
      if (goalTitle) {
        if (!proofGoalsMap[pg.proof_id]) proofGoalsMap[pg.proof_id] = [];
        proofGoalsMap[pg.proof_id].push(goalTitle);
      }
    }

    if (!student) throw new Error("Student not found");

    // --- Filter proofs by date range ---

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

    // --- Fetch lesson context for proofs that have lesson_id ---

    const lessonIds = [...new Set(proofs.map((p: any) => p.lesson_id).filter(Boolean))];
    let lessonsMap: Record<string, any> = {};
    if (lessonIds.length > 0) {
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title, planned_activities, observation_focus")
        .in("id", lessonIds);
      if (lessons) {
        lessonsMap = Object.fromEntries(lessons.map((l: any) => [l.id, l]));
      }
    }

    // --- Build prompt sections ---

    // Evaluation type configuration
    const typeConfig: Record<string, { label: string; tone: string; person: string; length: string }> = {
      prubezna: {
        label: "průběžná zpětná vazba",
        tone: "přátelský, povzbuzující",
        person: "2. osoba (dopis žákovi, tykej mu/jí)",
        length: "3–5 vět",
      },
      tripartita: {
        label: "hodnocení pro tripartitní schůzku (učitel, rodič, žák)",
        tone: "věcný, respektující, srozumitelný pro rodiče i žáka",
        person: "3. osoba (zpráva o žákovi)",
        length: "5–8 vět",
      },
      vysvedceni: {
        label: "slovní hodnocení na vysvědčení",
        tone: "formální, výstižný",
        person: "3. osoba (zpráva o žákovi)",
        length: "6–10 vět",
      },
      vlastni: {
        label: "hodnocení",
        tone: "neutrální",
        person: "3. osoba",
        length: "4–6 vět",
      },
    };

    const baseConfig = typeConfig[evalType] || typeConfig.vlastni;

    // Tone/person/length option maps
    const toneMap: Record<string, string> = {
      pratelsky: "přátelský, povzbuzující",
      formalni: "formální, výstižný",
    };
    const personMap: Record<string, string> = {
      "2": "2. osoba (dopis žákovi, tykej mu/jí)",
      "3": "3. osoba (zpráva o žákovi)",
    };
    const lengthMap: Record<string, string> = {
      kratka: "2–3 věty",
      stredni: "4–6 vět",
      dlouha: "7–10 vět",
    };

    // Apply overrides from request params
    const config = {
      label: baseConfig.label,
      tone: tone ? (toneMap[tone] || baseConfig.tone) : baseConfig.tone,
      person: person ? (personMap[person] || baseConfig.person) : baseConfig.person,
      length: length ? (lengthMap[length] || baseConfig.length) : baseConfig.length,
    };

    // Subject name (from goal or fallback)
    const subjectName = (goal as any)?.subjects?.name || null;

    // Goal section
    let goalSection = "";
    if (goal) {
      const g = goal as any;
      const criteriaLines = (criteria || []).map((c: any) => {
        const levels = (c.level_descriptors || [])
          .filter((ld: any) => ld.level)
          .map((ld: any) => `${ld.level}: ${ld.description || "—"}`)
          .join(" | ");
        return `  - ${c.description}${levels ? `\n    Úrovně: ${levels}` : ""}`;
      }).join("\n");

      goalSection = `\n## Vzdělávací cíl\n${g.title}${g.description ? `\n${g.description}` : ""}`;
      if (criteriaLines) {
        goalSection += `\n\nKritéria hodnocení:\n${criteriaLines}`;
      }
      if ((goalLevel as any)?.level) {
        goalSection += `\n\nAktuální úroveň žáka: ${(goalLevel as any).level}`;
      }
    }

    // Student profile section
    const profileLines: string[] = [];
    if (student.interests) profileLines.push(`- Zájmy a motivace: ${student.interests}`);
    if (student.communication_preferences) profileLines.push(`- Komunikační preference: ${student.communication_preferences}`);
    if (student.learning_styles) profileLines.push(`- Preferované styly učení: ${student.learning_styles}`);
    if (student.svp && student.svp_details) profileLines.push(`- Speciální vzdělávací potřeby: ${student.svp_details}`);
    if (student.notes) profileLines.push(`- Poznámky učitele: ${student.notes}`);
    const profileSection = profileLines.length > 0
      ? `\n## Profil žáka\n${profileLines.join("\n")}`
      : "";

    // Proofs section with lesson context and goal links
    const proofLines = proofs.map((p: any) => {
      let line = `- ${p.title} (${p.type}, ${p.date})`;
      if (p.note) line += `: ${p.note}`;
      const linkedGoals = proofGoalsMap[p.id];
      if (linkedGoals && linkedGoals.length > 0) {
        line += `\n  [Cíle: ${linkedGoals.join(", ")}]`;
      }
      if (p.lesson_id && lessonsMap[p.lesson_id]) {
        const lesson = lessonsMap[p.lesson_id];
        line += `\n  [Hodina: ${lesson.title}`;
        if (lesson.observation_focus) line += ` | Fokus pozorování: ${lesson.observation_focus}`;
        line += `]`;
      }
      return line;
    }).join("\n");

    // Previous evaluations section
    let previousSection = "";
    if (previousEvals && previousEvals.length > 0) {
      const prevLines = previousEvals.map((e: any) =>
        `- Období ${e.period}: ${e.text}`
      ).join("\n");
      previousSection = `\n## Předchozí hodnocení (pro zachycení vývoje)\n${prevLines}`;
    }

    // RVP context
    const rvpContext = getRvpContext(className);

    // --- System prompt with full pedagogical framework ---

    const defaultRules = `Jsi profesionální pedagogický asistent a expert na formativní hodnocení. Tvým úkolem je vytvořit pro učitele návrh slovního hodnocení žáka. Tento text bude sloužit pouze jako draft, který učitel následně zkontroluje, upraví a převezme za něj finální zodpovědnost.

# Pravidla pro tvorbu textu (striktně dodržuj)

1. **Struktura a obsah:** Hodnocení musí posoudit výsledky žáka v jejich vývoji. Automaticky a vyváženě zapoj informace o silných stránkách, konkrétním pokroku a případných obtížích.

2. **Naznačení dalšího rozvoje:** Text musí obsahovat zdůvodnění a konkrétní, srozumitelná doporučení, jak předcházet případným neúspěchům a jak je překonávat.

3. **Oddělení chování od učení:** Nespojuj a nesměšuj hodnocení výsledků učení s hodnocením chování, snahy nebo aktivity. Vyvaruj se frází jako „málo se snažíš", „je pilný/á", „pracuje pomalu".

4. **Respektující a popisný jazyk:** Používej výhradně popisný jazyk zaměřený na proces a výsledky učení. Absolutně se vyvaruj hodnocení osobnosti žáka (např. „jsi roztržitý") a jakéhokoliv nálepkování (např. „jsi lajdák", „jsi pomalý").

5. **Bezpečné prostředí:** Text nesmí obsahovat sarkasmus, ironii ani srovnávání žáka s ostatními spolužáky. Nepoužívej hodnocení jako formu trestu nebo odměny závislé na pocitech učitele (např. „udělal jsi mi radost").

6. **Vazba na kritéria:** Zpětná vazba musí být opřena o dodaná kritéria a důkazy o učení. Vyhni se obecným a prázdným frázím (např. „skvělé", „mohlo by to být lepší"). Každé tvrzení musí být podloženo konkrétním důkazem.`;

    const rulesSection = customSystemPrompt || defaultRules;

    const systemPrompt = `${rulesSection}

# Specifikace výstupu

- **Typ hodnocení:** ${config.label}
- **Tón:** ${config.tone}
- **Forma:** ${config.person}
- **Rozsah:** ${config.length}
- Piš v češtině. Nepoužívej formátování markdown.
- Pokud jsou k dispozici předchozí hodnocení, navázej na ně a zachyť vývoj žáka.
- Pokud je k dispozici profil žáka, přizpůsob jazyk jeho komunikačním preferencím.${preferences ? `

# Kritický pokyn od učitele (musíš ho striktně dodržet)
${preferences}` : ""}
${rvpContext}`;

    // --- User prompt with structured data ---

    const userPrompt = `Napiš ${config.label} pro žáka **${student.first_name} ${student.last_name}**.

## Kontext
- Období: ${dateFrom || "neurčeno"} – ${dateTo || "neurčeno"}${className ? `\n- Třída: ${className}` : ""}${subjectName ? `\n- Předmět: ${subjectName}` : ""}
${profileSection}${goalSection}${previousSection}

## Důkazy o učení (${proofs.length})
${proofLines}

Na základě těchto pravidel a vstupních dat napiš souvislý, smysluplný a motivující návrh slovního hodnocení.`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
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
