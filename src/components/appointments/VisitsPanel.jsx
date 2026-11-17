import { useState } from "react";
import { Button, Empty, Notice } from "../ui";
import VisitCard from "./VisitCard";
import VisitDetail from "./VisitDetail";
import CancelDialog from "./CancelDialog";
import RescheduleDialog from "./RescheduleDialog";
import { dateLabel, money, stateLabels } from "../../lib/appointments";

export default function VisitsPanel({
  visits,
  legacy = [],
  onBook,
  onChanged,
  compact = false,
}) {
  const [filter, setFilter] = useState("proximas");
  const [dialog, setDialog] = useState(null);
  const [success, setSuccess] = useState("");
  const active = visits
    .filter(
      (v) =>
        !["CANCELADA", "COMPLETADA"].includes(v.estado) &&
        new Date(v.agenda_estilistas.fin) >= new Date(),
    )
    .sort(
      (a, b) =>
        new Date(a.agenda_estilistas.inicio) -
        new Date(b.agenda_estilistas.inicio),
    );
  const shown = compact
    ? active.slice(0, 2)
    : filter === "proximas"
      ? active
      : filter === "todas"
        ? visits
        : visits.filter((v) => v.estado === filter);
  const sorted = [...shown].sort(
    (a, b) =>
      (new Date(a.agenda_estilistas.inicio) -
        new Date(b.agenda_estilistas.inicio)) *
      (filter === "proximas" || compact ? 1 : -1),
  );
  const selected = visits.find((v) => v.id_visita === dialog?.id);
  const saved = (text) => {
    setSuccess(text);
    setDialog(null);
    onChanged();
  };
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-canwash-dark">
            {compact ? "Próximas visitas" : "Mis visitas"}
          </h2>
          <p className="mt-1 text-sm text-canwash-muted">
            Una reserva reúne a tus mascotas, servicios y traslado.
          </p>
        </div>
        {onBook && <Button onClick={onBook}>Agendar visita</Button>}
      </div>
      <Notice tone="success">{success}</Notice>
      {!compact && (
        <div className="flex flex-wrap gap-2">
          {[
            ["proximas", "Próximas"],
            ["todas", "Todas"],
            ["COMPLETADA", "Completadas"],
            ["CANCELADA", "Canceladas"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === value ? "bg-canwash-dark text-white" : "bg-white text-canwash-muted hover:bg-canwash-light/30"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {!sorted.length ? (
        <div className="cw-panel">
          <Empty
            title={
              filter === "proximas"
                ? "Tu próxima visita está por agendarse"
                : "No hay visitas en esta sección"
            }
          >
            Cuando reserves, aquí encontrarás todos sus detalles.
          </Empty>
        </div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {sorted.map((visit) => (
            <VisitCard
              key={visit.id_visita}
              visit={visit}
              onDetails={() =>
                setDialog({ id: visit.id_visita, type: "details" })
              }
              onCancel={() =>
                setDialog({ id: visit.id_visita, type: "cancel" })
              }
              onReschedule={() =>
                setDialog({ id: visit.id_visita, type: "reschedule" })
              }
            />
          ))}
        </div>
      )}
      {!compact && legacy.length > 0 && (
        <div className="cw-panel space-y-3">
          <h3 className="font-bold text-canwash-dark">
            Citas anteriores al nuevo sistema
          </h3>
          <p className="text-sm text-canwash-muted">
            El personal puede ayudarte a conciliar sus horarios y pagos.
          </p>
          {legacy.map((c) => (
            <article
              key={c.id_cita}
              className="rounded-xl border border-canwash-light/40 p-4 text-sm"
            >
              <strong>{c.mascotas?.nombre || "Mascota"}</strong>
              <p className="mt-1">
                {dateLabel(`${c.fecha}T12:00:00Z`)} · {c.hora?.slice(0, 5)} ·{" "}
                {stateLabels[c.estado] || c.estado}
              </p>
              <p className="mt-1 text-canwash-muted">{c.direccion_servicio}</p>
              <ul className="mt-2">
                {c.detalle_cita?.map((d) => (
                  <li key={d.id_detalle}>
                    {d.servicios?.nombre || "Servicio"} ·{" "}
                    {money(Number(d.precio) * Number(d.cantidad))}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
      {selected && dialog.type === "details" && (
        <VisitDetail visit={selected} onClose={() => setDialog(null)} />
      )}
      {selected && dialog.type === "cancel" && (
        <CancelDialog
          visit={selected}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {selected && dialog.type === "reschedule" && (
        <RescheduleDialog
          visit={selected}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
    </section>
  );
}
