


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."crear_perfil_usuario"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    rol_solicitado TEXT;
BEGIN

    rol_solicitado :=
        NEW.raw_user_meta_data->>'rol';

    IF rol_solicitado NOT IN (
        'CLIENTE',
        'EMPLEADO'
    ) THEN
        rol_solicitado := 'CLIENTE';
    END IF;

    INSERT INTO public.usuarios (
        id_usuario,
        nombre,
        rol,
        activo
    )
    VALUES (
        NEW.id,

        COALESCE(
            NEW.raw_user_meta_data->>'nombre',
            split_part(NEW.email, '@', 1),
            'Usuario'
        ),

        rol_solicitado,

        TRUE
    );

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."crear_perfil_usuario"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."es_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuarios
        WHERE id_usuario = auth.uid()
          AND rol = 'ADMIN'
          AND activo = TRUE
    );
$$;


ALTER FUNCTION "public"."es_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."citas" (
    "id_cita" integer NOT NULL,
    "id_cliente" integer NOT NULL,
    "id_mascota" integer NOT NULL,
    "fecha" "date" NOT NULL,
    "hora" time without time zone NOT NULL,
    "direccion_servicio" "text",
    "colonia" character varying(100),
    "costo_visita" numeric(10,2) DEFAULT 0,
    "estado" character varying(30) DEFAULT 'PENDIENTE'::character varying,
    "notas" "text",
    "fecha_creacion" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" "uuid",
    CONSTRAINT "citas_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['PENDIENTE'::character varying, 'CONFIRMADA'::character varying, 'EN_PROCESO'::character varying, 'COMPLETADA'::character varying, 'CANCELADA'::character varying, 'REPROGRAMADA'::character varying])::"text"[])))
);


ALTER TABLE "public"."citas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."citas_id_cita_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."citas_id_cita_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."citas_id_cita_seq" OWNED BY "public"."citas"."id_cita";



CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id_cliente" integer NOT NULL,
    "nombre" character varying(120) NOT NULL,
    "telefono" character varying(20) NOT NULL,
    "email" character varying(150),
    "colonia" character varying(100),
    "direccion" "text",
    "medio_contacto" character varying(30) DEFAULT 'WhatsApp'::character varying,
    "origen_cliente" character varying(30),
    "notas" "text",
    "fecha_registro" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" "uuid"
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."clientes_id_cliente_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."clientes_id_cliente_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."clientes_id_cliente_seq" OWNED BY "public"."clientes"."id_cliente";



