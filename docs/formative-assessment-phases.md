# Formativko — Implementation Phases (Miloš's Formative Assessment Framework)

Based on analysis of `/formativni-hodnoceni-milos.pdf` mind map.

---

## Phase 1: Structured Student Profile (Profil zaka) — DONE

Added structured fields to student profiles: interests, communication preferences, learning styles, SVP details. Enriched the AI evaluation generator with profile context.

**Files changed:**
- `supabase/migrations/20260325100000_structured_student_profile.sql`
- `src/constants/studentProfile.ts`
- `src/hooks/useStudents.ts`
- `src/pages/B02StudentProfileDetail.tsx`
- `supabase/functions/generate-evaluation/index.ts`

---

## Phase 2: Educational Goals & Evaluation Criteria (Vzdelavaci cile + Kriteria hodnoceni) — DONE

Added educational goals with evaluation criteria (including level descriptors), proof-goal linking, goal coverage on student profiles, and AI evaluation generation enriched with goal/criteria context.

**New files:**
- `supabase/migrations/20260326100000_educational_goals.sql` — 3 new tables + evaluations.goal_id
- `src/constants/goalLevels.ts` — default level descriptor template
- `src/hooks/useGoals.ts` — full CRUD + coverage hooks
- `src/pages/G01Goals.tsx` — goals list with filters
- `src/pages/G02GoalDetail.tsx` — goal detail with criteria, coverage, linked proofs
- `src/pages/G03CreateGoal.tsx` — create/edit goal form with dynamic criteria

**Modified files:**
- `src/App.tsx` — G-series routes
- `src/components/layout/AppSidebar.tsx` — "Cile" nav item
- `src/hooks/useProofs.ts` — goalIds support in createProof
- `src/hooks/useEvaluations.ts` — goalId support in createEvaluation
- `src/pages/B02StudentProfileDetail.tsx` — goal coverage section
- `src/pages/B04AddProofOfLearning.tsx` — goal selector + fix dangling skillIds ref
- `src/pages/C02aCreateEvaluationDraft.tsx` — optional goal selector step
- `supabase/functions/generate-evaluation/index.ts` — goal/criteria context in AI prompt

---

## Phase 3: Lesson Preparation (Priprava na hodinu) — DONE

Built full lesson CRUD (create/edit/detail/list), lesson-goal linking, AI goal generator, goal cloning, and pre-lesson student overview with evidence coverage matrix.

**New files:**
- `supabase/migrations/20260327100000_lesson_plans_and_goals.sql` — planned_activities, observation_focus columns + lesson_goals junction
- `supabase/functions/generate-goals/index.ts` — AI edge function for suggesting goals with criteria
- `src/pages/D02CreateLesson.tsx` — create/edit lesson form with linked goals + AI suggest
- `src/pages/D03LessonDetail.tsx` — lesson detail with plan, goals, student overview matrix, linked proofs

**Modified files:**
- `src/hooks/useLessons.ts` — full CRUD + lessonGoals + studentOverview hooks
- `src/pages/D01Lessons.tsx` — wired create button + click-through to detail
- `src/pages/G03CreateGoal.tsx` — goal cloning from existing goals
- `src/App.tsx` — D02/D03 routes

---

## Future Phases

### Initial Setup Experience (Prvni pouziti)
- Onboarding wizard: create class → add students → create first lesson → AI suggests goals
- Bulk student import (paste names, auto-parse)
- Class template suggestions based on Czech curriculum (RVP)
- Empty state guidance with next-step CTAs on all list pages
- Quick batch-edit of student profiles (SVP, communication preferences)

### Skills & Competency Map (Mapa kompetentniho rozvoje)
- Activate existing `skills` + `proof_skills` tables
- Tag proofs with skills, competency dashboard per student/class
- Link skills to educational goals

### Self-Assessment (Sebehodnotici skaly)
- Student-facing self-assessment via link/QR code
- Configurable scales per goal, compare teacher vs student assessment

### Knowledge Map & Portfolio
- Visual knowledge map (radar chart / node graph)
- Curated portfolio view, export as PDF, timeline view

### Curriculum Framework Integration (RVP / SVP)
- Import RVP expected outcomes, map school goals to RVP
- Profil absolventa, yearly goal planning, thematic plans
