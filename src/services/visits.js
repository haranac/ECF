import { supabase } from "../lib/supabase";
import { result, rpc } from "./api";
export const getCatalog = async () => {
  const [services, prices] = await Promise.all([
    result(
      supabase
        .from("servicios")
        .select("*")
        .eq("activo", true)
        .order("id_servicio"),
    ),
    result(supabase.from("precios_servicio").select("*")),
  ]);
  return { services, prices };
};
export const quoteVisit = (address, pets) =>
  rpc("cotizar_visita", { p_id_direccion: Number(address), p_mascotas: pets });
export const findSlots = (date, address, pets) =>
  rpc("horarios_disponibles", {
    p_fecha: date,
    p_id_direccion: Number(address),
    p_mascotas: pets,
  });
export const reserveVisit = (parameters) => rpc("reservar_visita", parameters);
export const findReservation = (request) =>
  result(
    supabase
      .from("visitas")
      .select("id_visita")
      .eq("solicitud", request)
      .maybeSingle(),
  );
export function listVisits(clientId) {
  let query = supabase
    .from("visitas")
    .select(
      "*, clientes(nombre,telefono,email), agenda_estilistas(*,estilistas(nombre,id_usuario)), citas(*,detalle_cita(*)), pagos(*)",
    )
    .order("fecha_creacion", { ascending: false });
  if (clientId) query = query.eq("id_cliente", clientId);
  return result(query);
}
