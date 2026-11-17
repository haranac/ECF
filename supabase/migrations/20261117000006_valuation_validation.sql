-- Keep trusted configuration finite and validate its timezone when edited.
ALTER TABLE public.configuracion_negocio ADD CONSTRAINT configuracion_importes_finitos
 CHECK (pesos_por_hora::text <> 'NaN' AND visita_minima::text <> 'NaN' AND precio_kilometro::text <> 'NaN');
CREATE FUNCTION privado.validar_zona_horaria() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=NEW.zona_horaria) THEN
   RAISE EXCEPTION 'Zona horaria no reconocida.' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validar_zona_horaria BEFORE INSERT OR UPDATE ON public.configuracion_negocio
FOR EACH ROW EXECUTE FUNCTION privado.validar_zona_horaria();

ALTER TABLE public.mascotas ADD COLUMN valorado_por uuid REFERENCES public.usuarios(id_usuario),
 ADD COLUMN fecha_valoracion timestamptz;
CREATE FUNCTION privado.invalidar_valoracion_mascota() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NOT public.es_personal() AND ROW(NEW.peso_kg,NEW.longitud_pelo,NEW.tipo_capa,NEW.estado_pelaje,NEW.manejo_dificil)
   IS DISTINCT FROM ROW(OLD.peso_kg,OLD.longitud_pelo,OLD.tipo_capa,OLD.estado_pelaje,OLD.manejo_dificil) THEN
   NEW.valorado_por:=NULL; NEW.fecha_valoracion:=NULL;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER invalidar_valoracion_mascota BEFORE UPDATE ON public.mascotas
FOR EACH ROW EXECUTE FUNCTION privado.invalidar_valoracion_mascota();
CREATE FUNCTION public.actualizar_mascota_valorada(p_id_visita uuid,p_id_mascota integer,p_peso numeric,
 p_longitud_pelo text,p_tipo_capa text,p_estado_pelaje text,p_manejo_dificil boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM privado.exigir_personal_visita(p_id_visita);
 IF NOT EXISTS(SELECT 1 FROM public.citas c JOIN public.visitas v USING(id_visita)
   WHERE c.id_visita=p_id_visita AND c.id_mascota=p_id_mascota
     AND v.estado IN ('PENDIENTE','PENDIENTE_VALORACION','CONFIRMADA')) THEN
   RAISE EXCEPTION 'La mascota no pertenece a una visita pendiente asignada.' USING ERRCODE='42501'; END IF;
 IF p_longitud_pelo IS NULL OR p_tipo_capa IS NULL OR p_estado_pelaje IS NULL OR p_manejo_dificil IS NULL
   OR p_longitud_pelo='SIN_DATOS' OR p_tipo_capa='SIN_DATOS' OR p_estado_pelaje='SIN_DATOS' THEN
   RAISE EXCEPTION 'La valoración debe completar los datos del pelaje.' USING ERRCODE='22023'; END IF;
 UPDATE public.mascotas SET peso_kg=p_peso,longitud_pelo=p_longitud_pelo,tipo_capa=p_tipo_capa,
   estado_pelaje=p_estado_pelaje,manejo_dificil=p_manejo_dificil,
   valorado_por=auth.uid(),fecha_valoracion=now() WHERE id_mascota=p_id_mascota;
 INSERT INTO public.eventos_visita(id_visita,accion,datos) VALUES(p_id_visita,'MASCOTA_VALORADA',
   jsonb_build_object('id_mascota',p_id_mascota,'peso_kg',p_peso,'longitud_pelo',p_longitud_pelo,
     'tipo_capa',p_tipo_capa,'estado_pelaje',p_estado_pelaje,'manejo_dificil',p_manejo_dificil));
END; $$;
REVOKE EXECUTE ON FUNCTION public.actualizar_mascota_valorada(uuid,integer,numeric,text,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.actualizar_mascota_valorada(uuid,integer,numeric,text,text,text,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.valorar_visita(p_id_visita uuid,p_mascotas jsonb,p_total_aceptado numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.visitas%ROWTYPE; a public.agenda_estilistas%ROWTYPE; q jsonb; before_ids jsonb; after_ids jsonb;
 new_end timestamp; local_start timestamp;
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
 IF ROW(q->'domicilio'->>'direccion',q->'domicilio'->>'colonia',q->'domicilio'->>'latitud',q->'domicilio'->>'longitud')
   IS DISTINCT FROM ROW(v.domicilio_snapshot->>'direccion',v.domicilio_snapshot->>'colonia',
     v.domicilio_snapshot->>'latitud',v.domicilio_snapshot->>'longitud') THEN
   RAISE EXCEPTION 'El domicilio cambió; crea una nueva visita para actualizar su recorrido.' USING ERRCODE='22023'; END IF;
 IF (q->>'total')::numeric IS DISTINCT FROM p_total_aceptado THEN
   RAISE EXCEPTION 'El cliente debe aceptar el total actualizado.' USING ERRCODE='22023'; END IF;
 IF (q->>'total')::numeric < privado.pagado_visita(p_id_visita) THEN
   RAISE EXCEPTION 'Registra primero el reembolso del importe que excede el nuevo total.' USING ERRCODE='22023'; END IF;
 SELECT jsonb_agg((x->>'id_mascota')::integer ORDER BY (x->>'id_mascota')::integer)
   INTO before_ids FROM jsonb_array_elements(v.cotizacion_snapshot->'mascotas') x;
 SELECT jsonb_agg((x->>'id_mascota')::integer ORDER BY (x->>'id_mascota')::integer)
   INTO after_ids FROM jsonb_array_elements(q->'mascotas') x;
 IF before_ids IS DISTINCT FROM after_ids THEN RAISE EXCEPTION 'Para cambiar mascotas, cancela y crea otra visita.' USING ERRCODE='22023'; END IF;
 local_start:=a.inicio AT TIME ZONE (q->>'zona_horaria');
 new_end:=(a.inicio+make_interval(mins=>(q->>'duracion_minutos')::integer)) AT TIME ZONE (q->>'zona_horaria');
 IF new_end::date<>local_start::date OR new_end::time > (SELECT cierre FROM public.horarios_laborales
   WHERE dia_semana=extract(dow FROM local_start)::integer) THEN
   RAISE EXCEPTION 'La nueva duración rebasa el cierre; reprograma la visita.' USING ERRCODE='22023'; END IF;
 UPDATE public.agenda_estilistas SET fin=a.inicio+make_interval(mins=>(q->>'duracion_minutos')::integer),
   ocupado_hasta=a.inicio+make_interval(mins=>(q->>'duracion_minutos')::integer+v.margen_minutos)
   WHERE id_agenda=v.id_agenda;
 UPDATE public.visitas SET cotizacion_snapshot=q,subtotal_banos=(q->>'subtotal_banos')::numeric,
   subtotal_extras=(q->>'subtotal_extras')::numeric,costo_visita=(q->>'costo_visita')::numeric,
   porcentaje_descuento=(q->>'porcentaje_descuento')::numeric,descuento=(q->>'descuento')::numeric,
   total=(q->>'total')::numeric,duracion_minutos=(q->>'duracion_minutos')::integer,
   estado='CONFIRMADA',requiere_valoracion=false,valoracion_aceptada_en=now() WHERE id_visita=p_id_visita;
 PERFORM privado.guardar_detalles_visita(p_id_visita,q);
 INSERT INTO public.eventos_visita(id_visita,accion,datos)
 VALUES(p_id_visita,'VALORACION_ACEPTADA',jsonb_build_object('total_anterior',v.total,'cotizacion',q));
END; $$;
NOTIFY pgrst,'reload schema';
