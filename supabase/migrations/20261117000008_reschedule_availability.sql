-- Reprogramming retains the reserved duration and prices. Do not reuse the
-- new-booking cotizador: catalogue/profile changes must not alter this visit.
CREATE FUNCTION public.horarios_reprogramacion(p_id_visita uuid,p_fecha date)
RETURNS TABLE(inicio timestamptz,fin timestamptz,duracion_minutos integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.visitas%ROWTYPE; a public.agenda_estilistas%ROWTYPE;
 cfg public.configuracion_negocio%ROWTYPE; h public.horarios_laborales%ROWTYPE;
 candidate timestamptz; last_start timestamptz;
BEGIN
 IF NOT public.puede_ver_visita(p_id_visita) THEN
   RAISE EXCEPTION 'No puedes consultar esta visita.' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT v FROM public.visitas WHERE id_visita=p_id_visita;
 IF v.estado NOT IN ('PENDIENTE','PENDIENTE_VALORACION','CONFIRMADA') THEN
   RAISE EXCEPTION 'La visita no admite reprogramación.' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT a FROM public.agenda_estilistas WHERE id_agenda=v.id_agenda;
 IF a.inicio<=now() AND NOT public.es_personal() THEN
   RAISE EXCEPTION 'El horario original ya comenzó.' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT cfg FROM public.configuracion_negocio WHERE id;
 SELECT * INTO h FROM public.horarios_laborales WHERE dia_semana=extract(dow FROM p_fecha)::integer AND activo;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.cierres_negocio WHERE fecha=p_fecha) THEN RETURN; END IF;
 candidate:=(p_fecha+h.apertura) AT TIME ZONE cfg.zona_horaria;
 last_start:=((p_fecha+h.cierre) AT TIME ZONE cfg.zona_horaria)-make_interval(mins=>v.duracion_minutos);
 WHILE candidate<=last_start LOOP
   BEGIN
     PERFORM privado.validar_horario(a.id_estilista,candidate,v.duracion_minutos,v.margen_minutos,a.id_agenda);
     inicio:=candidate;fin:=candidate+make_interval(mins=>v.duracion_minutos);
     duracion_minutos:=v.duracion_minutos;RETURN NEXT;
   EXCEPTION WHEN exclusion_violation OR invalid_parameter_value THEN NULL;
   END;
   candidate:=candidate+make_interval(mins=>cfg.intervalo_minutos);
 END LOOP;
END; $$;
REVOKE EXECUTE ON FUNCTION public.horarios_reprogramacion(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.horarios_reprogramacion(uuid,date) TO authenticated;
NOTIFY pgrst,'reload schema';
