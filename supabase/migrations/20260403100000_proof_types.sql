-- Custom Proof Types: allow teachers to define their own proof capture types
-- with custom name, icon, color, and fields to collect.

create table if not exists proof_types (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'pencil',
  color text not null default 'blue',
  fields text[] not null default '{text}',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index
create index idx_proof_types_teacher on proof_types(teacher_id);

-- RLS
alter table proof_types enable row level security;

create policy "Teachers see own proof types"
  on proof_types for select
  using (teacher_id = auth.uid());

create policy "Teachers insert own proof types"
  on proof_types for insert
  with check (teacher_id = auth.uid());

create policy "Teachers update own proof types"
  on proof_types for update
  using (teacher_id = auth.uid());

create policy "Teachers delete own proof types"
  on proof_types for delete
  using (teacher_id = auth.uid());

-- Add proof_type_id to proofs_of_learning
alter table proofs_of_learning
  add column if not exists proof_type_id uuid references proof_types(id) on delete set null;

create index idx_proofs_of_learning_proof_type_id on proofs_of_learning(proof_type_id);

-- Drop the old CHECK constraint on type column (keep column for display)
alter table proofs_of_learning drop constraint if exists proofs_of_learning_type_check;

-- Note: default proof types (Poznámka, Úroveň, Foto) are built-in constants
-- in the application code, not stored in this table. This table only holds
-- custom teacher-created proof types.
