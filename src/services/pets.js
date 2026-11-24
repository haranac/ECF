import { supabase } from "../lib/supabase";
import { result, rpc } from "./api";

export const listBreeds = () =>
  result(supabase.from("razas").select("*").order("nombre"));
export const sizeForWeight = (weight) =>
  rpc("tamano_por_peso", { p_peso: Number(weight) });
export function savePet(clientId, petId, form) {
  const payload = {
    nombre: form.nombre.trim(),
    especie: form.especie,
    id_raza: form.id_raza ? Number(form.id_raza) : null,
    raza: form.raza.trim() || null,
    peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
    longitud_pelo: form.longitud_pelo,
    tipo_capa: form.tipo_capa,
    estado_pelaje: form.estado_pelaje,
    manejo_dificil: form.manejo_dificil,
    padecimientos: form.padecimientos.trim() || null,
    comportamiento: form.comportamiento.trim() || null,
    notas: form.notas.trim() || null,
  };
  return result(
    petId
      ? supabase
          .from("mascotas")
          .update(payload)
          .eq("id_mascota", petId)
          .select()
          .single()
      : supabase
          .from("mascotas")
          .insert({ ...payload, id_cliente: clientId })
          .select()
          .single(),
  );
}
