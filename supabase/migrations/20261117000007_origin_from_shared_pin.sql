-- Coordinates from the place pin (!3d / !4d), not from the map's camera center.
-- The shared link resolves to Heroico Colegio Militar 1, Barrio de Santa Ana.
-- Preserve the business-provided link instead of labelling this pin as a market.
UPDATE public.configuracion_negocio
SET origen_nombre='Punto de salida indicado: Heroico Colegio Militar 1, Campeche',
 origen_url='https://maps.app.goo.gl/3KBSQgV6fxeCWpbK9',
 origen_latitud=19.8399021,origen_longitud=-90.5336569
WHERE id;
