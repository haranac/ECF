import { supabase } from "../lib/supabase";
import { result } from "./api";
import { listVisits } from "./visits";

export async function loadClientData(userId) {
  const client = await result(
    supabase
      .from("clientes")
      .select("*")
      .eq("id_usuario", userId)
      .maybeSingle(),
  );
  if (!client) return { client: null, pets: [], visits: [], legacy: [] };
  const [pets, visits, legacy] = await Promise.all([
    result(
      supabase
        .from("mascotas")
        .select("*")
        .eq("id_cliente", client.id_cliente)
        .order("fecha_registro", { ascending: false }),
    ),
    listVisits(client.id_cliente),
    result(
      supabase
        .from("citas")
        .select("*,mascotas(nombre),detalle_cita(*,servicios(nombre))")
        .eq("id_cliente", client.id_cliente)
        .is("id_visita", null)
        .order("fecha", { ascending: false }),
    ),
  ]);
  return { client, pets, visits, legacy };
}
