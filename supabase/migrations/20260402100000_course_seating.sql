-- Move seating positions from class_students to a per-course table.
-- Each course can have its own student layout.

create table if not exists course_student_seats (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  seat_row smallint not null,
  seat_col smallint not null,
  unique (course_id, student_id)
);

create index idx_course_student_seats_course on course_student_seats(course_id);

-- RLS
alter table course_student_seats enable row level security;

create policy "Teachers see own course seats"
  on course_student_seats for select
  using (
    exists (
      select 1 from courses
      where courses.id = course_student_seats.course_id
        and courses.teacher_id = auth.uid()
    )
  );

create policy "Teachers insert own course seats"
  on course_student_seats for insert
  with check (
    exists (
      select 1 from courses
      where courses.id = course_student_seats.course_id
        and courses.teacher_id = auth.uid()
    )
  );

create policy "Teachers update own course seats"
  on course_student_seats for update
  using (
    exists (
      select 1 from courses
      where courses.id = course_student_seats.course_id
        and courses.teacher_id = auth.uid()
    )
  );

create policy "Teachers delete own course seats"
  on course_student_seats for delete
  using (
    exists (
      select 1 from courses
      where courses.id = course_student_seats.course_id
        and courses.teacher_id = auth.uid()
    )
  );

-- Drop old columns from class_students
alter table class_students drop column if exists seat_row;
alter table class_students drop column if exists seat_col;
