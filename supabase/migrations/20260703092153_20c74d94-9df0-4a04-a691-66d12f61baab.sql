-- Only create profile when the email is verified (or for OAuth users where email_confirmed_at is already set).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Abort profile creation for unverified email/password signups.
  -- Supabase sets email_confirmed_at on OAuth signups immediately; email/password users get it after verification.
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'trader')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = CASE
      WHEN EXCLUDED.full_name = '' OR EXCLUDED.full_name IS NULL THEN profiles.full_name
      ELSE EXCLUDED.full_name
    END,
    phone = COALESCE(EXCLUDED.phone, profiles.phone);
  RETURN NEW;
END;
$function$;

-- Also create the profile on the transition from unverified -> verified (email confirmation)
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'trader')
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, profiles.email),
      full_name = CASE
        WHEN EXCLUDED.full_name = '' OR EXCLUDED.full_name IS NULL THEN profiles.full_name
        ELSE EXCLUDED.full_name
      END,
      phone = COALESCE(EXCLUDED.phone, profiles.phone);
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure triggers exist (on_auth_user_created is created by Supabase managed hooks; recreate on_auth_user_confirmed).
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();
