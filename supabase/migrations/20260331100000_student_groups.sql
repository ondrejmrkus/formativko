-- Quick Groups: allow teachers to save named groups of students within a class.
-- Groups can be used in the capture tool for one-tap multi-select.

create table if not exists student_groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists student_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references student_groups(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  unique (group_id, student_id)
);

-- Indexes
create index idx_student_groups_class on student_groups(class_id);
create index idx_student_groups_teacher on student_groups(teacher_id);
create index idx_student_group_members_group on student_group_members(group_id);
create index idx_student_group_members_student on student_group_members(student_id);

-- RLS: student_groups
alter table student_groups enable row level security;

create policy "Teachers see own student groups"
  on student_groups for select
  using (teacher_id = auth.uid());

create policy "Teachers insert own student groups"
  on student_groups for insert
  with check (teacher_id = auth.uid());

create policy "Teachers update own student groups"
  on student_groups for update
  using (teacher_id = auth.uid());

create policy "Teachers delete own student groups"
  on student_groups for delete
  using (teacher_id = auth.uid());

-- RLS: student_group_members
-- Access follows the parent group's teacher_id.
alter table student_group_members enable row level security;

create policy "Teachers see own group members"
  on student_group_members for select
  using (
    exists (
      select 1 from student_groups
      where student_groups.id = student_group_members.group_id
        and student_groups.teacher_id = auth.uid()
    )
  );

create policy "Teachers insert own group members"
  on student_group_members for insert
  with check (
    exists (
      select 1 from student_groups
      where student_groups.id = student_group_members.group_id
        and student_groups.teacher_id = auth.uid()
    )
  );

create policy "Teachers delete own group members"
  on student_group_members for delete
  using (
    exists (
      select 1 from student_groups
      where student_groups.id = student_group_members.group_id
        and student_groups.teacher_id = auth.uid()
    )
  );
