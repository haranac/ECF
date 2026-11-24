import { supabase } from "../lib/supabase";
import { result } from "./api";
import { getBusiness } from "./addresses";
import { listVisits } from "./visits";

export async function loadStaffData() {
  const [visits, payments, blocks, stylists, business, legacy] =
    await Promise.all([
      listVisits(),
      result(
        supabase
          .from("pagos")
          .select("*")
          .order("fecha_pago", { ascending: false }),
      ),
      result(
        supabase
          .from("agenda_estilistas")
          .select("*")
          .eq("tipo", "BLOQUEO")
          .eq("activo", true)
          .order("inicio"),
      ),
      result(supabase.from("estilistas").select("*")),
      getBusiness(),
      result(
        supabase
          .from("citas")
          .select(
            "*,clientes(nombre,telefono),mascotas(*),detalle_cita(*,servicios(nombre)),pagos(*)",
          )
          .is("id_visita", null)
          .order("fecha", { ascending: false }),
      ),
    ]);
  return { visits, payments, blocks, stylists, business, legacy };
}
export async function loadRoutes() {
  const [addresses, business] = await Promise.all([
    result(
      supabase
        .from("direcciones_cliente")
        .select("*,clientes(nombre,telefono)")
        .order("id_direccion", { ascending: false }),
    ),
    getBusiness(),
  ]);
  return { addresses, business };
}
export const loadPetsForVisit = (visit) =>
  result(
    supabase
      .from("mascotas")
      .select("*")
      .in(
        "id_mascota",
        visit.citas.map((c) => c.id_mascota),
      ),
  );
export function inputFromQuote(quote, catalog) {
  return quote.mascotas.map((pet) => {
    const main =
      pet.servicios.find((s) =>
        catalog.services.some(
          (c) => c.id_servicio === s.id_servicio && c.tipo !== "EXTRA",
        ),
      ) || pet.servicios[0];
    return {
      id_mascota: pet.id_mascota,
      paquete: main.codigo,
      extras: pet.servicios.filter((s) => s !== main).map((s) => s.codigo),
    };
  });
}
