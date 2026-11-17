-- Replace the old disabled policies and remove direct writes to booking totals,
-- agenda slots, assignments and payments. Public RPCs enforce these operations.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public' LOOP
   EXECUTE format('DROP POLICY %I ON %I.%I',r.policyname,r.schemaname,r.tablename);
 END LOOP;
 FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',r.tablename);
 END LOOP;
END; $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA privado FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

CREATE POLICY usuarios_lectura ON public.usuarios FOR SELECT TO authenticated
 USING (id_usuario=auth.uid() OR public.es_admin());
CREATE POLICY usuarios_admin ON public.usuarios FOR UPDATE TO authenticated
 USING (public.es_admin()) WITH CHECK (public.es_admin());
GRANT UPDATE(nombre,rol,activo) ON public.usuarios TO authenticated;

CREATE POLICY clientes_lectura ON public.clientes FOR SELECT TO authenticated
 USING (public.puede_ver_cliente(id_cliente));
CREATE POLICY clientes_alta ON public.clientes FOR INSERT TO authenticated
 WITH CHECK (public.usuario_activo() AND (id_usuario=auth.uid() OR public.es_admin()));
CREATE POLICY clientes_edicion ON public.clientes FOR UPDATE TO authenticated
 USING (public.usuario_activo() AND (id_usuario=auth.uid() OR public.es_admin()))
 WITH CHECK (public.usuario_activo() AND (id_usuario=auth.uid() OR public.es_admin()));
GRANT INSERT(id_usuario,nombre,telefono,email,colonia,direccion,medio_contacto,origen_cliente,notas),
 UPDATE(nombre,telefono,email,colonia,direccion,medio_contacto,origen_cliente,notas)
 ON public.clientes TO authenticated;

CREATE POLICY mascotas_lectura ON public.mascotas FOR SELECT TO authenticated
 USING (public.puede_ver_cliente(id_cliente));
CREATE POLICY mascotas_alta ON public.mascotas FOR INSERT TO authenticated
 WITH CHECK (public.usuario_activo() AND (public.es_admin() OR EXISTS(SELECT 1 FROM public.clientes
   WHERE id_cliente=mascotas.id_cliente AND id_usuario=auth.uid())));
CREATE POLICY mascotas_edicion ON public.mascotas FOR UPDATE TO authenticated
 USING (public.usuario_activo() AND (public.es_admin() OR EXISTS(SELECT 1 FROM public.clientes
   WHERE id_cliente=mascotas.id_cliente AND id_usuario=auth.uid())))
 WITH CHECK (public.usuario_activo() AND (public.es_admin() OR EXISTS(SELECT 1 FROM public.clientes
   WHERE id_cliente=mascotas.id_cliente AND id_usuario=auth.uid())));
GRANT INSERT(id_cliente,nombre,especie,raza,id_raza,tamano,peso_kg,padecimientos,comportamiento,notas,
 longitud_pelo,tipo_capa,estado_pelaje,manejo_dificil),
 UPDATE(nombre,especie,raza,id_raza,tamano,peso_kg,padecimientos,comportamiento,notas,
 longitud_pelo,tipo_capa,estado_pelaje,manejo_dificil) ON public.mascotas TO authenticated;

CREATE POLICY direcciones_lectura ON public.direcciones_cliente FOR SELECT TO authenticated
 USING (public.puede_ver_cliente(id_cliente) OR public.es_personal());
CREATE POLICY direcciones_alta ON public.direcciones_cliente FOR INSERT TO authenticated
 WITH CHECK (public.usuario_activo() AND (public.es_admin() OR EXISTS(SELECT 1 FROM public.clientes
   WHERE id_cliente=direcciones_cliente.id_cliente AND id_usuario=auth.uid())));
CREATE POLICY direcciones_edicion ON public.direcciones_cliente FOR UPDATE TO authenticated
 USING (public.usuario_activo() AND (public.es_admin() OR EXISTS(SELECT 1 FROM public.clientes
   WHERE id_cliente=direcciones_cliente.id_cliente AND id_usuario=auth.uid())))
 WITH CHECK (public.usuario_activo() AND (public.es_admin() OR EXISTS(SELECT 1 FROM public.clientes
   WHERE id_cliente=direcciones_cliente.id_cliente AND id_usuario=auth.uid())));
GRANT INSERT(id_cliente,direccion,colonia,latitud,longitud),UPDATE(direccion,colonia,latitud,longitud)
 ON public.direcciones_cliente TO authenticated;

CREATE POLICY visitas_lectura ON public.visitas FOR SELECT TO authenticated
 USING (public.puede_ver_visita(id_visita));
CREATE POLICY citas_lectura ON public.citas FOR SELECT TO authenticated
 USING (public.puede_ver_cita(id_cita));
CREATE POLICY detalles_lectura ON public.detalle_cita FOR SELECT TO authenticated
 USING (public.puede_ver_cita(id_cita));
CREATE POLICY pagos_lectura ON public.pagos FOR SELECT TO authenticated
 USING (public.puede_ver_visita(id_visita) OR public.puede_ver_cita(id_cita));
CREATE POLICY eventos_lectura ON public.eventos_visita FOR SELECT TO authenticated
 USING (public.puede_ver_visita(id_visita));
CREATE POLICY agenda_lectura ON public.agenda_estilistas FOR SELECT TO authenticated
 USING (public.es_admin() OR (public.es_personal() AND EXISTS(SELECT 1 FROM public.estilistas
   WHERE id_estilista=agenda_estilistas.id_estilista AND id_usuario=auth.uid()))
   OR EXISTS(SELECT 1 FROM public.visitas WHERE id_agenda=agenda_estilistas.id_agenda
     AND public.puede_ver_visita(id_visita)));

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['configuracion_negocio','horarios_laborales','cierres_negocio','estilistas',
   'razas','servicios','precios_servicio','descuentos_mascotas'] LOOP
   EXECUTE format('CREATE POLICY catalogo_lectura ON public.%I FOR SELECT TO authenticated USING (public.usuario_activo())',t);
   EXECUTE format('CREATE POLICY catalogo_admin ON public.%I FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin())',t);
 END LOOP;
END; $$;
GRANT UPDATE ON public.configuracion_negocio,public.horarios_laborales TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.cierres_negocio,public.razas,public.servicios,
 public.precios_servicio,public.descuentos_mascotas TO authenticated;
GRANT UPDATE(nombre,activo) ON public.estilistas TO authenticated;

DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
     'usuario_activo','es_admin','es_personal','puede_ver_cliente','puede_ver_visita','puede_ver_cita',
     'tamano_por_peso','cotizar_visita','horarios_disponibles','reservar_visita','cancelar_visita',
     'reprogramar_visita','bloquear_agenda','liberar_bloqueo','cambiar_estado_visita','valorar_visita',
     'validar_distancia_direccion','asignar_cuenta_estilista','registrar_pago_visita','validar_pago_visita']) LOOP
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',r.signature);
 END LOOP;
END; $$;
NOTIFY pgrst,'reload schema';
