-- Add seating chart positions to class_students.
-- seat_row and seat_col define a student's position in the classroom grid.
-- NULL means no assigned seat (use auto-layout).

alter table class_students
  add column seat_row smallint,
  add column seat_col smallint;
