ALTER TABLE public.descuentos_mascotas
 ADD CONSTRAINT descuento_maximo_quince CHECK (porcentaje<=15),
 ADD CONSTRAINT una_mascota_sin_descuento CHECK (minimo_mascotas<>1 OR porcentaje=0);
