
-- Update handle_new_user to handle duplicate emails gracefully
-- If a Google OAuth user signs up with same email as existing email signup user,
-- update the existing profile instead of failing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'trader')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = CASE
      WHEN EXCLUDED.full_name = '' OR EXCLUDED.full_name IS NULL THEN profiles.full_name
      ELSE EXCLUDED.full_name
    END;
  RETURN NEW;
END;
$function$;
