-- Lesson plan fields
ALTER TABLE public.lessons
  ADD COLUMN planned_activities TEXT NOT NULL DEFAULT '',
  ADD COLUMN observation_focus TEXT NOT NULL DEFAULT '';

-- Lesson-Goal junction
CREATE TABLE public.lesson_goals (
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.educational_goals(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, goal_id)
);
ALTER TABLE public.lesson_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own lesson_goals" ON public.lesson_goals
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.lessons
    WHERE id = lesson_id AND teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lessons
    WHERE id = lesson_id AND teacher_id = auth.uid()
  ));
