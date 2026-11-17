import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { Button } from "../ui";
import {
  dateLabel,
  duration,
  editableStates,
  money,
  paymentTotals,
  stateLabels,
  timeLabel,
} from "../../lib/appointments";

export function StatusBadge({ state }) {
  const tone = ["CANCELADA", "RECHAZADO"].includes(state)
    ? "bg-red-50 text-red-800"
    : ["CONFIRMADA", "COMPLETADA", "VALIDADO"].includes(state)
      ? "bg-emerald-50 text-emerald-800"
      : "bg-amber-50 text-amber-900";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${tone}`}
    >
      {stateLabels[state] || state}
    </span>
  );
}
export default function VisitCard({
  visit,
  staff = false,
  onDetails,
  onCancel,
  onReschedule,
  children,
}) {
  const agenda = visit.agenda_estilistas;
  const quote = visit.cotizacion_snapshot;
  const zone = quote.zona_horaria;
  const paid = paymentTotals(visit.pagos).net;
  const changeable =
    editableStates.includes(visit.estado) &&
    (staff || new Date(agenda.inicio) > new Date());
  const names = quote.mascotas.map((p) => p.nombre).join(", ");
  return (
    <article className="cw-panel space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold capitalize text-canwash-dark">
            <CalendarDays size={18} />
            {dateLabel(agenda.inicio, zone)}
          </p>
          <p className="mt-2 text-2xl font-bold text-canwash-dark">
            {timeLabel(agenda.inicio, zone)}{" "}
            <span className="text-base font-medium text-canwash-muted">
              — {timeLabel(agenda.fin, zone)}
            </span>
          </p>
        </div>
        <StatusBadge state={visit.estado} />
      </div>
      <div className="rounded-2xl bg-canwash-background/80 p-4">
        <h3 className="font-bold text-canwash-dark">{names}</h3>
        <p className="mt-1 text-sm leading-6 text-canwash-muted">
          {quote.mascotas
            .map(
              (p) =>
                p.servicios.find(
                  (s) => s.codigo.startsWith("BANO_") || s.codigo === "GARRAS",
                )?.nombre,
            )
            .filter(Boolean)
            .join(" · ")}
        </p>
        {staff && visit.clientes && (
          <p className="mt-2 text-sm font-semibold text-canwash-dark">
            {visit.clientes.nombre} · {visit.clientes.telefono}
          </p>
        )}
      </div>
      <p className="flex items-start gap-2 text-sm text-canwash-muted">
        <MapPin size={17} className="mt-0.5 shrink-0" />
        {visit.domicilio_snapshot.direccion}
        {visit.domicilio_snapshot.colonia
          ? `, ${visit.domicilio_snapshot.colonia}`
          : ""}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-canwash-light/40 pt-4">
        <p className="flex items-center gap-2 text-xs text-canwash-muted">
          <Clock3 size={15} />
          {duration(visit.duracion_minutos)} reservados
        </p>
        <div className="text-right">
          <p className="text-xl font-bold text-canwash-dark">
            {money(visit.total)}
          </p>
          <p className="text-xs text-canwash-muted">
            {paid > 0
              ? `Pagado neto: ${money(paid)} · Saldo: ${money(Math.max(0, Number(visit.total) - paid))}`
              : "Total de la visita"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button tone="secondary" onClick={onDetails}>
          Ver detalle
        </Button>
        {changeable && onReschedule && (
          <Button tone="ghost" onClick={onReschedule}>
            Reprogramar
          </Button>
        )}
        {changeable && onCancel && (
          <Button tone="danger" onClick={onCancel}>
            Cancelar visita
          </Button>
        )}
        {children}
      </div>
    </article>
  );
}
