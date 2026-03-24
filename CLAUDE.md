# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run tests with Vitest
npm run test:watch   # Vitest watch mode
```

## Architecture

**Formativko** is a Czech educational platform for tracking student learning evidence (důkazy učení) and evaluations. Built with React 18 + TypeScript, Vite, shadcn/ui, Tailwind CSS, and Supabase as the backend.

### Directory Structure

- `src/pages/` — 21 pages with alphabetic prefix grouping:
  - **A** series: Setup (Dashboard, Student Profiles, Classes)
  - **B** series: Student management (Profiles, Details, Add Proof)
  - **C** series: Evaluations (List, Create, Edit)
  - **D** series: Lessons
  - **E** series: Capture tool (photo/media capture for quick evidence)
  - **F** series: Classes listing
- `src/components/ui/` — shadcn/ui primitives (50+ components, do not modify directly)
- `src/components/layout/` — AppLayout, AppSidebar, AppBreadcrumb
- `src/components/shared/` — Reusable domain components (StudentChip, SearchBar, DateField, LessonLinkField)
- `src/hooks/` — Data fetching hooks wrapping Supabase + React Query (useStudents, useClasses, useEvaluations, useProofs, useLessons)
- `src/contexts/` — AuthContext (Supabase auth)
- `src/integrations/supabase/` — Supabase client + auto-generated TypeScript types
- `supabase/migrations/` — Database schema migrations
- `supabase/functions/` — Edge functions

### Key Patterns

- **Path alias**: `@/` maps to `src/`
- **Server state**: TanStack React Query via hooks in `src/hooks/`
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router DOM v6
- **TypeScript**: Lenient config (noImplicitAny: false, strictNullChecks: false) — this is intentional for Lovable compatibility
- **Theming**: Custom Tailwind color tokens for proof types (`text`, `voice`, `camera`, `file`) and sidebar, with dark mode via CSS class
- **Supabase types**: Auto-generated in `src/integrations/supabase/types.ts` — do not hand-edit

### Supabase

The Supabase client is in `src/integrations/supabase/client.ts`. Auth state is managed via `AuthContext`. All database access should go through the hooks in `src/hooks/` to benefit from React Query caching.