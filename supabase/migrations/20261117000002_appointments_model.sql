-- Additive model: one visit groups the existing per-pet appointments.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS privado;
REVOKE ALL ON SCHEMA privado FROM PUBLIC, anon, authenticated;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

CREATE TABLE public.configuracion_negocio (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  zona_horaria text NOT NULL DEFAULT 'America/Merida',
  margen_minutos integer NOT NULL DEFAULT 60 CHECK (margen_minutos >= 0),
  intervalo_minutos integer NOT NULL DEFAULT 15 CHECK (intervalo_minutos BETWEEN 1 AND 60),
  pesos_por_hora numeric(10,2) NOT NULL DEFAULT 100 CHECK (pesos_por_hora > 0),
  visita_minima numeric(10,2) NOT NULL DEFAULT 40 CHECK (visita_minima >= 0),
  precio_kilometro numeric(10,2) NOT NULL DEFAULT 10 CHECK (precio_kilometro >= 0),
  origen_nombre text NOT NULL DEFAULT 'Mercado de Campeche, Campeche, México',
  origen_url text,
  origen_latitud double precision CHECK (origen_latitud BETWEEN -90 AND 90),
  origen_longitud double precision CHECK (origen_longitud BETWEEN -180 AND 180),
  origen_version bigint NOT NULL DEFAULT 1,
  CHECK ((origen_latitud IS NULL) = (origen_longitud IS NULL))
);
INSERT INTO public.configuracion_negocio (origen_url)
VALUES ('https://maps.app.goo.gl/3KBSQgV6fxeCWpbK9');

CREATE TABLE public.horarios_laborales (
  dia_semana integer PRIMARY KEY CHECK (dia_semana BETWEEN 0 AND 6),
  apertura time NOT NULL DEFAULT '08:00',
  cierre time NOT NULL DEFAULT '16:00',
  activo boolean NOT NULL DEFAULT true,
  CHECK (apertura < cierre)
);
INSERT INTO public.horarios_laborales (dia_semana, activo)
SELECT d, d <> 3 FROM generate_series(0,6) AS d;
CREATE TABLE public.cierres_negocio (
  fecha date PRIMARY KEY,
  motivo text NOT NULL CHECK (length(btrim(motivo)) > 0)
);

CREATE TABLE public.estilistas (
  id_estilista bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario uuid UNIQUE REFERENCES public.usuarios(id_usuario),
  nombre text NOT NULL CHECK (length(btrim(nombre)) > 0),
  activo boolean NOT NULL DEFAULT true
);
-- Capacity is currently one; a future migration can lift this restriction.
CREATE UNIQUE INDEX estilistas_unico_activo ON public.estilistas ((true)) WHERE activo;
INSERT INTO public.estilistas (nombre) VALUES ('Estilista principal');

CREATE TABLE public.razas (
  id_raza bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  especie varchar(20) NOT NULL CHECK (especie IN ('PERRO','GATO')),
  nombre text NOT NULL,
  UNIQUE (especie, nombre)
);
INSERT INTO public.razas (especie,nombre) VALUES
 ('PERRO','Mestizo'),('PERRO','Otra'),('PERRO','Chihuahua'),('PERRO','Poodle'),
 ('PERRO','Schnauzer'),('PERRO','Labrador Retriever'),('PERRO','Golden Retriever'),
 ('PERRO','Pastor Alemán'),('PERRO','Husky Siberiano'),('PERRO','Shih Tzu'),
 ('PERRO','Pomerania'),('PERRO','Yorkshire Terrier'),('PERRO','Bulldog'),
 ('GATO','Mestizo'),('GATO','Otra'),('GATO','Doméstico de pelo corto'),
 ('GATO','Doméstico de pelo largo'),('GATO','Siamés'),('GATO','Persa'),('GATO','Maine Coon');

CREATE FUNCTION public.tamano_por_peso(p_peso numeric) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF p_peso IS NULL OR p_peso <= 0 OR p_peso::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'El peso debe ser un número positivo.' USING ERRCODE='22023';
  END IF;
  RETURN CASE WHEN p_peso < 5 THEN 'CHICO' WHEN p_peso < 15 THEN 'MEDIANO'
    WHEN p_peso < 30 THEN 'GRANDE' ELSE 'GIGANTE' END;
END; $$;

