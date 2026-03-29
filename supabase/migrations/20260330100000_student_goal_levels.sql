-- Store the level a student has reached for each educational goal.
-- The level value matches one of the level_descriptors on the goal's criteria.
create table if not exists student_goal_levels (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  goal_id uuid not null references educational_goals(id) on delete cascade,
  level text not null,
  teacher_id uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (student_id, goal_id)
);

-- RLS
alter table student_goal_levels enable row level security;

create policy "Teachers see own student goal levels"
  on student_goal_levels for select
  using (teacher_id = auth.uid());

create policy "Teachers insert own student goal levels"
  on student_goal_levels for insert
  with check (teacher_id = auth.uid());

create policy "Teachers update own student goal levels"
  on student_goal_levels for update
  using (teacher_id = auth.uid());

create policy "Teachers delete own student goal levels"
  on student_goal_levels for delete
  using (teacher_id = auth.uid());
