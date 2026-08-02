ALTER TABLE public.courses ALTER COLUMN review_status SET DEFAULT 'draft'::public.course_review_status;

UPDATE public.courses c
SET review_status = 'draft'::public.course_review_status,
    is_visible = false
WHERE c.review_status = 'pending_review'
  AND NOT EXISTS (SELECT 1 FROM public.course_modules m WHERE m.course_id = c.id);