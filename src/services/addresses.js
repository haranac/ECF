import { supabase } from "../lib/supabase";
import { result } from "./api";
export const getBusiness = () =>
  result(supabase.from("configuracion_negocio").select("*").single());
export const listAddresses = (clientId) =>
  result(
    supabase
      .from("direcciones_cliente")
      .select("*")
      .eq("id_cliente", clientId)
      .order("id_direccion", { ascending: false }),
  );
export const addressReady = (address, business) =>
  address.distancia_origen_km !== null &&
  address.origen_version === business?.origen_version;
export function saveAddress(clientId, addressId, form, point) {
  const payload = {
    direccion: form.direccion.trim(),
    colonia: form.colonia.trim() || null,
    latitud: point.latitud,
    longitud: point.longitud,
  };
  return result(
    addressId
      ? supabase
          .from("direcciones_cliente")
          .update(payload)
          .eq("id_direccion", addressId)
          .select()
          .single()
      : supabase
          .from("direcciones_cliente")
          .insert({ ...payload, id_cliente: clientId })
          .select()
          .single(),
  );
}
