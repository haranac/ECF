import { useState } from "react";
import { CalendarDays, LockKeyhole } from "lucide-react";
import {
  dateKey,
  dateLabel,
  editableStates,
  money,
  paymentTotals,
  timeLabel,
} from "../../lib/appointments";
import VisitCard from "../appointments/VisitCard";
import { Button, Empty, Field } from "../ui";

export default function StaffAgenda({
  visits,
  blocks,
  legacy,
  zone,
  onAction,
  onBlock,
  onUnblock,
}) {
  const [date, setDate] = useState(dateKey(new Date(), zone));
  const [all, setAll] = useState(false);
  const [search, setSearch] = useState("");
  const shown = visits
    .filter(
      (v) =>
        (all || dateKey(v.agenda_estilistas.inicio, zone) === date) &&
        `${v.clientes?.nombre} ${v.cotizacion_snapshot.mascotas.map((p) => p.nombre).join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(a.agenda_estilistas.inicio) -
        new Date(b.agenda_estilistas.inicio),
    );
  const relevantBlocks = blocks.filter(
    (b) =>
      all || (dateKey(b.inicio, zone) <= date && dateKey(b.fin, zone) >= date),
  );
  const old = legacy.filter((c) => all || c.fecha === date);
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-canwash-dark">
            Agenda de visitas
          </h2>
          <p className="mt-1 text-sm text-canwash-muted">
            Todo lo que necesita cada mascota, organizado por domicilio.
          </p>
        </div>
        <Button tone="secondary" onClick={() => onBlock(date)}>
          <LockKeyhole size={16} />
          Bloquear horario
        </Button>
      </div>
      <div className="cw-panel flex flex-wrap items-end gap-4">
        <Field label="Fecha de la agenda">
          <input
            className="cw-input"
            type="date"
            value={date}
            disabled={all}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Button
          tone="ghost"
          onClick={() => {
            setDate(dateKey(new Date(), zone));
            setAll(false);
          }}
        >
          <CalendarDays size={17} />
          Hoy
        </Button>
        <Field label="Buscar cliente o mascota" className="min-w-40 flex-1">
          <input
            className="cw-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre…"
          />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm text-canwash-dark">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />
          Todas las fechas
        </label>
      </div>
      {relevantBlocks.length > 0 && (
        <div className="space-y-2">
          {relevantBlocks.map((b) => (
            <article
              key={b.id_agenda}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
            >
              <div>
                <p className="flex items-center gap-2 font-semibold text-amber-900">
                  <LockKeyhole size={16} />
                  {b.motivo}
                </p>
                <p className="mt-1 text-xs text-amber-900">
                  {dateLabel(b.inicio, zone)} · {timeLabel(b.inicio, zone)} —{" "}
                  {dateLabel(b.fin, zone)} · {timeLabel(b.fin, zone)}
                </p>
              </div>
              <Button tone="secondary" onClick={() => onUnblock(b)}>
                Liberar bloqueo
              </Button>
            </article>
          ))}
        </div>
      )}
      {!shown.length && !old.length ? (
        <div className="cw-panel">
          <Empty title="La agenda está libre en esta sección">
            Prueba otra fecha o revisa los filtros.
          </Empty>
        </div>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {shown.map((v) => (
            <VisitCard
              key={v.id_visita}
              visit={v}
              staff
              onDetails={() => onAction("details", v.id_visita)}
              onCancel={() => onAction("cancel", v.id_visita)}
              onReschedule={() => onAction("reschedule", v.id_visita)}
            >
              {editableStates.includes(v.estado) && (
                <Button
                  tone="secondary"
                  onClick={() => onAction("valuation", v.id_visita)}
                >
                  Valorar servicio
                </Button>
              )}
              {v.estado === "PENDIENTE" && (
                <Button
                  onClick={() => onAction("state", v.id_visita, "CONFIRMADA")}
                >
                  Confirmar visita
                </Button>
              )}
              {v.estado === "CONFIRMADA" && (
                <Button
                  onClick={() => onAction("state", v.id_visita, "EN_PROCESO")}
                >
                  Iniciar atención
                </Button>
              )}
              {v.estado === "EN_PROCESO" && (
                <>
                  <Button
                    onClick={() => onAction("state", v.id_visita, "COMPLETADA")}
                  >
                    Completar atención
                  </Button>
                  <Button
                    tone="danger"
                    onClick={() => onAction("cancel", v.id_visita)}
                  >
                    Cancelar atención
                  </Button>
                </>
              )}
              <Button
                tone="ghost"
                onClick={() => onAction("payment", v.id_visita)}
              >
                Pagos
              </Button>
            </VisitCard>
          ))}
        </div>
      )}
      {old.length > 0 && (
        <div className="cw-panel space-y-4">
          <h3 className="font-bold text-canwash-dark">
            Citas anteriores por conciliar
          </h3>
          {old.map((c) => (
            <article
              key={c.id_cita}
              className="rounded-xl border border-canwash-light/50 p-4 text-sm"
            >
              <h4 className="font-bold">
                {c.mascotas?.nombre} · {c.clientes?.nombre}
              </h4>
              <p className="mt-1">
                {c.fecha} · {c.hora?.slice(0, 5)} · {c.estado}
              </p>
              <p className="mt-1">
                {c.direccion_servicio} · {c.clientes?.telefono}
              </p>
              {c.mascotas?.padecimientos && (
                <p className="mt-2 text-amber-900">
                  Cuidados: {c.mascotas.padecimientos}
                </p>
              )}
              {c.notas && <p className="mt-2">{c.notas}</p>}
              <ul className="mt-2">
                {c.detalle_cita.map((d) => (
                  <li key={d.id_detalle}>
                    {d.servicios?.nombre} ·{" "}
                    {money(Number(d.precio) * Number(d.cantidad))}
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                Visita: {money(c.costo_visita)} · Pagado neto:{" "}
                {money(paymentTotals(c.pagos).net)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
