import { supabase } from "../lib/supabase";

export async function result(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
export function rpc(name, parameters) {
  return result(supabase.rpc(name, parameters));
}
export function message(error) {
  if (error?.code === "23P01")
    return "Ese espacio ya está ocupado o invade la hora de separación. Elige otro horario.";
  if (error?.code === "42501")
    return "Tu cuenta no tiene permiso para realizar esta operación.";
  if (error?.code === "23505") return "Ya existe un registro con esos datos.";
  if (error?.code === "23514")
    return "Revisa los valores: alguno no cumple las reglas del negocio.";
  if (/fetch|network/i.test(error?.message || ""))
    return "No hay conexión. Comprueba que Supabase esté iniciado e intenta nuevamente.";
  if (error?.code === "22023" || error?.code === "P0001") return error.message;
  console.error(error);
  return "No pudimos completar la operación. Intenta nuevamente.";
}
