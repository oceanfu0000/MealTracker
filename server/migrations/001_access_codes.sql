-- Access codes are no longer readable from the browser.
--  * check_access_code(code) answers only "valid or not" for the sign-up form.
--  * A trigger on auth.users rejects any sign-up without a valid code in its metadata, so the
--    check can't be skipped by calling the auth API directly. The code is removed from the
--    stored metadata on insert and on update (GoTrue rewrites the metadata right after sign-up).
-- Users created by an admin (service role) with app_metadata.created_by_admin = true are exempt.

DROP POLICY IF EXISTS "Public can read access codes" ON public.access_codes;

CREATE OR REPLACE FUNCTION public.check_access_code(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (SELECT 1 FROM public.access_codes WHERE code = p_code);
$$;

REVOKE ALL ON FUNCTION public.check_access_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_access_code(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_access_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'INSERT'
       AND coalesce(NEW.raw_app_meta_data ->> 'created_by_admin', 'false') <> 'true'
       AND NOT public.check_access_code(NEW.raw_user_meta_data ->> 'access_code') THEN
        RAISE EXCEPTION 'Invalid registration code';
    END IF;

    NEW.raw_user_meta_data := coalesce(NEW.raw_user_meta_data, '{}'::jsonb) - 'access_code';
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_access_code() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_access_code ON auth.users;
CREATE TRIGGER enforce_access_code
    BEFORE INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.enforce_access_code();

NOTIFY pgrst, 'reload schema';
