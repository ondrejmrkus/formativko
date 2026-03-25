-- Add structured profile fields to students table
ALTER TABLE public.students ADD COLUMN interests text NOT NULL DEFAULT '';
ALTER TABLE public.students ADD COLUMN communication_preferences text NOT NULL DEFAULT '';
ALTER TABLE public.students ADD COLUMN learning_styles text NOT NULL DEFAULT '';
ALTER TABLE public.students ADD COLUMN svp_details text NOT NULL DEFAULT '';
