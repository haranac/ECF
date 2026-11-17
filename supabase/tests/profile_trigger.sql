-- Run only on the local database. Every inserted row is rolled back.
BEGIN;
DO $$
DECLARE
  test_user uuid;
  requested_role text;
  actual_role text;
  expected_role text;
BEGIN
  FOREACH requested_role IN ARRAY ARRAY['CLIENTE', 'EMPLEADO', 'ADMIN', 'INVALIDO', ''] LOOP
    test_user := gen_random_uuid();
    expected_role := CASE WHEN requested_role = 'EMPLEADO' THEN 'EMPLEADO' ELSE 'CLIENTE' END;
    INSERT INTO auth.users (id, email, raw_user_meta_data)
    VALUES (test_user, test_user::text || '@example.invalid',
      jsonb_build_object('nombre', 'Prueba local', 'rol', requested_role));

    SELECT rol INTO actual_role FROM public.usuarios WHERE id_usuario = test_user;
    IF actual_role IS DISTINCT FROM expected_role THEN
      RAISE EXCEPTION 'Unexpected profile role for %: %', requested_role, actual_role;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.usuarios
      WHERE id_usuario = test_user AND nombre = 'Prueba local' AND activo) THEN
      RAISE EXCEPTION 'Profile fields were not copied correctly';
    END IF;
    RAISE NOTICE 'PASS: requested role [%] becomes %', requested_role, actual_role;
  END LOOP;

  test_user := gen_random_uuid();
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (test_user, 'missing-role@example.invalid', '{"nombre":"Prueba sin rol"}');
  IF NOT EXISTS(SELECT 1 FROM public.usuarios WHERE id_usuario=test_user AND rol='CLIENTE') THEN
    RAISE EXCEPTION 'A missing role must default to CLIENTE';
  END IF;
  RAISE NOTICE 'PASS: missing role defaults to CLIENTE';

  test_user := gen_random_uuid();
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (test_user, 'admin-check@example.invalid', '{"rol":"CLIENTE"}');
  PERFORM set_config('request.jwt.claim.sub', test_user::text, true);
  IF public.es_admin() THEN RAISE EXCEPTION 'A client was recognized as admin'; END IF;
  UPDATE public.usuarios SET rol = 'ADMIN' WHERE id_usuario = test_user;
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Admin lookup failed'; END IF;
  UPDATE public.usuarios SET activo = false WHERE id_usuario = test_user;
  IF public.es_admin() THEN RAISE EXCEPTION 'An inactive admin was accepted'; END IF;
  RAISE NOTICE 'PASS: es_admin validates role, identity and active status';
END;
$$;
ROLLBACK;
