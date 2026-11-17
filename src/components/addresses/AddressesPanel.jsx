import { useCallback, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import useQuery from "../../hooks/useQuery";
import {
  addressReady,
  getBusiness,
  listAddresses,
} from "../../services/addresses";
import { message } from "../../services/api";
import { Button, Empty, Notice } from "../ui";
import AddressForm from "./AddressForm";
export default function AddressesPanel({ client, onProfile }) {
  const clientId = client?.id_cliente;
  const load = useCallback(
    async () =>
      clientId
        ? {
            addresses: await listAddresses(clientId),
            business: await getBusiness(),
          }
        : { addresses: [] },
    [clientId],
  );
  const query = useQuery(load);
  const [editing, setEditing] = useState(null);
  const [success, setSuccess] = useState("");
  if (!clientId)
    return (
      <div className="cw-panel">
        <Empty title="Primero completa tu perfil">
          Necesitamos tu nombre y teléfono para preparar la visita.
          {onProfile && (
            <div className="mt-4">
              <Button onClick={onProfile}>Completar perfil</Button>
            </div>
          )}
        </Empty>
      </div>
    );
  return (
    <section className="cw-panel space-y-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-canwash-dark">
            Mis domicilios
          </h2>
          <p className="mt-1 text-sm text-canwash-muted">
            Elige dónde recibirá tu mascota al estilista.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            tone="ghost"
            aria-label="Actualizar domicilios"
            onClick={query.reload}
          >
            <RefreshCw size={17} />
          </Button>
          <Button
            onClick={() => {
              setSuccess("");
              setEditing({});
            }}
          >
            <Plus size={17} /> Agregar domicilio
          </Button>
        </div>
      </div>
      <Notice tone="error">{query.error && message(query.error)}</Notice>
      <Notice tone="success">{success}</Notice>
      {query.loading && !query.data && (
        <p className="text-sm text-canwash-muted">Cargando domicilios…</p>
      )}
      {!query.loading && !query.data?.addresses.length && (
        <Empty title="Todavía no tienes domicilios">
          Guarda la dirección y marca el punto en el mapa. El personal
          confirmará el recorrido antes de tu primera reserva.
        </Empty>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {query.data?.addresses.map((address) => {
          const ready = addressReady(address, query.data.business);
          const Icon = ready ? CheckCircle2 : Clock3;
          return (
            <article
              key={address.id_direccion}
              className="rounded-2xl border border-canwash-light/60 p-5"
            >
              <div className="flex items-start gap-3">
                <MapPin size={22} className="mt-1 shrink-0 text-canwash" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-canwash-dark">
                    {address.direccion}
                  </h3>
                  <p className="mt-1 text-sm text-canwash-muted">
                    {address.colonia || "Colonia sin especificar"}
                  </p>
                </div>
              </div>
              <p
                className={`mt-4 flex items-center gap-2 text-sm ${ready ? "text-emerald-700" : "text-amber-800"}`}
              >
                <Icon size={16} />
                {ready
                  ? `Recorrido validado · ${address.distancia_origen_km} km`
                  : "Pendiente de revisar el recorrido"}
              </p>
              <Button
                tone="ghost"
                className="mt-3"
                onClick={() => setEditing(address)}
              >
                <Pencil size={16} /> Editar domicilio
              </Button>
            </article>
          );
        })}
      </div>
      {editing && (
        <AddressForm
          key={editing.id_direccion || "new"}
          clientId={clientId}
          address={editing.id_direccion ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setSuccess(
              "Domicilio guardado. Puedes actualizar esta lista para consultar su validación.",
            );
            query.reload();
          }}
        />
      )}
    </section>
  );
}
