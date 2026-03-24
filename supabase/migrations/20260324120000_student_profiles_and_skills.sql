-- Student profile enhancements
ALTER TABLE public.students ADD COLUMN svp boolean NOT NULL DEFAULT false;
ALTER TABLE public.students ADD COLUMN notes text NOT NULL DEFAULT '';

-- Skills (competency/topic tags for proofs)
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, name)
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own skills" ON public.skills
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- Proof-Skill junction
CREATE TABLE public.proof_skills (
  proof_id UUID NOT NULL REFERENCES public.proofs_of_learning(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (proof_id, skill_id)
);
ALTER TABLE public.proof_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own proof_skills" ON public.proof_skills
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.proofs_of_learning
    WHERE id = proof_id AND teacher_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.proofs_of_learning
    WHERE id = proof_id AND teacher_id = auth.uid()
  ));