ALTER TABLE public.mascotas
  ADD COLUMN id_raza bigint REFERENCES public.razas(id_raza),
  ADD COLUMN longitud_pelo text NOT NULL DEFAULT 'SIN_DATOS'
    CHECK (longitud_pelo IN ('CORTO','LARGO','SIN_DATOS')),
  ADD COLUMN tipo_capa text NOT NULL DEFAULT 'SIN_DATOS'
    CHECK (tipo_capa IN ('SIMPLE','DOBLE','SIN_DATOS')),
  ADD COLUMN estado_pelaje text NOT NULL DEFAULT 'SIN_DATOS'
    CHECK (estado_pelaje IN ('NORMAL','ENREDADO','APELMAZADO','SIN_DATOS')),
  ADD COLUMN manejo_dificil boolean NOT NULL DEFAULT false;

CREATE FUNCTION privado.normalizar_mascota() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_raza public.razas%ROWTYPE;
BEGIN
  IF NEW.peso_kg IS NOT NULL AND (NEW.peso_kg <= 0 OR NEW.peso_kg::text IN ('NaN','Infinity','-Infinity')) THEN
    RAISE EXCEPTION 'El peso debe ser positivo.' USING ERRCODE='22023';
  END IF;
  IF NEW.especie = 'GATO' THEN NEW.tamano := 'CHICO';
  ELSIF NEW.peso_kg IS NOT NULL THEN NEW.tamano := public.tamano_por_peso(NEW.peso_kg); END IF;
  IF NEW.id_raza IS NOT NULL THEN
    SELECT * INTO STRICT v_raza FROM public.razas WHERE id_raza=NEW.id_raza;
    IF v_raza.especie <> NEW.especie THEN RAISE EXCEPTION 'La raza no corresponde a la especie.'; END IF;
    NEW.raza := v_raza.nombre;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER normalizar_mascota BEFORE INSERT OR UPDATE ON public.mascotas
FOR EACH ROW EXECUTE FUNCTION privado.normalizar_mascota();

CREATE TABLE public.direcciones_cliente (
  id_direccion bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cliente integer NOT NULL REFERENCES public.clientes(id_cliente),
  direccion text NOT NULL CHECK (length(btrim(direccion)) > 0),
  colonia varchar(100),
  latitud double precision CHECK (latitud BETWEEN -90 AND 90),
  longitud double precision CHECK (longitud BETWEEN -180 AND 180),
  distancia_origen_km numeric(10,3) CHECK (distancia_origen_km >= 0 AND distancia_origen_km::text <> 'NaN'),
  origen_version bigint,
  validado_por uuid REFERENCES public.usuarios(id_usuario),
  fecha_validacion timestamptz,
  CHECK ((latitud IS NULL) = (longitud IS NULL)),
  CHECK ((distancia_origen_km IS NULL AND origen_version IS NULL AND fecha_validacion IS NULL)
    OR (distancia_origen_km IS NOT NULL AND origen_version IS NOT NULL AND fecha_validacion IS NOT NULL))
);
CREATE INDEX direcciones_cliente_cliente_idx ON public.direcciones_cliente(id_cliente);
CREATE FUNCTION privado.invalidar_distancia() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF ROW(NEW.direccion,NEW.colonia,NEW.latitud,NEW.longitud)
     IS DISTINCT FROM ROW(OLD.direccion,OLD.colonia,OLD.latitud,OLD.longitud) THEN
    NEW.distancia_origen_km:=NULL; NEW.origen_version:=NULL;
    NEW.validado_por:=NULL; NEW.fecha_validacion:=NULL;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER invalidar_distancia BEFORE UPDATE ON public.direcciones_cliente
FOR EACH ROW EXECUTE FUNCTION privado.invalidar_distancia();
CREATE FUNCTION privado.versionar_origen() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF ROW(NEW.origen_nombre,NEW.origen_url,NEW.origen_latitud,NEW.origen_longitud)
    IS DISTINCT FROM ROW(OLD.origen_nombre,OLD.origen_url,OLD.origen_latitud,OLD.origen_longitud) THEN
    NEW.origen_version:=OLD.origen_version+1;
  ELSE NEW.origen_version:=OLD.origen_version; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER versionar_origen BEFORE UPDATE ON public.configuracion_negocio
FOR EACH ROW EXECUTE FUNCTION privado.versionar_origen();