CREATE TABLE IF NOT EXISTS "public"."detalle_cita" (
    "id_detalle" integer NOT NULL,
    "id_cita" integer NOT NULL,
    "id_servicio" integer NOT NULL,
    "cantidad" integer DEFAULT 1,
    "precio" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."detalle_cita" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."detalle_cita_id_detalle_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."detalle_cita_id_detalle_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."detalle_cita_id_detalle_seq" OWNED BY "public"."detalle_cita"."id_detalle";



CREATE TABLE IF NOT EXISTS "public"."mascotas" (
    "id_mascota" integer NOT NULL,
    "id_cliente" integer NOT NULL,
    "nombre" character varying(100) NOT NULL,
    "especie" character varying(20) NOT NULL,
    "raza" character varying(100),
    "tamano" character varying(20),
    "peso_kg" numeric(5,2),
    "padecimientos" "text",
    "comportamiento" "text",
    "notas" "text",
    "fecha_registro" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mascotas_especie_check" CHECK ((("especie")::"text" = ANY ((ARRAY['PERRO'::character varying, 'GATO'::character varying])::"text"[]))),
    CONSTRAINT "mascotas_tamano_check" CHECK ((("tamano")::"text" = ANY ((ARRAY['CHICO'::character varying, 'MEDIANO'::character varying, 'GRANDE'::character varying, 'GIGANTE'::character varying])::"text"[])))
);


ALTER TABLE "public"."mascotas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."mascotas_id_mascota_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."mascotas_id_mascota_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."mascotas_id_mascota_seq" OWNED BY "public"."mascotas"."id_mascota";



CREATE TABLE IF NOT EXISTS "public"."pagos" (
    "id_pago" integer NOT NULL,
    "id_cita" integer NOT NULL,
    "monto" numeric(10,2) NOT NULL,
    "tipo" character varying(20) NOT NULL,
    "metodo" character varying(30),
    "referencia" character varying(150),
    "comprobante_url" "text",
    "estado" character varying(20) DEFAULT 'PENDIENTE'::character varying,
    "fecha_pago" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_estado_check" CHECK ((("estado")::"text" = ANY ((ARRAY['PENDIENTE'::character varying, 'VALIDADO'::character varying, 'RECHAZADO'::character varying])::"text"[]))),
    CONSTRAINT "pagos_metodo_check" CHECK ((("metodo")::"text" = ANY ((ARRAY['EFECTIVO'::character varying, 'TRANSFERENCIA'::character varying])::"text"[]))),
    CONSTRAINT "pagos_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['ANTICIPO'::character varying, 'PAGO_FINAL'::character varying, 'REEMBOLSO'::character varying])::"text"[])))
);


ALTER TABLE "public"."pagos" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."pagos_id_pago_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."pagos_id_pago_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."pagos_id_pago_seq" OWNED BY "public"."pagos"."id_pago";



CREATE TABLE IF NOT EXISTS "public"."precios_servicio" (
    "id_precio" integer NOT NULL,
    "id_servicio" integer NOT NULL,
    "especie" character varying(20),
    "tamano" character varying(20),
    "precio" numeric(10,2) NOT NULL
);


ALTER TABLE "public"."precios_servicio" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."precios_servicio_id_precio_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."precios_servicio_id_precio_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."precios_servicio_id_precio_seq" OWNED BY "public"."precios_servicio"."id_precio";



CREATE TABLE IF NOT EXISTS "public"."servicios" (
    "id_servicio" integer NOT NULL,
    "nombre" character varying(120) NOT NULL,
    "descripcion" "text",
    "precio_base" numeric(10,2),
    "activo" boolean DEFAULT true
);


ALTER TABLE "public"."servicios" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."servicios_id_servicio_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."servicios_id_servicio_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."servicios_id_servicio_seq" OWNED BY "public"."servicios"."id_servicio";



CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "nombre" character varying(100) NOT NULL,
    "rol" character varying(20) NOT NULL,
    "activo" boolean DEFAULT true,
    "fecha_creacion" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" "uuid" NOT NULL,
    CONSTRAINT "usuarios_rol_check" CHECK ((("rol")::"text" = ANY ((ARRAY['ADMIN'::character varying, 'EMPLEADO'::character varying, 'CLIENTE'::character varying])::"text"[])))
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


ALTER TABLE ONLY "public"."citas" ALTER COLUMN "id_cita" SET DEFAULT "nextval"('"public"."citas_id_cita_seq"'::"regclass");



ALTER TABLE ONLY "public"."clientes" ALTER COLUMN "id_cliente" SET DEFAULT "nextval"('"public"."clientes_id_cliente_seq"'::"regclass");



ALTER TABLE ONLY "public"."detalle_cita" ALTER COLUMN "id_detalle" SET DEFAULT "nextval"('"public"."detalle_cita_id_detalle_seq"'::"regclass");



ALTER TABLE ONLY "public"."mascotas" ALTER COLUMN "id_mascota" SET DEFAULT "nextval"('"public"."mascotas_id_mascota_seq"'::"regclass");



ALTER TABLE ONLY "public"."pagos" ALTER COLUMN "id_pago" SET DEFAULT "nextval"('"public"."pagos_id_pago_seq"'::"regclass");



ALTER TABLE ONLY "public"."precios_servicio" ALTER COLUMN "id_precio" SET DEFAULT "nextval"('"public"."precios_servicio_id_precio_seq"'::"regclass");



ALTER TABLE ONLY "public"."servicios" ALTER COLUMN "id_servicio" SET DEFAULT "nextval"('"public"."servicios_id_servicio_seq"'::"regclass");



ALTER TABLE ONLY "public"."citas"
    ADD CONSTRAINT "citas_pkey" PRIMARY KEY ("id_cita");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id_cliente");



ALTER TABLE ONLY "public"."detalle_cita"
    ADD CONSTRAINT "detalle_cita_pkey" PRIMARY KEY ("id_detalle");



ALTER TABLE ONLY "public"."mascotas"
    ADD CONSTRAINT "mascotas_pkey" PRIMARY KEY ("id_mascota");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pkey" PRIMARY KEY ("id_pago");



ALTER TABLE ONLY "public"."precios_servicio"
    ADD CONSTRAINT "precios_servicio_pkey" PRIMARY KEY ("id_precio");



ALTER TABLE ONLY "public"."servicios"
    ADD CONSTRAINT "servicios_pkey" PRIMARY KEY ("id_servicio");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario");



CREATE UNIQUE INDEX "clientes_id_usuario_unique" ON "public"."clientes" USING "btree" ("id_usuario");



ALTER TABLE ONLY "public"."citas"
    ADD CONSTRAINT "citas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."clientes"("id_cliente");



ALTER TABLE ONLY "public"."citas"
    ADD CONSTRAINT "citas_id_mascota_fkey" FOREIGN KEY ("id_mascota") REFERENCES "public"."mascotas"("id_mascota");



ALTER TABLE ONLY "public"."citas"
    ADD CONSTRAINT "citas_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."detalle_cita"
    ADD CONSTRAINT "detalle_cita_id_cita_fkey" FOREIGN KEY ("id_cita") REFERENCES "public"."citas"("id_cita");



ALTER TABLE ONLY "public"."detalle_cita"
    ADD CONSTRAINT "detalle_cita_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "public"."servicios"("id_servicio");



ALTER TABLE ONLY "public"."mascotas"
    ADD CONSTRAINT "mascotas_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."clientes"("id_cliente");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_id_cita_fkey" FOREIGN KEY ("id_cita") REFERENCES "public"."citas"("id_cita");



ALTER TABLE ONLY "public"."precios_servicio"
    ADD CONSTRAINT "precios_servicio_id_servicio_fkey" FOREIGN KEY ("id_servicio") REFERENCES "public"."servicios"("id_servicio");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_auth_fk" FOREIGN KEY ("id_usuario") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Cliente actualiza su perfil" ON "public"."clientes" FOR UPDATE TO "authenticated" USING ((("id_usuario" = "auth"."uid"()) OR "public"."es_admin"())) WITH CHECK ((("id_usuario" = "auth"."uid"()) OR "public"."es_admin"()));



CREATE POLICY "Cliente actualiza sus mascotas" ON "public"."mascotas" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."id_cliente" = "mascotas"."id_cliente") AND ("clientes"."id_usuario" = "auth"."uid"())))) OR "public"."es_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."id_cliente" = "mascotas"."id_cliente") AND ("clientes"."id_usuario" = "auth"."uid"())))) OR "public"."es_admin"()));



