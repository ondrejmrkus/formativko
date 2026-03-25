-- Educational Goals
CREATE TABLE public.educational_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.educational_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own goals" ON public.educational_goals
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.educational_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Evaluation Criteria (belongs to a goal)
CREATE TABLE public.evaluation_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.educational_goals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  level_descriptors JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own criteria" ON public.evaluation_criteria
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.educational_goals
    WHERE id = goal_id AND teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.educational_goals
    WHERE id = goal_id AND teacher_id = auth.uid()
  ));

-- Proof-Goal junction
CREATE TABLE public.proof_goals (
  proof_id UUID NOT NULL REFERENCES public.proofs_of_learning(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.educational_goals(id) ON DELETE CASCADE,
  PRIMARY KEY (proof_id, goal_id)
);
ALTER TABLE public.proof_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own proof_goals" ON public.proof_goals
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.proofs_of_learning
    WHERE id = proof_id AND teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.proofs_of_learning
    WHERE id = proof_id AND teacher_id = auth.uid()
  ));

-- Link evaluations to goals
ALTER TABLE public.evaluations ADD COLUMN goal_id UUID REFERENCES public.educational_goals(id) ON DELETE SET NULL;