ALTER TABLE public.servicios
  ADD COLUMN codigo text UNIQUE,
  ADD COLUMN tipo text NOT NULL DEFAULT 'PAQUETE' CHECK (tipo IN ('PAQUETE','EXTRA','INDIVIDUAL')),
  ADD COLUMN requiere_valoracion boolean NOT NULL DEFAULT false;
ALTER TABLE public.precios_servicio
  ADD COLUMN componente_bano numeric(10,2) NOT NULL DEFAULT 0 CHECK (componente_bano >= 0),
  ADD CONSTRAINT precios_no_negativos CHECK (precio >= 0 AND precio::text <> 'NaN' AND componente_bano <= precio),
  ADD CONSTRAINT tarifa_unica UNIQUE NULLS NOT DISTINCT(id_servicio, especie, tamano);
INSERT INTO public.servicios(codigo,nombre,descripcion,tipo,requiere_valoracion) VALUES
 ('BANO_INTEGRAL','Baño integral','Baño, secado, deslanado básico, corte de garras, limpieza de oídos y paliacate.','PAQUETE',false),
 ('BANO_RAPADO','Baño integral + rapado parejo','Incluye el baño. Rapado no estético.','PAQUETE',false),
 ('BANO_DESENREDADO','Baño integral + desenredado','Incluye baño y $200 por desenredado; sujeto a valoración.','PAQUETE',true),
 ('ASUNTOL','Baño con Asuntol','Extra sobre un paquete de baño.','EXTRA',false),
 ('GARRAS','Corte de garras individual','No se cobra por separado si está incluido en un baño.','INDIVIDUAL',false),
 ('DOBLE_CAPA','Doble capa','Extra sobre un paquete de baño.','EXTRA',false),
 ('MANEJO_DIFICIL','Manejo difícil','Mascota agresiva o difícil.','EXTRA',false),
 ('CASO_EXTREMO','Caso extremo','Pelaje apelmazado o nudos severos; sujeto a valoración.','EXTRA',true);
INSERT INTO public.precios_servicio(id_servicio,especie,tamano,precio,componente_bano)
SELECT s.id_servicio,t.especie,t.tamano,t.base+pa.extra,t.base
FROM (VALUES ('PERRO','CHICO',100::numeric),('PERRO','MEDIANO',150),
 ('PERRO','GRANDE',200),('PERRO','GIGANTE',250),('GATO','CHICO',150)) AS t(especie,tamano,base)
CROSS JOIN (VALUES ('BANO_INTEGRAL',0),('BANO_RAPADO',100),('BANO_DESENREDADO',200)) AS pa(codigo,extra)
JOIN public.servicios s ON s.codigo=pa.codigo;
INSERT INTO public.precios_servicio(id_servicio,precio)
SELECT s.id_servicio,e.precio FROM (VALUES ('ASUNTOL',50),('GARRAS',35),
 ('DOBLE_CAPA',100),('MANEJO_DIFICIL',100),('CASO_EXTREMO',400)) AS e(codigo,precio)
JOIN public.servicios s ON s.codigo=e.codigo;

CREATE TABLE public.descuentos_mascotas (
  minimo_mascotas integer PRIMARY KEY CHECK (minimo_mascotas >= 1),
  porcentaje numeric(5,2) NOT NULL CHECK (porcentaje BETWEEN 0 AND 100)
);
INSERT INTO public.descuentos_mascotas VALUES(1,0),(2,5),(3,10),(4,15);

