

# From Prototype to Production: What's Needed

The current app is a well-built interactive prototype using mock data. To make it a real tool teachers can use, here's what needs to happen, organized by priority.

---

## 1. Backend & Database (the big one)

Right now everything lives in `mockData.ts` and React state — nothing persists. We need:

- **Supabase connection** (via Lovable Cloud) with tables for:
  - `students` (first_name, last_name)
  - `classes` (name) + `class_students` junction table
  - `lessons` (title, subject, class_id, status, date)
  - `proofs_of_learning` (title, type, date, note, lesson_id, file_url) + `proof_students` junction
  - `evaluations` (student_id, subject, period, status, text)
  - `evaluation_groups` (name, type, class_id, date_from, date_to)
- **File storage** bucket for photos, uploaded files, and voice recordings
- **Replace all mock data imports** with Supabase queries (react-query already installed)
- **CRUD operations** on every entity — currently forms "submit" with toasts but save nothing

## 2. Authentication

- Teacher login (email/password or Google)
- Each teacher sees only their own students, classes, proofs, and evaluations
- RLS policies on all tables scoped to the authenticated teacher
- The dashboard greeting ("Dobrý den, Radovane!") should use the real user's name

## 3. Real File & Media Handling

- **Camera capture**: Use `navigator.mediaDevices` or file input with `capture="environment"` for actual photo taking on mobile
- **Voice recording**: Use MediaRecorder API for audio capture (currently just a button)
- **File uploads**: Wire the "Nahrát soubor" button to Supabase Storage
- **File viewing**: Display uploaded images/PDFs in proof detail pages (B03a/B03b)

## 4. AI-Powered Evaluation Drafts

The evaluation creation flow (C02a → C02b → C03) implies AI generation:
- Teacher picks type, period, class, and preferences
- System generates draft text per student based on their proofs of learning
- This requires an Edge Function calling an LLM (e.g., OpenAI) with the student's proof history as context
- The edit screen (C03) already has the approve/edit/export workflow built

## 5. Data Validation & Error Handling

- Form validation (required fields, date ranges, duplicate students)
- Loading states and error boundaries for async operations
- Optimistic updates for better UX
- Confirmation dialogs for destructive actions (deleting proofs, students)

## 6. Export & Sharing

- "Exportovat vše" on C03 should generate a real document (PDF or DOCX)
- Individual evaluation export/print
- Possibly email sharing for tripartita (parent-teacher-student meetings)

## 7. Smaller Gaps

- **Lessons CRUD**: No create/edit lesson page exists yet
- **Student deletion/editing**: No way to edit student profiles after creation
- **Class management**: No way to add/remove students from existing classes
- **Evaluation groups CRUD**: Creating/editing groups beyond the mock data
- **Search across proofs**: Global search that works across all students' proofs
- **Responsive polish**: E02 capture tool is mobile-first but needs testing on real devices

---

## Recommended Implementation Order

```text
Phase 1: Foundation
  ├── Connect Supabase (Lovable Cloud)
  ├── Create database schema (all tables above)
  ├── Add authentication (teacher login)
  └── Replace mock data with real queries

Phase 2: Core Features
  ├── CRUD for students, classes, lessons
  ├── Real proof-of-learning capture (text, file upload)
  ├── Camera & voice capture on mobile
  └── File storage integration

Phase 3: Evaluations
  ├── AI draft generation (Edge Function + LLM)
  ├── Export to PDF/DOCX
  └── Evaluation group management

Phase 4: Polish
  ├── Error handling & loading states
  ├── Mobile testing & responsive fixes
  └── Sharing & collaboration features
```

---

## Effort Estimate

Phase 1 is the largest — it touches every page. Phases 2-3 build on that foundation. The UI is already solid, so most work is wiring up the backend.

Want to start with Phase 1 (Supabase setup + auth + schema)?

