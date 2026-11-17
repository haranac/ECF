CREATE FUNCTION public.usuario_activo() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id_usuario=auth.uid() AND activo IS TRUE);
$$;
CREATE FUNCTION public.es_personal() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id_usuario=auth.uid()
   AND activo IS TRUE AND rol IN ('ADMIN','EMPLEADO'));
$$;
CREATE FUNCTION public.puede_ver_cliente(p_cliente integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.usuario_activo() AND (public.es_admin()
   OR EXISTS(SELECT 1 FROM public.clientes WHERE id_cliente=p_cliente AND id_usuario=auth.uid())
   OR (public.es_personal() AND EXISTS(SELECT 1 FROM public.citas
     WHERE id_cliente=p_cliente AND id_usuario=auth.uid()))
   OR (public.es_personal() AND EXISTS(SELECT 1 FROM public.visitas v
     JOIN public.agenda_estilistas a USING(id_agenda) JOIN public.estilistas e USING(id_estilista)
     WHERE v.id_cliente=p_cliente AND e.id_usuario=auth.uid())));
$$;
CREATE FUNCTION public.puede_ver_visita(p_visita uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.usuario_activo() AND EXISTS(SELECT 1 FROM public.visitas v
   JOIN public.clientes c USING(id_cliente) JOIN public.agenda_estilistas a USING(id_agenda)
   JOIN public.estilistas e USING(id_estilista) WHERE v.id_visita=p_visita
   AND (c.id_usuario=auth.uid() OR public.es_admin() OR (public.es_personal() AND e.id_usuario=auth.uid())));
$$;
CREATE FUNCTION public.puede_ver_cita(p_cita integer) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.usuario_activo() AND EXISTS(SELECT 1 FROM public.citas c
   JOIN public.clientes cl USING(id_cliente) WHERE c.id_cita=p_cita
   AND (cl.id_usuario=auth.uid() OR public.es_admin()
     OR (public.es_personal() AND c.id_usuario=auth.uid())
     OR (c.id_visita IS NOT NULL AND public.puede_ver_visita(c.id_visita))));
$$;

CREATE FUNCTION public.validar_distancia_direccion(p_id_direccion bigint,p_kilometros numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.es_personal() THEN RAISE EXCEPTION 'Solo el personal puede validar recorridos.' USING ERRCODE='42501'; END IF;
 IF p_kilometros IS NULL OR p_kilometros < 0 OR p_kilometros::text IN ('NaN','Infinity','-Infinity') THEN
   RAISE EXCEPTION 'Kilometraje inválido.' USING ERRCODE='22023'; END IF;
 UPDATE public.direcciones_cliente SET distancia_origen_km=p_kilometros,
   origen_version=(SELECT origen_version FROM public.configuracion_negocio WHERE id),
   validado_por=auth.uid(),fecha_validacion=now() WHERE id_direccion=p_id_direccion;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dirección inexistente.' USING ERRCODE='22023'; END IF;
END; $$;

CREATE FUNCTION privado.exigir_personal_visita(p_visita uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.es_personal() OR NOT public.puede_ver_visita(p_visita) THEN
   RAISE EXCEPTION 'La visita no está asignada a esta cuenta.' USING ERRCODE='42501'; END IF;
END; $$;

CREATE FUNCTION public.cancelar_visita(p_id_visita uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.visitas%ROWTYPE; a public.agenda_estilistas%ROWTYPE;
BEGIN
 IF NOT public.puede_ver_visita(p_id_visita) THEN RAISE EXCEPTION 'No puedes cancelar esta visita.' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT v FROM public.visitas WHERE id_visita=p_id_visita FOR UPDATE;
 SELECT * INTO STRICT a FROM public.agenda_estilistas WHERE id_agenda=v.id_agenda;
 PERFORM pg_advisory_xact_lock(62701,a.id_estilista::integer);
 IF v.estado='CANCELADA' THEN RETURN; END IF;
 IF v.estado='COMPLETADA' OR (NOT public.es_personal() AND (a.inicio<=now() OR v.estado='EN_PROCESO')) THEN
   RAISE EXCEPTION 'Esta visita ya no admite cancelación.' USING ERRCODE='22023'; END IF;
 UPDATE public.visitas SET estado='CANCELADA' WHERE id_visita=p_id_visita;
 UPDATE public.agenda_estilistas SET activo=false WHERE id_agenda=v.id_agenda;
 UPDATE public.citas SET estado='CANCELADA' WHERE id_visita=p_id_visita;
 INSERT INTO public.eventos_visita(id_visita,accion) VALUES(p_id_visita,'CANCELADA');
END; $$;

CREATE FUNCTION public.reprogramar_visita(p_id_visita uuid,p_inicio timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.visitas%ROWTYPE; a public.agenda_estilistas%ROWTYPE;
BEGIN
 IF NOT public.puede_ver_visita(p_id_visita) THEN RAISE EXCEPTION 'No puedes reprogramar esta visita.' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT v FROM public.visitas WHERE id_visita=p_id_visita FOR UPDATE;
 IF v.estado NOT IN ('PENDIENTE','PENDIENTE_VALORACION','CONFIRMADA') THEN
   RAISE EXCEPTION 'La visita no admite reprogramación.' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT a FROM public.agenda_estilistas WHERE id_agenda=v.id_agenda;
 PERFORM pg_advisory_xact_lock(62701,a.id_estilista::integer);
 IF a.inicio<=now() AND NOT public.es_personal() THEN RAISE EXCEPTION 'El horario original ya comenzó.' USING ERRCODE='22023'; END IF;
 LOCK TABLE public.configuracion_negocio,public.horarios_laborales,public.cierres_negocio IN SHARE MODE;
 PERFORM privado.validar_horario(a.id_estilista,p_inicio,v.duracion_minutos,v.margen_minutos,a.id_agenda);
 UPDATE public.agenda_estilistas SET inicio=p_inicio,fin=p_inicio+make_interval(mins=>v.duracion_minutos),
   ocupado_hasta=p_inicio+make_interval(mins=>v.duracion_minutos+v.margen_minutos) WHERE id_agenda=v.id_agenda;
 PERFORM privado.guardar_detalles_visita(p_id_visita,v.cotizacion_snapshot);
 INSERT INTO public.eventos_visita(id_visita,accion,datos)
 VALUES(p_id_visita,'REPROGRAMADA',jsonb_build_object('inicio_anterior',a.inicio,'inicio_nuevo',p_inicio));
END; $$;

CREATE FUNCTION public.bloquear_agenda(p_inicio timestamptz,p_fin timestamptz,p_motivo text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE e public.estilistas%ROWTYPE; result_id bigint;
BEGIN
 SELECT * INTO e FROM public.estilistas WHERE activo;
 IF NOT public.es_personal() OR (NOT public.es_admin() AND e.id_usuario IS DISTINCT FROM auth.uid()) THEN
   RAISE EXCEPTION 'No puedes bloquear esta agenda.' USING ERRCODE='42501'; END IF;
 IF p_inicio IS NULL OR p_fin IS NULL OR NOT isfinite(p_inicio) OR NOT isfinite(p_fin) OR p_inicio>=p_fin
   OR p_motivo IS NULL OR length(btrim(p_motivo))=0 THEN
   RAISE EXCEPTION 'Bloqueo inválido.' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(62701,e.id_estilista::integer);
 INSERT INTO public.agenda_estilistas(id_estilista,tipo,inicio,fin,ocupado_hasta,motivo)
 VALUES(e.id_estilista,'BLOQUEO',p_inicio,p_fin,p_fin,p_motivo) RETURNING id_agenda INTO result_id;
 RETURN result_id;
END; $$;

CREATE FUNCTION public.liberar_bloqueo(p_id_agenda bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.agenda_estilistas%ROWTYPE;
BEGIN
 SELECT * INTO STRICT a FROM public.agenda_estilistas WHERE id_agenda=p_id_agenda AND tipo='BLOQUEO' FOR UPDATE;
 IF NOT public.es_personal() OR NOT (public.es_admin() OR EXISTS(SELECT 1 FROM public.estilistas
   WHERE id_estilista=a.id_estilista AND id_usuario=auth.uid())) THEN
   RAISE EXCEPTION 'No puedes liberar este bloqueo.' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(62701,a.id_estilista::integer);
 UPDATE public.agenda_estilistas SET activo=false WHERE id_agenda=p_id_agenda;
END; $$;

CREATE FUNCTION public.cambiar_estado_visita(p_id_visita uuid,p_estado text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.visitas%ROWTYPE;
BEGIN
 PERFORM privado.exigir_personal_visita(p_id_visita);
 IF p_estado='CANCELADA' THEN PERFORM public.cancelar_visita(p_id_visita); RETURN; END IF;
 SELECT * INTO STRICT v FROM public.visitas WHERE id_visita=p_id_visita FOR UPDATE;
 IF NOT ((v.estado='PENDIENTE' AND p_estado='CONFIRMADA')
   OR (v.estado='CONFIRMADA' AND p_estado='EN_PROCESO')
   OR (v.estado='EN_PROCESO' AND p_estado='COMPLETADA')) THEN
   RAISE EXCEPTION 'Transición de estado no permitida; las valoraciones deben aceptarse primero.' USING ERRCODE='22023'; END IF;
 UPDATE public.visitas SET estado=p_estado WHERE id_visita=p_id_visita;
 UPDATE public.citas SET estado=p_estado WHERE id_visita=p_id_visita;
 INSERT INTO public.eventos_visita(id_visita,accion,datos)
 VALUES(p_id_visita,'ESTADO',jsonb_build_object('anterior',v.estado,'nuevo',p_estado));
END; $$;

CREATE FUNCTION public.valorar_visita(p_id_visita uuid,p_mascotas jsonb,p_total_aceptado numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.visitas%ROWTYPE; a public.agenda_estilistas%ROWTYPE; q jsonb; before_ids jsonb; after_ids jsonb;
BEGIN
 PERFORM privado.exigir_personal_visita(p_id_visita);
 SELECT * INTO STRICT v FROM public.visitas WHERE id_visita=p_id_visita FOR UPDATE;
 IF v.estado NOT IN ('PENDIENTE','PENDIENTE_VALORACION','CONFIRMADA') THEN
   RAISE EXCEPTION 'La visita no admite una nueva valoración.' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT a FROM public.agenda_estilistas WHERE id_agenda=v.id_agenda;
 PERFORM pg_advisory_xact_lock(62701,a.id_estilista::integer);
 LOCK TABLE public.configuracion_negocio,public.horarios_laborales,public.cierres_negocio,
   public.servicios,public.precios_servicio,public.descuentos_mascotas IN SHARE MODE;
 PERFORM 1 FROM public.direcciones_cliente WHERE id_direccion=v.id_direccion FOR SHARE;
 PERFORM 1 FROM public.mascotas WHERE id_cliente=v.id_cliente FOR SHARE;
 q:=public.cotizar_visita(v.id_direccion,p_mascotas);
 IF (q->>'total')::numeric IS DISTINCT FROM p_total_aceptado THEN
   RAISE EXCEPTION 'El cliente debe aceptar el total actualizado.' USING ERRCODE='22023'; END IF;
 SELECT jsonb_agg((x->>'id_mascota')::integer ORDER BY (x->>'id_mascota')::integer)
   INTO before_ids FROM jsonb_array_elements(v.cotizacion_snapshot->'mascotas') x;
 SELECT jsonb_agg((x->>'id_mascota')::integer ORDER BY (x->>'id_mascota')::integer)
   INTO after_ids FROM jsonb_array_elements(q->'mascotas') x;
 IF before_ids IS DISTINCT FROM after_ids THEN RAISE EXCEPTION 'Para cambiar mascotas, cancela y crea otra visita.' USING ERRCODE='22023'; END IF;
 -- A valuation at arrival may retain an existing past start. Check the new end
 -- against the next reservation, without pretending the visit starts in the future.
 IF (a.inicio+make_interval(mins=>(q->>'duracion_minutos')::integer)
   AT TIME ZONE (q->>'zona_horaria'))::date<>(a.inicio AT TIME ZONE (q->>'zona_horaria'))::date
   OR (a.inicio+make_interval(mins=>(q->>'duracion_minutos')::integer)
   AT TIME ZONE (q->>'zona_horaria'))::time > (SELECT cierre FROM public.horarios_laborales
     WHERE dia_semana=extract(dow FROM a.inicio AT TIME ZONE (q->>'zona_horaria'))::integer) THEN
   RAISE EXCEPTION 'La nueva duración rebasa el cierre; reprograma la visita.' USING ERRCODE='22023'; END IF;
 UPDATE public.agenda_estilistas SET fin=a.inicio+make_interval(mins=>(q->>'duracion_minutos')::integer),
   ocupado_hasta=a.inicio+make_interval(mins=>(q->>'duracion_minutos')::integer+v.margen_minutos)
   WHERE id_agenda=v.id_agenda; -- Exclusion constraint rejects an extension into the next visit.
 UPDATE public.visitas SET cotizacion_snapshot=q,subtotal_banos=(q->>'subtotal_banos')::numeric,
   subtotal_extras=(q->>'subtotal_extras')::numeric,costo_visita=(q->>'costo_visita')::numeric,
   porcentaje_descuento=(q->>'porcentaje_descuento')::numeric,descuento=(q->>'descuento')::numeric,
   total=(q->>'total')::numeric,duracion_minutos=(q->>'duracion_minutos')::integer,
   estado='CONFIRMADA',requiere_valoracion=false,valoracion_aceptada_en=now() WHERE id_visita=p_id_visita;
 PERFORM privado.guardar_detalles_visita(p_id_visita,q);
 INSERT INTO public.eventos_visita(id_visita,accion,datos)
 VALUES(p_id_visita,'VALORACION_ACEPTADA',jsonb_build_object('total_anterior',v.total,'cotizacion',q));
END; $$;

CREATE FUNCTION public.asignar_cuenta_estilista(p_id_usuario uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE style_id bigint;
BEGIN
 IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el administrador asigna estilistas.' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.usuarios WHERE id_usuario=p_id_usuario AND activo AND rol IN ('EMPLEADO','ADMIN')) THEN
   RAISE EXCEPTION 'La cuenta debe ser de personal activo.' USING ERRCODE='22023'; END IF;
 UPDATE public.estilistas SET id_usuario=p_id_usuario WHERE activo RETURNING id_estilista INTO style_id;
 UPDATE public.citas c SET id_usuario=p_id_usuario FROM public.visitas v,public.agenda_estilistas a
   WHERE c.id_visita=v.id_visita AND v.id_agenda=a.id_agenda AND a.id_estilista=style_id
     AND v.estado NOT IN ('CANCELADA','COMPLETADA');
END; $$;

CREATE FUNCTION privado.pagado_visita(p_visita uuid) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT COALESCE(sum(CASE WHEN tipo='REEMBOLSO' THEN -monto ELSE monto END),0)
 FROM public.pagos WHERE id_visita=p_visita AND estado='VALIDADO';
$$;
CREATE FUNCTION public.registrar_pago_visita(p_id_visita uuid,p_monto numeric,p_tipo text,
 p_metodo text,p_referencia text DEFAULT NULL,p_estado text DEFAULT 'PENDIENTE') RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.visitas%ROWTYPE; paid numeric; result_id integer;
BEGIN
 PERFORM privado.exigir_personal_visita(p_id_visita);
 SELECT * INTO STRICT v FROM public.visitas WHERE id_visita=p_id_visita FOR UPDATE;
 IF p_monto IS NULL OR p_monto<=0 OR p_monto::text IN ('NaN','Infinity','-Infinity')
   OR p_tipo IS NULL OR p_tipo NOT IN ('ANTICIPO','PAGO_FINAL','REEMBOLSO')
   OR p_metodo IS NULL OR p_metodo NOT IN ('EFECTIVO','TRANSFERENCIA')
   OR p_estado IS NULL OR p_estado NOT IN ('PENDIENTE','VALIDADO') THEN
   RAISE EXCEPTION 'Datos de pago inválidos.' USING ERRCODE='22023'; END IF;
 paid:=privado.pagado_visita(p_id_visita);
 IF p_estado='VALIDADO' AND ((p_tipo='REEMBOLSO' AND p_monto>paid)
   OR (p_tipo<>'REEMBOLSO' AND paid+p_monto>v.total)) THEN
   RAISE EXCEPTION 'El importe excede el saldo permitido.' USING ERRCODE='22023'; END IF;
 IF v.estado='CANCELADA' AND p_tipo<>'REEMBOLSO' THEN RAISE EXCEPTION 'La visita está cancelada.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.pagos(id_visita,monto,tipo,metodo,referencia,estado)
 VALUES(p_id_visita,p_monto,p_tipo,p_metodo,p_referencia,p_estado) RETURNING id_pago INTO result_id;
 INSERT INTO public.eventos_visita(id_visita,accion,datos)
 VALUES(p_id_visita,'PAGO_REGISTRADO',jsonb_build_object('id_pago',result_id,'monto',p_monto,'tipo',p_tipo));
 RETURN result_id;
END; $$;
CREATE FUNCTION public.validar_pago_visita(p_id_pago integer,p_aprobar boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE p public.pagos%ROWTYPE; v public.visitas%ROWTYPE; paid numeric;
BEGIN
 SELECT * INTO STRICT p FROM public.pagos WHERE id_pago=p_id_pago;
 PERFORM privado.exigir_personal_visita(p.id_visita);
 SELECT * INTO STRICT v FROM public.visitas WHERE id_visita=p.id_visita FOR UPDATE;
 SELECT * INTO STRICT p FROM public.pagos WHERE id_pago=p_id_pago FOR UPDATE;
 IF p.estado<>'PENDIENTE' OR p_aprobar IS NULL THEN RAISE EXCEPTION 'Pago no pendiente o decisión inválida.' USING ERRCODE='22023'; END IF;
 paid:=privado.pagado_visita(p.id_visita);
 IF p_aprobar AND ((p.tipo='REEMBOLSO' AND p.monto>paid)
   OR (p.tipo<>'REEMBOLSO' AND (paid+p.monto>v.total OR v.estado='CANCELADA'))) THEN
   RAISE EXCEPTION 'El importe excede el saldo permitido.' USING ERRCODE='22023'; END IF;
 UPDATE public.pagos SET estado=CASE WHEN p_aprobar THEN 'VALIDADO' ELSE 'RECHAZADO' END WHERE id_pago=p_id_pago;
 INSERT INTO public.eventos_visita(id_visita,accion,datos)
 VALUES(p.id_visita,'PAGO_REVISADO',jsonb_build_object('id_pago',p_id_pago,'aprobado',p_aprobar));
END; $$;

CREATE FUNCTION public.cotizar_visita(p_id_direccion bigint,p_mascotas jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 cfg public.configuracion_negocio%ROWTYPE; dir public.direcciones_cliente%ROWTYPE;
 pet public.mascotas%ROWTYPE; srv public.servicios%ROWTYPE; tarifa public.precios_servicio%ROWTYPE;
 item jsonb; pets jsonb:='[]'; lines jsonb; extras jsonb; code text; main_code text;
 v_tamano text; v_n integer; v_banos numeric:=0; v_extras numeric:=0; v_pet_total numeric;
 v_pet_bano numeric; v_precio numeric; v_bano numeric; v_visita numeric; v_pct numeric;
 v_desc numeric; v_duracion integer; v_val boolean:=false; v_pet_val boolean;
BEGIN
 IF NOT public.usuario_activo() THEN RAISE EXCEPTION 'Se requiere una cuenta activa.' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT cfg FROM public.configuracion_negocio WHERE id;
 SELECT * INTO dir FROM public.direcciones_cliente WHERE id_direccion=p_id_direccion;
 IF NOT FOUND OR NOT (public.es_admin() OR EXISTS(SELECT 1 FROM public.clientes
   WHERE id_cliente=dir.id_cliente AND id_usuario=auth.uid()) OR
   (public.es_personal() AND public.puede_ver_cliente(dir.id_cliente))) THEN
   RAISE EXCEPTION 'La dirección no está disponible para esta cuenta.' USING ERRCODE='42501'; END IF;
 IF dir.distancia_origen_km IS NULL OR dir.origen_version IS DISTINCT FROM cfg.origen_version THEN
   RAISE EXCEPTION 'El recorrido del domicilio está pendiente de validación.' USING ERRCODE='22023'; END IF;
 IF p_mascotas IS NULL OR jsonb_typeof(p_mascotas)<>'array' THEN
   RAISE EXCEPTION 'Se requiere una lista de mascotas.' USING ERRCODE='22023'; END IF;
 v_n:=jsonb_array_length(p_mascotas);
 IF v_n NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Selecciona entre 1 y 20 mascotas.' USING ERRCODE='22023'; END IF;
 IF (SELECT count(DISTINCT x->>'id_mascota') FROM jsonb_array_elements(p_mascotas) x)<>v_n THEN
   RAISE EXCEPTION 'Cada mascota debe aparecer una sola vez.' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_mascotas) LOOP
   SELECT * INTO pet FROM public.mascotas WHERE id_mascota=(item->>'id_mascota')::integer
     AND id_cliente=dir.id_cliente;
   IF NOT FOUND THEN RAISE EXCEPTION 'Una mascota no pertenece al cliente de la visita.' USING ERRCODE='42501'; END IF;
   IF pet.longitud_pelo='SIN_DATOS' OR pet.tipo_capa='SIN_DATOS' OR pet.estado_pelaje='SIN_DATOS' THEN
     RAISE EXCEPTION 'Completa el tipo y estado de pelaje de %.',pet.nombre USING ERRCODE='22023'; END IF;
   v_tamano:=CASE WHEN pet.especie='GATO' THEN 'CHICO' ELSE public.tamano_por_peso(pet.peso_kg) END;
   main_code:=item->>'paquete';
   SELECT * INTO srv FROM public.servicios WHERE codigo=main_code AND activo IS TRUE
     AND tipo IN ('PAQUETE','INDIVIDUAL');
   IF NOT FOUND THEN RAISE EXCEPTION 'Paquete inexistente o inactivo.' USING ERRCODE='22023'; END IF;
   extras:=COALESCE(item->'extras','[]'::jsonb);
   IF jsonb_typeof(extras)<>'array' THEN RAISE EXCEPTION 'Los extras deben ser una lista.' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(extras) e WHERE jsonb_typeof(e)<>'string')
     OR (SELECT count(DISTINCT e) FROM jsonb_array_elements_text(extras) e)<>jsonb_array_length(extras) THEN
     RAISE EXCEPTION 'Los extras deben ser códigos sin duplicados.' USING ERRCODE='22023'; END IF;
   IF srv.tipo='INDIVIDUAL' AND jsonb_array_length(extras)>0 THEN
     RAISE EXCEPTION 'El corte de garras individual no admite extras de baño.' USING ERRCODE='22023'; END IF;
   IF srv.tipo='PAQUETE' THEN
     IF pet.tipo_capa='DOBLE' AND NOT extras ? 'DOBLE_CAPA' THEN extras:=extras||'"DOBLE_CAPA"'::jsonb; END IF;
     IF pet.manejo_dificil AND NOT extras ? 'MANEJO_DIFICIL' THEN extras:=extras||'"MANEJO_DIFICIL"'::jsonb; END IF;
     IF pet.estado_pelaje='APELMAZADO' AND NOT extras ? 'CASO_EXTREMO' THEN extras:=extras||'"CASO_EXTREMO"'::jsonb; END IF;
     IF pet.estado_pelaje='ENREDADO' AND main_code NOT IN ('BANO_RAPADO','BANO_DESENREDADO') THEN
       RAISE EXCEPTION 'Selecciona rapado o desenredado para el pelaje enredado.' USING ERRCODE='22023'; END IF;
   END IF;
   IF extras ? 'DOBLE_CAPA' AND pet.tipo_capa<>'DOBLE' THEN
     RAISE EXCEPTION 'El extra de doble capa no corresponde al perfil de la mascota.' USING ERRCODE='22023'; END IF;
   IF main_code='BANO_DESENREDADO' AND extras ? 'CASO_EXTREMO' THEN
     RAISE EXCEPTION 'El caso extremo requiere valoración para rapado, no acumula desenredado.' USING ERRCODE='22023'; END IF;
   lines:='[]'; v_pet_total:=0; v_pet_bano:=0; v_pet_val:=false;
   FOR code IN SELECT main_code UNION ALL SELECT value FROM jsonb_array_elements_text(extras) LOOP
     SELECT * INTO srv FROM public.servicios WHERE codigo=code AND activo IS TRUE;
     IF NOT FOUND OR (code<>main_code AND srv.tipo<>'EXTRA') THEN
       RAISE EXCEPTION 'Servicio incompatible o inactivo: %.',code USING ERRCODE='22023'; END IF;
     SELECT * INTO tarifa FROM public.precios_servicio WHERE id_servicio=srv.id_servicio
       AND (especie IS NULL OR especie=pet.especie) AND (tamano IS NULL OR tamano=v_tamano)
       ORDER BY (especie IS NOT NULL)::integer+(tamano IS NOT NULL)::integer DESC LIMIT 1;
     IF NOT FOUND THEN RAISE EXCEPTION 'No hay tarifa para % y %.',code,pet.especie USING ERRCODE='22023'; END IF;
     v_precio:=tarifa.precio; v_bano:=tarifa.componente_bano;
     v_pet_total:=v_pet_total+v_precio; v_pet_bano:=v_pet_bano+v_bano;
     v_pet_val:=v_pet_val OR srv.requiere_valoracion;
     lines:=lines||jsonb_build_object('id_servicio',srv.id_servicio,'codigo',code,'nombre',srv.nombre,
       'precio',v_precio,'importe_bano',v_bano,'requiere_valoracion',srv.requiere_valoracion);
   END LOOP;
   v_val:=v_val OR v_pet_val;
   v_banos:=v_banos+v_pet_bano; v_extras:=v_extras+v_pet_total-v_pet_bano;
   pets:=pets||jsonb_build_object('id_mascota',pet.id_mascota,'nombre',pet.nombre,'especie',pet.especie,
     'raza',pet.raza,'tamano',v_tamano,'peso_kg',pet.peso_kg,'longitud_pelo',pet.longitud_pelo,
     'tipo_capa',pet.tipo_capa,'estado_pelaje',pet.estado_pelaje,'manejo_dificil',pet.manejo_dificil,
     'servicios',lines,'subtotal',v_pet_total,'subtotal_bano',v_pet_bano,'requiere_valoracion',v_pet_val);
 END LOOP;
 v_visita:=greatest(cfg.visita_minima,round(dir.distancia_origen_km*cfg.precio_kilometro,2));
 SELECT porcentaje INTO v_pct FROM public.descuentos_mascotas
   WHERE minimo_mascotas<=v_n ORDER BY minimo_mascotas DESC LIMIT 1;
 v_pct:=COALESCE(v_pct,0); v_desc:=round((v_banos+v_visita)*v_pct/100,2);
 v_duracion:=ceil((v_banos+v_extras+v_visita)*60/cfg.pesos_por_hora)::integer;
 IF v_duracion<=0 THEN RAISE EXCEPTION 'La duración calculada debe ser positiva.' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('id_cliente',dir.id_cliente,'id_direccion',dir.id_direccion,
   'domicilio',to_jsonb(dir),'mascotas',pets,'cantidad_mascotas',v_n,'subtotal_banos',v_banos,
   'subtotal_extras',v_extras,'costo_visita',v_visita,'porcentaje_descuento',v_pct,'descuento',v_desc,
   'total',v_banos+v_extras+v_visita-v_desc,'duracion_minutos',v_duracion,
   'margen_minutos',cfg.margen_minutos,'pesos_por_hora',cfg.pesos_por_hora,
   'zona_horaria',cfg.zona_horaria,'requiere_valoracion',v_val);
END; $$;

CREATE FUNCTION privado.validar_horario(p_estilista bigint,p_inicio timestamptz,
 p_duracion integer,p_margen integer,p_ignorar_agenda bigint DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE cfg public.configuracion_negocio%ROWTYPE; h public.horarios_laborales%ROWTYPE;
 local_inicio timestamp; local_fin timestamp; v_fin timestamptz; v_hasta timestamptz;
BEGIN
 SELECT * INTO STRICT cfg FROM public.configuracion_negocio WHERE id;
 IF p_inicio IS NULL OR NOT isfinite(p_inicio) OR p_inicio<=now() OR p_duracion IS NULL
   OR p_duracion<=0 OR p_margen IS NULL OR p_margen<0 THEN
   RAISE EXCEPTION 'Fecha o duración inválida.' USING ERRCODE='22023'; END IF;
 local_inicio:=p_inicio AT TIME ZONE cfg.zona_horaria;
 v_fin:=p_inicio+make_interval(mins=>p_duracion); v_hasta:=v_fin+make_interval(mins=>p_margen);
 local_fin:=v_fin AT TIME ZONE cfg.zona_horaria;
 SELECT * INTO h FROM public.horarios_laborales WHERE dia_semana=extract(dow FROM local_inicio)::integer AND activo;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.cierres_negocio WHERE fecha=local_inicio::date)
   OR local_inicio::date<>local_fin::date OR local_inicio::time<h.apertura OR local_fin::time>h.cierre
   OR extract(second FROM local_inicio)<>0
   OR mod((extract(epoch FROM (local_inicio::time-h.apertura))/60)::integer,cfg.intervalo_minutos)<>0 THEN
   RAISE EXCEPTION 'El horario está fuera de la jornada o del intervalo permitido.' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.estilistas WHERE id_estilista=p_estilista AND activo) THEN
   RAISE EXCEPTION 'No hay estilista disponible.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.agenda_estilistas WHERE id_estilista=p_estilista AND activo
   AND (p_ignorar_agenda IS NULL OR id_agenda<>p_ignorar_agenda)
   AND periodo && tstzrange(p_inicio,v_hasta,'[)')) THEN
   RAISE EXCEPTION 'El horario ya está ocupado o invade el margen entre visitas.' USING ERRCODE='23P01'; END IF;
 -- Old appointments have no reliable duration: require manual reconciliation.
 IF EXISTS(SELECT 1 FROM public.citas WHERE id_visita IS NULL AND fecha=local_inicio::date
   AND estado NOT IN ('CANCELADA','REPROGRAMADA','COMPLETADA')) THEN
   RAISE EXCEPTION 'Hay citas anteriores sin duración; el personal debe conciliar la agenda.' USING ERRCODE='22023'; END IF;
END; $$;

CREATE FUNCTION public.horarios_disponibles(p_fecha date,p_id_direccion bigint,p_mascotas jsonb)
RETURNS TABLE(inicio timestamptz,fin timestamptz,id_estilista bigint,total numeric,
 duracion_minutos integer,requiere_valoracion boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q jsonb; cfg public.configuracion_negocio%ROWTYPE; h public.horarios_laborales%ROWTYPE;
 e bigint; candidate timestamptz; last_start timestamptz;
BEGIN
 q:=public.cotizar_visita(p_id_direccion,p_mascotas);
 SELECT * INTO STRICT cfg FROM public.configuracion_negocio WHERE id;
 SELECT * INTO h FROM public.horarios_laborales WHERE dia_semana=extract(dow FROM p_fecha)::integer AND activo;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.cierres_negocio WHERE fecha=p_fecha) THEN RETURN; END IF;
 SELECT s.id_estilista INTO e FROM public.estilistas s WHERE activo;
 IF e IS NULL THEN RETURN; END IF;
 candidate:=(p_fecha+h.apertura) AT TIME ZONE cfg.zona_horaria;
 last_start:=((p_fecha+h.cierre) AT TIME ZONE cfg.zona_horaria)-make_interval(mins=>(q->>'duracion_minutos')::integer);
 WHILE candidate<=last_start LOOP
   BEGIN
     PERFORM privado.validar_horario(e,candidate,(q->>'duracion_minutos')::integer,cfg.margen_minutos);
     inicio:=candidate; fin:=candidate+make_interval(mins=>(q->>'duracion_minutos')::integer);
     id_estilista:=e; total:=(q->>'total')::numeric; duracion_minutos:=(q->>'duracion_minutos')::integer;
     requiere_valoracion:=(q->>'requiere_valoracion')::boolean; RETURN NEXT;
   EXCEPTION WHEN exclusion_violation OR invalid_parameter_value THEN NULL;
   END;
   candidate:=candidate+make_interval(mins=>cfg.intervalo_minutos);
 END LOOP;
END; $$;

CREATE FUNCTION privado.guardar_detalles_visita(p_visita uuid,p_cotizacion jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.visitas%ROWTYPE; a public.agenda_estilistas%ROWTYPE; item jsonb; line jsonb;
 cita_id integer; momento timestamptz; acumulado numeric:=0; pet_minutes integer; employee uuid; tz text;
BEGIN
 SELECT * INTO STRICT v FROM public.visitas WHERE id_visita=p_visita;
 SELECT * INTO STRICT a FROM public.agenda_estilistas WHERE id_agenda=v.id_agenda;
 SELECT id_usuario INTO employee FROM public.estilistas WHERE id_estilista=a.id_estilista;
 tz:=p_cotizacion->>'zona_horaria';
 FOR item IN SELECT value FROM jsonb_array_elements(p_cotizacion->'mascotas') LOOP
   momento:=a.inicio+make_interval(mins=>ceil(acumulado*60/(p_cotizacion->>'pesos_por_hora')::numeric)::integer);
   pet_minutes:=greatest(1,ceil((item->>'subtotal')::numeric*60/(p_cotizacion->>'pesos_por_hora')::numeric)::integer);
   INSERT INTO public.citas(id_visita,id_cliente,id_mascota,fecha,hora,id_usuario,
     direccion_servicio,colonia,costo_visita,estado,duracion_estimada_minutos,fin_estimado,mascota_snapshot)
   VALUES(p_visita,v.id_cliente,(item->>'id_mascota')::integer,(momento AT TIME ZONE tz)::date,
     (momento AT TIME ZONE tz)::time,employee,v.domicilio_snapshot->>'direccion',
     v.domicilio_snapshot->>'colonia',0,
     CASE WHEN v.estado='PENDIENTE_VALORACION' THEN 'PENDIENTE' ELSE v.estado END,
     pet_minutes,momento+make_interval(mins=>pet_minutes),item)
   ON CONFLICT(id_visita,id_mascota) DO UPDATE SET fecha=EXCLUDED.fecha,hora=EXCLUDED.hora,
     id_usuario=EXCLUDED.id_usuario,estado=EXCLUDED.estado,
     duracion_estimada_minutos=EXCLUDED.duracion_estimada_minutos,
     fin_estimado=EXCLUDED.fin_estimado,mascota_snapshot=EXCLUDED.mascota_snapshot
   RETURNING id_cita INTO cita_id;
   DELETE FROM public.detalle_cita WHERE id_cita=cita_id;
   FOR line IN SELECT value FROM jsonb_array_elements(item->'servicios') LOOP
     INSERT INTO public.detalle_cita(id_cita,id_servicio,cantidad,precio,codigo_snapshot,nombre_snapshot,importe_bano,requiere_valoracion)
     VALUES(cita_id,(line->>'id_servicio')::integer,1,(line->>'precio')::numeric,
       line->>'codigo',line->>'nombre',(line->>'importe_bano')::numeric,(line->>'requiere_valoracion')::boolean);
   END LOOP;
   acumulado:=acumulado+(item->>'subtotal')::numeric;
 END LOOP;
END; $$;

CREATE FUNCTION public.reservar_visita(p_inicio timestamptz,p_id_direccion bigint,p_mascotas jsonb,
 p_total_esperado numeric,p_duracion_esperada integer,p_solicitud uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE q jsonb; style_id bigint; agenda_id bigint; visit_id uuid; cliente_id integer;
BEGIN
 IF NOT public.usuario_activo() THEN RAISE EXCEPTION 'Se requiere una cuenta activa.' USING ERRCODE='42501'; END IF;
 IF p_solicitud IS NULL THEN RAISE EXCEPTION 'Se requiere un identificador único de solicitud.' USING ERRCODE='22023'; END IF;
 SELECT id_estilista INTO style_id FROM public.estilistas WHERE activo FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No hay estilista disponible.' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(62701,style_id::integer);
 SELECT d.id_cliente INTO cliente_id FROM public.direcciones_cliente d WHERE d.id_direccion=p_id_direccion;
 IF NOT (public.es_admin() OR EXISTS(SELECT 1 FROM public.clientes WHERE id_cliente=cliente_id AND id_usuario=auth.uid())) THEN
   RAISE EXCEPTION 'No puedes reservar para ese cliente.' USING ERRCODE='42501'; END IF;
 SELECT id_visita INTO visit_id FROM public.visitas WHERE id_cliente=cliente_id AND solicitud=p_solicitud;
 IF FOUND THEN RETURN visit_id; END IF;
 LOCK TABLE public.configuracion_negocio,public.horarios_laborales,public.cierres_negocio,
   public.servicios,public.precios_servicio,public.descuentos_mascotas IN SHARE MODE;
 PERFORM 1 FROM public.direcciones_cliente WHERE id_direccion=p_id_direccion FOR SHARE;
 PERFORM 1 FROM public.mascotas WHERE id_cliente=cliente_id FOR SHARE;
 q:=public.cotizar_visita(p_id_direccion,p_mascotas);
 IF (q->>'total')::numeric IS DISTINCT FROM p_total_esperado
   OR (q->>'duracion_minutos')::integer IS DISTINCT FROM p_duracion_esperada THEN
   RAISE EXCEPTION 'La cotización cambió; vuelve a revisarla antes de reservar.' USING ERRCODE='22023'; END IF;
 PERFORM privado.validar_horario(style_id,p_inicio,p_duracion_esperada,(q->>'margen_minutos')::integer);
 INSERT INTO public.agenda_estilistas(id_estilista,tipo,inicio,fin,ocupado_hasta)
 VALUES(style_id,'VISITA',p_inicio,p_inicio+make_interval(mins=>p_duracion_esperada),
   p_inicio+make_interval(mins=>p_duracion_esperada+(q->>'margen_minutos')::integer)) RETURNING id_agenda INTO agenda_id;
 INSERT INTO public.visitas(id_cliente,id_agenda,id_direccion,solicitud,estado,domicilio_snapshot,
   cotizacion_snapshot,subtotal_banos,subtotal_extras,costo_visita,porcentaje_descuento,descuento,total,
   duracion_minutos,margen_minutos,requiere_valoracion)
 VALUES(cliente_id,agenda_id,p_id_direccion,p_solicitud,
   CASE WHEN (q->>'requiere_valoracion')::boolean THEN 'PENDIENTE_VALORACION' ELSE 'PENDIENTE' END,
   q->'domicilio',q,(q->>'subtotal_banos')::numeric,(q->>'subtotal_extras')::numeric,
   (q->>'costo_visita')::numeric,(q->>'porcentaje_descuento')::numeric,(q->>'descuento')::numeric,
   (q->>'total')::numeric,p_duracion_esperada,(q->>'margen_minutos')::integer,
   (q->>'requiere_valoracion')::boolean) RETURNING id_visita INTO visit_id;
 PERFORM privado.guardar_detalles_visita(visit_id,q);
 INSERT INTO public.eventos_visita(id_visita,accion,datos) VALUES(visit_id,'RESERVADA',q);
 RETURN visit_id;
END; $$;