CREATE TABLE public.agenda_estilistas (
  id_agenda bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_estilista bigint NOT NULL REFERENCES public.estilistas(id_estilista),
  tipo text NOT NULL CHECK (tipo IN ('VISITA','BLOQUEO')),
  inicio timestamptz NOT NULL,
  fin timestamptz NOT NULL,
  ocupado_hasta timestamptz NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  motivo text,
  periodo tstzrange GENERATED ALWAYS AS (tstzrange(inicio,ocupado_hasta,'[)')) STORED,
  CHECK (inicio < fin AND fin <= ocupado_hasta),
  CHECK (tipo <> 'BLOQUEO' OR (motivo IS NOT NULL AND length(btrim(motivo)) > 0)),
  CONSTRAINT agenda_sin_cruces EXCLUDE USING gist
    (id_estilista WITH =, periodo WITH &&) WHERE (activo)
);
CREATE TABLE public.visitas (
  id_visita uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente integer NOT NULL REFERENCES public.clientes(id_cliente),
  id_agenda bigint NOT NULL UNIQUE REFERENCES public.agenda_estilistas(id_agenda),
  id_direccion bigint NOT NULL REFERENCES public.direcciones_cliente(id_direccion),
  solicitud uuid NOT NULL,
  estado text NOT NULL CHECK (estado IN ('PENDIENTE','PENDIENTE_VALORACION','CONFIRMADA','EN_PROCESO','COMPLETADA','CANCELADA')),
  domicilio_snapshot jsonb NOT NULL,
  cotizacion_snapshot jsonb NOT NULL,
  subtotal_banos numeric(12,2) NOT NULL CHECK (subtotal_banos >= 0),
  subtotal_extras numeric(12,2) NOT NULL CHECK (subtotal_extras >= 0),
  costo_visita numeric(12,2) NOT NULL CHECK (costo_visita >= 0),
  porcentaje_descuento numeric(5,2) NOT NULL CHECK (porcentaje_descuento BETWEEN 0 AND 100),
  descuento numeric(12,2) NOT NULL CHECK (descuento >= 0),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  duracion_minutos integer NOT NULL CHECK (duracion_minutos > 0),
  margen_minutos integer NOT NULL CHECK (margen_minutos >= 0),
  requiere_valoracion boolean NOT NULL,
  valoracion_aceptada_en timestamptz,
  fecha_creacion timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id_cliente,solicitud),
  CHECK (total = subtotal_banos + subtotal_extras + costo_visita - descuento)
);
CREATE INDEX visitas_cliente_idx ON public.visitas(id_cliente);
CREATE TABLE public.eventos_visita (
  id_evento bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_visita uuid NOT NULL REFERENCES public.visitas(id_visita),
  actor uuid DEFAULT auth.uid(),
  accion text NOT NULL,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  fecha timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eventos_visita_visita_idx ON public.eventos_visita(id_visita);
ALTER TABLE public.citas
  ADD COLUMN id_visita uuid REFERENCES public.visitas(id_visita),
  ADD COLUMN duracion_estimada_minutos integer CHECK (duracion_estimada_minutos > 0),
  ADD COLUMN fin_estimado timestamptz,
  ADD COLUMN mascota_snapshot jsonb,
  ADD CONSTRAINT cita_mascota_por_visita UNIQUE(id_visita,id_mascota);
CREATE INDEX citas_cliente_idx ON public.citas(id_cliente);
CREATE INDEX citas_usuario_idx ON public.citas(id_usuario);
CREATE INDEX citas_visita_idx ON public.citas(id_visita);
ALTER TABLE public.detalle_cita
  ADD COLUMN codigo_snapshot text,
  ADD COLUMN nombre_snapshot text,
  ADD COLUMN importe_bano numeric(12,2) NOT NULL DEFAULT 0 CHECK (importe_bano >= 0),
  ADD COLUMN requiere_valoracion boolean NOT NULL DEFAULT false;
ALTER TABLE public.pagos ALTER COLUMN id_cita DROP NOT NULL;
ALTER TABLE public.pagos
  ADD COLUMN id_visita uuid REFERENCES public.visitas(id_visita),
  ADD CONSTRAINT pago_destino_unico CHECK ((id_cita IS NOT NULL) <> (id_visita IS NOT NULL)),
  ADD CONSTRAINT pago_monto_positivo CHECK (monto > 0 AND monto::text <> 'NaN');
CREATE INDEX pagos_visita_idx ON public.pagos(id_visita);
CREATE INDEX pagos_cita_idx ON public.pagos(id_cita);

-- Fix the confirmed NULL-role bug without permitting self-assigned administrators.
CREATE OR REPLACE FUNCTION public.crear_perfil_usuario() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rol text;
BEGIN
  v_rol := COALESCE(NEW.raw_user_meta_data->>'rol','CLIENTE');
  IF v_rol NOT IN ('CLIENTE','EMPLEADO') THEN v_rol:='CLIENTE'; END IF;
  INSERT INTO public.usuarios(id_usuario,nombre,rol,activo)
  VALUES(NEW.id,COALESCE(NULLIF(btrim(NEW.raw_user_meta_data->>'nombre'),''),
    NULLIF(split_part(NEW.email,'@',1),''),'Usuario'),v_rol,true);
  RETURN NEW;
END; $$;
