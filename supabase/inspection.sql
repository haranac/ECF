-- Read-only inventory; does not read customer records.
SELECT jsonb_build_object(
  'server_version', current_setting('server_version'),
  'schemas', (SELECT jsonb_agg(nspname ORDER BY nspname) FROM pg_namespace
    WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'),
  'tables', (SELECT jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'name', c.relname,
    'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity) ORDER BY n.nspname, c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')),
  'columns', (SELECT jsonb_agg(jsonb_build_object(
    'table', c.relname, 'name', a.attname, 'position', a.attnum,
    'type', format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull,
    'default', pg_get_expr(d.adbin, d.adrelid), 'identity', a.attidentity)
    ORDER BY c.relname, a.attnum)
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND a.attnum > 0 AND NOT a.attisdropped),
  'constraints', (SELECT jsonb_agg(jsonb_build_object(
    'table', c.relname, 'name', con.conname, 'definition', pg_get_constraintdef(con.oid))
    ORDER BY c.relname, con.conname)
    FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'),
  'indexes', (SELECT jsonb_agg(to_jsonb(i) ORDER BY tablename, indexname)
    FROM pg_indexes i WHERE schemaname = 'public'),
  'relation_privileges', (SELECT jsonb_agg(jsonb_build_object(
    'name', c.relname, 'kind', c.relkind, 'owner', pg_get_userbyid(c.relowner),
    'acl', (SELECT jsonb_agg(v ORDER BY v) FROM unnest(c.relacl::text[]) AS v))
    ORDER BY c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'S', 'v', 'm')),
  'sequences', (SELECT jsonb_agg(jsonb_build_object(
    'schema', schemaname, 'name', sequencename, 'start', start_value,
    'increment', increment_by) ORDER BY sequencename)
    FROM pg_sequences WHERE schemaname = 'public'),
  'functions', (SELECT jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'name', p.proname, 'definition', pg_get_functiondef(p.oid),
    'security_definer', p.prosecdef, 'config', p.proconfig,
    'owner', pg_get_userbyid(p.proowner),
    'acl', (SELECT jsonb_agg(v ORDER BY v) FROM unnest(p.proacl::text[]) AS v)) ORDER BY p.proname)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid
        AND d.classid = 'pg_proc'::regclass AND d.deptype = 'e')),
  'triggers', (SELECT jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'table', c.relname, 'name', t.tgname,
    'definition', pg_get_triggerdef(t.oid, true), 'enabled', t.tgenabled,
    'function_schema', fn.nspname, 'function', p.proname)
    ORDER BY n.nspname, c.relname, t.tgname)
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid JOIN pg_namespace fn ON fn.oid = p.pronamespace
    WHERE NOT t.tgisinternal AND n.nspname IN ('public', 'auth', 'storage', 'realtime')),
  'policies', (SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname, tablename, policyname)
    FROM pg_policies p WHERE schemaname IN ('public', 'auth', 'storage', 'realtime')),
  'extensions', (SELECT jsonb_agg(jsonb_build_object(
    'name', e.extname, 'schema', n.nspname, 'version', e.extversion) ORDER BY e.extname)
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace)
) AS inventory;
