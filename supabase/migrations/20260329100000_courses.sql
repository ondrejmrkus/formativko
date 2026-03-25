-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  thematic_plan_file_name TEXT,
  thematic_plan_file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own courses" ON public.courses
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add course_id FK to lessons
ALTER TABLE public.lessons
  ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Add course_id FK to educational_goals
ALTER TABLE public.educational_goals
  ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Add course_id FK to evaluation_groups
ALTER TABLE public.evaluation_groups
  ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

-- Create storage bucket for course files (thematic plans)
INSERT INTO storage.buckets (id, name, public) VALUES ('course-files', 'course-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Teachers upload course files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'course-files' AND auth.role() = 'authenticated');

CREATE POLICY "Public read course files" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-files');

CREATE POLICY "Teachers delete own course files" ON storage.objects
  FOR DELETE USING (bucket_id = 'course-files' AND auth.role() = 'authenticated');
