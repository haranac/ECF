import { supabase } from "../lib/supabase";
import { result } from "./api";
export async function loadAdministration() {
  const [
    business,
    hours,
    closures,
    discounts,
    services,
    prices,
    users,
    stylists,
  ] = await Promise.all([
    result(supabase.from("configuracion_negocio").select("*").single()),
    result(supabase.from("horarios_laborales").select("*").order("dia_semana")),
    result(supabase.from("cierres_negocio").select("*").order("fecha")),
    result(
      supabase.from("descuentos_mascotas").select("*").order("minimo_mascotas"),
    ),
    result(supabase.from("servicios").select("*").order("id_servicio")),
    result(supabase.from("precios_servicio").select("*").order("id_precio")),
    result(
      supabase
        .from("usuarios")
        .select("id_usuario,nombre,rol,activo")
        .order("nombre"),
    ),
    result(supabase.from("estilistas").select("*")),
  ]);
  return {
    business,
    hours,
    closures,
    discounts,
    services,
    prices,
    users,
    stylists,
  };
}
export const updateBusiness = (payload) =>
  result(
    supabase
      .from("configuracion_negocio")
      .update(payload)
      .eq("id", true)
      .select()
      .single(),
  );
export const updateHours = (day, payload) =>
  result(
    supabase
      .from("horarios_laborales")
      .update(payload)
      .eq("dia_semana", day)
      .select()
      .single(),
  );
export const addClosure = (fecha, motivo) =>
  result(
    supabase
      .from("cierres_negocio")
      .insert({ fecha, motivo })
      .select()
      .single(),
  );
export const deleteClosure = (fecha) =>
  result(supabase.from("cierres_negocio").delete().eq("fecha", fecha));
export const updateDiscount = (count, porcentaje) =>
  result(
    supabase
      .from("descuentos_mascotas")
      .update({ porcentaje })
      .eq("minimo_mascotas", count)
      .select()
      .single(),
  );
export const updateService = (id, payload) =>
  result(
    supabase
      .from("servicios")
      .update(payload)
      .eq("id_servicio", id)
      .select()
      .single(),
  );
export const updatePrice = (id, payload) =>
  result(
    supabase
      .from("precios_servicio")
      .update(payload)
      .eq("id_precio", id)
      .select()
      .single(),
  );
export const updateUser = (id, payload) =>
  result(
    supabase
      .from("usuarios")
      .update(payload)
      .eq("id_usuario", id)
      .select()
      .single(),
  );
