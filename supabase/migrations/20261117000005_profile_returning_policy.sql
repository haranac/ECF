-- INSERT ... RETURNING checks SELECT policies in the inserting statement.
-- Test ownership on the new row directly instead of reading the same row
-- through a STABLE helper's earlier snapshot.
DROP POLICY clientes_lectura ON public.clientes;
CREATE POLICY clientes_lectura ON public.clientes FOR SELECT TO authenticated
USING (public.usuario_activo() AND (id_usuario=auth.uid() OR public.puede_ver_cliente(id_cliente)));
NOTIFY pgrst,'reload schema';