CREATE POLICY "Cliente crea su perfil" ON "public"."clientes" FOR INSERT TO "authenticated" WITH CHECK ((("id_usuario" = "auth"."uid"()) OR "public"."es_admin"()));



CREATE POLICY "Cliente lee su perfil" ON "public"."clientes" FOR SELECT TO "authenticated" USING ((("id_usuario" = "auth"."uid"()) OR "public"."es_admin"()));



CREATE POLICY "Cliente lee sus mascotas" ON "public"."mascotas" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."id_cliente" = "mascotas"."id_cliente") AND ("clientes"."id_usuario" = "auth"."uid"())))) OR "public"."es_admin"()));



CREATE POLICY "Cliente registra mascotas" ON "public"."mascotas" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."clientes"
  WHERE (("clientes"."id_cliente" = "mascotas"."id_cliente") AND ("clientes"."id_usuario" = "auth"."uid"())))) OR "public"."es_admin"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."crear_perfil_usuario"() TO "anon";
GRANT ALL ON FUNCTION "public"."crear_perfil_usuario"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_perfil_usuario"() TO "service_role";



GRANT ALL ON FUNCTION "public"."es_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."es_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."es_admin"() TO "service_role";


















GRANT ALL ON TABLE "public"."citas" TO "anon";
GRANT ALL ON TABLE "public"."citas" TO "authenticated";
GRANT ALL ON TABLE "public"."citas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."citas_id_cita_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."citas_id_cita_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."citas_id_cita_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clientes_id_cliente_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clientes_id_cliente_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clientes_id_cliente_seq" TO "service_role";



GRANT ALL ON TABLE "public"."detalle_cita" TO "anon";
GRANT ALL ON TABLE "public"."detalle_cita" TO "authenticated";
GRANT ALL ON TABLE "public"."detalle_cita" TO "service_role";



GRANT ALL ON SEQUENCE "public"."detalle_cita_id_detalle_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."detalle_cita_id_detalle_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."detalle_cita_id_detalle_seq" TO "service_role";



GRANT ALL ON TABLE "public"."mascotas" TO "anon";
GRANT ALL ON TABLE "public"."mascotas" TO "authenticated";
GRANT ALL ON TABLE "public"."mascotas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."mascotas_id_mascota_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."mascotas_id_mascota_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."mascotas_id_mascota_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pagos" TO "anon";
GRANT ALL ON TABLE "public"."pagos" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pagos_id_pago_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pagos_id_pago_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pagos_id_pago_seq" TO "service_role";



GRANT ALL ON TABLE "public"."precios_servicio" TO "anon";
GRANT ALL ON TABLE "public"."precios_servicio" TO "authenticated";
GRANT ALL ON TABLE "public"."precios_servicio" TO "service_role";



GRANT ALL ON SEQUENCE "public"."precios_servicio_id_precio_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."precios_servicio_id_precio_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."precios_servicio_id_precio_seq" TO "service_role";



GRANT ALL ON TABLE "public"."servicios" TO "anon";
GRANT ALL ON TABLE "public"."servicios" TO "authenticated";
GRANT ALL ON TABLE "public"."servicios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."servicios_id_servicio_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."servicios_id_servicio_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."servicios_id_servicio_seq" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
