-- Repoint FK to auth.users so consent can be recorded immediately at signup,
-- before the profile row is created on email confirmation.
ALTER TABLE public.user_legal_acceptances
  DROP CONSTRAINT IF EXISTS user_legal_acceptances_user_id_fkey;

-- Backfill orphaned rows by matching email to an existing auth user.
UPDATE public.user_legal_acceptances ula
SET user_id = u.id
FROM auth.users u
WHERE ula.user_id IS NULL
  AND LOWER(u.email) = LOWER(ula.email);

ALTER TABLE public.user_legal_acceptances
  ADD CONSTRAINT user_legal_acceptances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;