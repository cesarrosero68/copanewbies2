
-- Update verify_skills_login to use plain text password comparison
CREATE OR REPLACE FUNCTION public.verify_skills_login(p_username text, p_password text)
 RETURNS TABLE(user_id uuid, user_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT su.id, su.username
  FROM skills_users su
  WHERE su.username = p_username
    AND su.password_hash = p_password;
END;
$function$;

-- Clear existing users
DELETE FROM skills_users;
