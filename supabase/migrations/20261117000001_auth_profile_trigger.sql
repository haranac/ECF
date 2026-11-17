-- pg_dump excludes managed schemas. This application trigger was exported
-- separately from pg_catalog on the remote database, without changing it.
CREATE TRIGGER crear_usuario
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.crear_perfil_usuario();
