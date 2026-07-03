CREATE OR REPLACE FUNCTION public.is_auth_user_email_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'auth', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND (
        u.email_confirmed_at IS NOT NULL
        OR COALESCE(u.raw_app_meta_data->>'provider', '') <> 'email'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_auth_user_email_verified(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_auth_user_email_verified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_auth_user_email_verified(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Email/password signups must not get a public profile until the verification link is clicked.
  IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') = 'email'
     AND NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'trader')
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
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'trader')
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own verified profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND public.is_auth_user_email_verified(auth.uid())
  AND ((role IS NULL) OR (role = 'trader'::text))
);

-- Clean up any accidental profile rows that were created for still-unverified email/password users.
DELETE FROM public.profiles p
USING auth.users u
WHERE u.id = p.id
  AND COALESCE(u.raw_app_meta_data->>'provider', 'email') = 'email'
  AND u.email_confirmed_at IS NULL;