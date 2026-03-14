

## Complete Component Map — All 19 Screens

Now that I have all sketches, here is the finalized component map. The app is a Czech-language teacher tool called "Tiny" with a purple/lavender design system.

### Stack Choice
React + Vite + TypeScript + Tailwind CSS (already set up). shadcn/ui components for form elements, dialogs, etc. React Router for navigation. No additional libraries needed for this static phase.

### Design System
- Background: light lavender (`~hsl(260, 40%, 95%)`)
- Primary/buttons: medium purple (`~hsl(265, 35%, 45%)`)
- Sidebar: white with rounded corners, soft shadow
- Typography: dark purple/near-black for headings, gray for secondary text
- Cards/inputs: white with subtle borders
- Destructive/accent: coral-red (used in E03 "Ukoncit lekci" button)

---

### Shared Components

| Component | Description |
|---|---|
| `AppLayout` | Sidebar (logo "Tiny", nav: Pomocnik, Profily zaku/Zaci, Hodnoceni, Lekce) + main content area. Lavender background. Collapses to hamburger on mobile. |
| `AppBreadcrumb` | Back arrow + breadcrumb trail (e.g. "Uvod → Profily zaku → ...") |
| `SearchBar` | Search input with magnifying glass icon |
| `ClassFilterBar` | Horizontal pill/chip filters for Trida and Predmet with "+ Pridat" |
| `StudentChip` | Rounded pill with student name, used in ZACI sections |
| `LessonLinkField` | "Pripojit lekci" field with + icon |
| `DateField` | Date display field (static for now) |

### A — Dashboard & Onboarding

| Screen/Component | Route | Description |
|---|---|---|
| `A01Dashboard` | `/` | 3 action cards: Vytvorit zakovske profily, Vytvorit tridu, Pridat dukaz o uceni. Each card has icon + description. |
| `A02CreateStudentProfiles` | `/create-student-profiles` | Heading, input rows for student names (first + last), "Pridat dalsiho zaka" button, bulk upload area, "Ulozit profily" button |
| `A03CreateClass` | `/create-class` | "Nazev tridy" input, "Pridat zaky" section with ~9 autocomplete-style input rows, "Pridat dalsiho zaka" + button, "Vytvorit tridu" button |

### B — Student Profiles

| Screen/Component | Route | Description |
|---|---|---|
| `B01StudentProfiles` | `/student-profiles` | Search bar, class filter chips, alphabetical student list with name + class badge + proof count, sortable columns |
| `B02StudentProfileDetail` | `/student-profiles/:id` | Student name heading, class badge, filter bar (Typ dukazu, Predmet, Datum), list of proofs with date/title/linked students, "Pridat dukaz" button |
| `B03aProofOfLearningDetailText` | `/student-profiles/:id/proof/:proofId` | Detail view: editable title with pencil icon, Lekce field, Datum field, Zaci chips, Poznamka textarea, "Ulozit" button |
| `B03bProofOfLearningDetailFile` | `/student-profiles/:id/proof-file/:proofId` | Same as B03a but adds PRILOHA section with image/file preview (checkerboard placeholder), download + fullscreen icons |
| `B04AddProofOfLearning` | `/student-profiles/:id/add-proof` | Single component with radio-based type selector (Textova poznamka, Hlasova poznamka, Vyfotit obrazek, Nahrat soubor). Content area changes based on selection: text→textarea, voice→"Zacit diktovat" button + textarea, camera→"Vyfotit obrazek" button, file→"Nahrat soubor" button. All variants share: Lekce, Datum, Zaci chips, Nazev dukazu input, Poznamka textarea, "Ulozit" button. |

### C — Evaluations

| Screen/Component | Route | Description |
|---|---|---|
| `C01Evaluations` | `/evaluations` | Search bar, class filter chips, student list showing name + class + evaluation status (draft/final/none), "Vytvorit hodnoceni" button |
| `C02aCreateEvaluationDraft` | `/evaluations/create` | Step 1: select students, choose evaluation type, subject, period. Multi-step form layout. |
| `C02bCreateEvaluationDraft` | `/evaluations/create/preview` | Step 2: AI-generated draft preview with student name, evaluation text in editable area |
| `C03EditEvaluationDrafts` | `/evaluations/edit/:id` | Side-by-side: left = list of students with status indicators, right = evaluation text editor for selected student. "Ulozit" / "Exportovat" buttons. |

### D — Lessons

| Screen/Component | Route | Description |
|---|---|---|
| `D01Lessons` | `/lessons` | Search bar + "Vytvorit lekci" button, filter bar (Trida chips, Predmet chips with + Pridat), 3 grouped sections: Probihajici lekce (with arrow icon), Pripravene lekce (with arrow icons), Probehlé lekce (no arrows, grayed out). Each lesson is a row with title. |

### E — Capture Tool (mobile-first)

| Screen/Component | Route | Description |
|---|---|---|
| `E01CaptureToolChooseClass` | `/capture` | Mobile-first. Full-screen list of class buttons (e.g. "6.A — 24 zaku", "7.B — 18 zaku"). Each button shows class name + student count. Clicking navigates to E02. |
| `E02CaptureToolAddProofs` | `/capture/:classId` | Top: class name button + "Priradit lekci" button. Main area: grid of student buttons (2 columns for ≤16, 3 columns for >16). Each button shows first name + last initial, bottom half shows colored number circles for proof counts. Bottom toolbar: pencil icon (text note), camera icon. |
| `E03CaptureToolSettings` | (modal overlay on E02) | Modal with X close button, single "Ukoncit lekci" coral-red button at bottom. |

---

### Fake Data

For each class on E01, I will generate fake Czech student names matching the counts shown in the sketch. This data will live in a shared `src/data/mockData.ts` file used across all screens.

### File Structure

```text
src/
  components/
    layout/
      AppLayout.tsx
      AppSidebar.tsx
      AppBreadcrumb.tsx
    shared/
      SearchBar.tsx
      ClassFilterBar.tsx
      StudentChip.tsx
      LessonLinkField.tsx
      DateField.tsx
  pages/
    A01Dashboard.tsx
    A02CreateStudentProfiles.tsx
    A03CreateClass.tsx
    B01StudentProfiles.tsx
    B02StudentProfileDetail.tsx
    B03aProofOfLearningDetailText.tsx
    B03bProofOfLearningDetailFile.tsx
    B04AddProofOfLearning.tsx
    C01Evaluations.tsx
    C02aCreateEvaluationDraft.tsx
    C02bCreateEvaluationDraft.tsx
    C03EditEvaluationDrafts.tsx
    D01Lessons.tsx
    E01CaptureToolChooseClass.tsx
    E02CaptureToolAddProofs.tsx
    E03CaptureToolSettings.tsx
  data/
    mockData.ts
```

### Implementation Order
1. Design system (CSS variables, colors) + AppLayout + AppSidebar
2. Shared components (breadcrumb, search, filters, chips)
3. Mock data file
4. Pages A01–A03
5. Pages B01–B04
6. Pages C01–C03
7. Page D01
8. Pages E01–E03
9. Routing in App.tsx

All static, no interactivity. Realistic Czech placeholder content throughout.

