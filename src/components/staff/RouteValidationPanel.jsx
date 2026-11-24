import { useState } from "react";
import { ExternalLink, MapPin, RefreshCw } from "lucide-react";
import useQuery from "../../hooks/useQuery";
import { loadRoutes } from "../../services/staff";
import { addressReady } from "../../services/addresses";
import { message, rpc } from "../../services/api";
import { money } from "../../lib/appointments";
import { Button, Empty, Field, Notice } from "../ui";

function RouteRow({ address, business, onSaved }) {
  const [km, setKm] = useState(address.distancia_origen_km ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = addressReady(address, business);
  const destination =
    address.latitud != null
      ? `${address.latitud},${address.longitud}`
      : `${address.direccion}, ${address.colonia || ""}, Campeche`;
  const origin =
    business.origen_latitud != null
      ? `${business.origen_latitud},${business.origen_longitud}`
      : business.origen_nombre;
  const route = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await rpc("validar_distancia_direccion", {
        p_id_direccion: address.id_direccion,
        p_kilometros: Number(km),
      });
      onSaved();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="cw-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-canwash-dark">
            {address.clientes?.nombre || "Domicilio por revisar"}
          </h3>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-canwash-muted">
            <MapPin size={17} className="mt-1 shrink-0" />
            {address.direccion}
            {address.colonia ? `, ${address.colonia}` : ""}
          </p>
          {address.clientes?.telefono && (
            <p className="mt-1 text-sm text-canwash-muted">
              {address.clientes.telefono}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${ready ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}
        >
          {ready ? "Recorrido validado" : "Validación pendiente"}
        </span>
      </div>
      <a
        href={route}
        target="_blank"
        rel="noreferrer"
        className="cw-button cw-button-secondary"
      >
        <ExternalLink size={16} /> Consultar recorrido en Maps
      </a>
      <form onSubmit={save} className="space-y-3">
        <Notice tone="error">{error}</Notice>
        <div className="flex flex-wrap items-end gap-3">
          <Field
            label="Distancia por calles desde el origen (km)"
            className="flex-1"
            hint={`${money(business.precio_kilometro)} por km; mínimo ${money(business.visita_minima)}.`}
          >
            <input
              type="number"
              className="cw-input"
              min="0"
              step="0.001"
              value={km}
              required
              disabled={busy}
              onChange={(e) => setKm(e.target.value)}
            />
          </Field>
          <Button type="submit" busy={busy}>
            Validar recorrido
          </Button>
        </div>
      </form>
    </article>
  );
}
export default function RouteValidationPanel() {
  const query = useQuery(loadRoutes);
  const [all, setAll] = useState(false);
  const [success, setSuccess] = useState("");
  const addresses =
    query.data?.addresses.filter(
      (a) => all || !addressReady(a, query.data.business),
    ) || [];
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-canwash-dark">
            Recorridos de visita
          </h2>
          <p className="mt-1 text-sm text-canwash-muted">
            Confirma el kilometraje por calles para habilitar la cotización del
            domicilio.
          </p>
        </div>
        <Button tone="secondary" onClick={query.reload}>
          <RefreshCw size={16} />
          Actualizar
        </Button>
      </div>
      <Notice tone="error">{query.error && message(query.error)}</Notice>
      <Notice tone="success">{success}</Notice>
      {query.data && (
        <p className="text-xs text-canwash-muted">
          Origen: {query.data.business.origen_nombre}
        </p>
      )}
      <label className="flex items-center gap-2 text-sm text-canwash-dark">
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => setAll(e.target.checked)}
        />{" "}
        Incluir domicilios ya validados
      </label>
      {query.loading && !query.data ? (
        <p className="text-sm text-canwash-muted">Cargando domicilios…</p>
      ) : !addresses.length ? (
        <Empty title="No hay recorridos pendientes">
          Los domicilios nuevos aparecerán aquí.
        </Empty>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {addresses.map((a) => (
            <RouteRow
              key={`${a.id_direccion}:${a.fecha_validacion}`}
              address={a}
              business={query.data.business}
              onSaved={() => {
                setSuccess(
                  "Recorrido validado. El cliente ya puede consultar su cotización.",
                );
                query.reload();
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
