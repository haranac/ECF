import { useCallback } from "react";
import useQuery from "../../hooks/useQuery";
import { supabase } from "../../lib/supabase";
import { result, message } from "../../services/api";
import {
  dateLabel,
  money,
  paymentTotals,
  stateLabels,
  timeLabel,
} from "../../lib/appointments";
import { Modal, Notice } from "../ui";
import QuoteSummary from "./QuoteSummary";
import { StatusBadge } from "./VisitCard";

const eventLabels = {
  RESERVADA: "Visita reservada",
  CANCELADA: "Visita cancelada",
  REPROGRAMADA: "Horario actualizado",
  ESTADO: "Estado actualizado",
  VALORACION_ACEPTADA: "Valoración e importe aceptados",
  MASCOTA_VALORADA: "Perfil revisado por el estilista",
  PAGO_REGISTRADO: "Movimiento de pago registrado",
  PAGO_REVISADO: "Pago revisado",
};
export default function VisitDetail({ visit, onClose }) {
  const load = useCallback(
    () =>
      result(
        supabase
          .from("eventos_visita")
          .select("id_evento,accion,fecha")
          .eq("id_visita", visit.id_visita)
          .order("fecha", { ascending: false })
          .limit(50),
      ),
    [visit.id_visita],
  );
  const events = useQuery(load);
  const zone = visit.cotizacion_snapshot.zona_horaria;
  const paid = paymentTotals(visit.pagos);
  return (
    <Modal title="Detalle de la visita" onClose={onClose} wide>
      <div className="grid gap-7 md:grid-cols-2">
        <div className="space-y-4">
          <StatusBadge state={visit.estado} />
          <p className="font-semibold capitalize text-canwash-dark">
            {dateLabel(visit.agenda_estilistas.inicio, zone)}
            <br />
            {timeLabel(visit.agenda_estilistas.inicio, zone)} —{" "}
            {timeLabel(visit.agenda_estilistas.fin, zone)}
          </p>
          <p className="text-sm leading-6 text-canwash-muted">
            {visit.domicilio_snapshot.direccion}
            <br />
            {visit.domicilio_snapshot.colonia}
          </p>
          <QuoteSummary quote={visit.cotizacion_snapshot} />
        </div>
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-bold text-canwash-dark">
              Pagos de esta visita
            </h3>
            <dl className="mt-3 space-y-2 rounded-xl bg-canwash-background p-4 text-sm">
              <div className="flex justify-between">
                <dt>Recibido</dt>
                <dd>{money(paid.received)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Reembolsos</dt>
                <dd>{money(paid.refunded)}</dd>
              </div>
              <div className="flex justify-between font-bold text-canwash-dark">
                <dt>Saldo pendiente</dt>
                <dd>{money(Math.max(0, Number(visit.total) - paid.net))}</dd>
              </div>
            </dl>
            {!visit.pagos.length ? (
              <p className="mt-3 text-sm text-canwash-muted">
                Aún no hay movimientos registrados.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-canwash-light/40">
                {visit.pagos.map((p) => (
                  <li key={p.id_pago} className="py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span>
                        {p.tipo === "REEMBOLSO"
                          ? "Reembolso"
                          : p.tipo === "ANTICIPO"
                            ? "Anticipo"
                            : "Pago final"}
                      </span>
                      <strong>{money(p.monto)}</strong>
                    </div>
                    <p className="mt-1 text-xs text-canwash-muted">
                      {p.metodo === "EFECTIVO" ? "Efectivo" : "Transferencia"} ·{" "}
                      {stateLabels[p.estado] || p.estado}
                      {p.referencia ? ` · ${p.referencia}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="text-lg font-bold text-canwash-dark">
              Historial de la visita
            </h3>
            <Notice tone="error">
              {events.error && message(events.error)}
            </Notice>
            <ol className="mt-3 space-y-3">
              {events.data?.map((e) => (
                <li
                  key={e.id_evento}
                  className="border-l-2 border-canwash-light pl-3 text-sm"
                >
                  <p className="font-medium text-canwash-dark">
                    {eventLabels[e.accion] || "Actualización"}
                  </p>
                  <p className="mt-1 text-xs text-canwash-muted">
                    {dateLabel(e.fecha, zone)} · {timeLabel(e.fecha, zone)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </Modal>
  );
}
