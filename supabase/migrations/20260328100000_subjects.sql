-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own subjects" ON public.subjects
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX subjects_teacher_name_unique ON public.subjects (teacher_id, lower(name));

-- Migrate existing freetext subject values into the subjects table
INSERT INTO public.subjects (teacher_id, name)
SELECT DISTINCT ON (teacher_id, lower(trim(combined.subject)))
  teacher_id, trim(combined.subject) AS name
FROM (
  SELECT teacher_id, subject FROM public.lessons WHERE trim(subject) != ''
  UNION ALL
  SELECT teacher_id, subject FROM public.educational_goals WHERE trim(subject) != ''
) combined
WHERE trim(combined.subject) != ''
ORDER BY teacher_id, lower(trim(combined.subject)), trim(combined.subject);

-- Add subject_id FK columns
ALTER TABLE public.lessons ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE public.educational_goals ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Backfill subject_id from existing freetext values
UPDATE public.lessons l
SET subject_id = s.id
FROM public.subjects s
WHERE l.teacher_id = s.teacher_id AND lower(trim(l.subject)) = lower(s.name);

UPDATE public.educational_goals g
SET subject_id = s.id
FROM public.subjects s
WHERE g.teacher_id = s.teacher_id AND lower(trim(g.subject)) = lower(s.name);

-- Drop old freetext columns
ALTER TABLE public.lessons DROP COLUMN subject;
ALTER TABLE public.educational_goals DROP COLUMN subject;
