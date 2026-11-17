import { useState } from "react";
import { RefreshCw } from "lucide-react";
import useQuery from "../../hooks/useQuery";
import { loadAdministration } from "../../services/admin";
import { message } from "../../services/api";
import { Button, Notice } from "../ui";
import BusinessSettings from "./BusinessSettings";
import ScheduleSettings from "./ScheduleSettings";
import CatalogSettings from "./CatalogSettings";
import TeamSettings from "./TeamSettings";

export default function AdminPanel({ user, onChanged }) {
  const query = useQuery(loadAdministration);
  const [tab, setTab] = useState("reglas");
  const [success, setSuccess] = useState("");
  const saved = (text) => {
    setSuccess(text);
    query.reload();
    onChanged();
  };
  const data = query.data;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-canwash-dark">
            Administración del negocio
          </h2>
          <p className="mt-1 text-sm text-canwash-muted">
            Configura la atención y los permisos del equipo.
          </p>
        </div>
        <Button tone="secondary" onClick={query.reload}>
          <RefreshCw size={16} />
          Actualizar
        </Button>
      </div>
      <Notice tone="error">{query.error && message(query.error)}</Notice>
      <Notice tone="success">{success}</Notice>
      <div className="flex flex-wrap gap-2">
        {[
          ["reglas", "Tiempo y traslado"],
          ["horarios", "Horarios y cierres"],
          ["servicios", "Servicios y descuentos"],
          ["equipo", "Equipo y cuentas"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => {
              setTab(value);
              setSuccess("");
            }}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold ${tab === value ? "bg-canwash-dark text-white" : "bg-white text-canwash-muted hover:bg-canwash-light/30"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {query.loading && !data && (
        <p className="text-sm text-canwash-muted">Cargando configuración…</p>
      )}
      {data && (
        <>
          {tab === "reglas" && (
            <BusinessSettings
              key={JSON.stringify(data.business)}
              business={data.business}
              onSaved={saved}
            />
          )}
          {tab === "horarios" && (
            <ScheduleSettings
              hours={data.hours}
              closures={data.closures}
              onSaved={saved}
            />
          )}
          {tab === "servicios" && (
            <CatalogSettings
              services={data.services}
              prices={data.prices}
              discounts={data.discounts}
              onSaved={saved}
            />
          )}
          {tab === "equipo" && (
            <TeamSettings
              key={
                data.stylists.find((s) => s.activo)?.id_usuario || "unassigned"
              }
              users={data.users}
              stylists={data.stylists}
              currentId={user.id_usuario}
              onSaved={saved}
            />
          )}
        </>
      )}
    </section>
  );
}
