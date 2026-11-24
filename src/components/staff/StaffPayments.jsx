import { useState } from "react";
import {
  money,
  paymentTotals,
  dateLabel,
  stateLabels,
} from "../../lib/appointments";
import { Button, Empty, Field } from "../ui";

export default function StaffPayments({ payments, visits, onOpen }) {
  const [filter, setFilter] = useState("TODOS");
  const totals = paymentTotals(payments);
  const shown = payments.filter(
    (p) => filter === "TODOS" || p.estado === filter,
  );
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-canwash-dark">
          Pagos y reembolsos
        </h2>
        <p className="mt-1 text-sm text-canwash-muted">
          Movimientos de las visitas que puedes consultar.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Cobros verificados", totals.received],
          ["Reembolsos verificados", totals.refunded],
          ["Total neto registrado", totals.net],
        ].map(([label, value]) => (
          <article className="cw-panel" key={label}>
            <p className="text-xs font-semibold text-canwash-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-canwash-dark">
              {money(value)}
            </p>
          </article>
        ))}
      </div>
      <div className="cw-panel space-y-5">
        <div className="flex flex-wrap justify-between gap-3">
          <h3 className="text-lg font-bold text-canwash-dark">
            Historial de movimientos
          </h3>
          <Field label="Filtrar por estado">
            <select
              className="cw-input"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="VALIDADO">Validados</option>
              <option value="RECHAZADO">Rechazados</option>
            </select>
          </Field>
        </div>
        {!shown.length ? (
          <Empty title="No hay movimientos en esta sección">
            Puedes registrar un pago desde el detalle de una visita.
          </Empty>
        ) : (
          <div className="divide-y divide-canwash-light/40">
            {shown.map((p) => {
              const visit = visits.find((v) => v.id_visita === p.id_visita);
              return (
                <article
                  key={p.id_pago}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-semibold text-canwash-dark">
                      {p.tipo === "REEMBOLSO"
                        ? "Reembolso"
                        : p.tipo === "ANTICIPO"
                          ? "Anticipo"
                          : "Pago final"}{" "}
                      · {money(p.monto)}
                    </p>
                    <p className="mt-1 text-sm text-canwash-muted">
                      {visit?.clientes?.nombre ||
                        (p.id_cita ? "Cita anterior" : "Cliente")}{" "}
                      · {stateLabels[p.estado] || p.estado}
                    </p>
                    <p className="mt-1 text-xs text-canwash-muted">
                      {dateLabel(p.fecha_pago)} ·{" "}
                      {p.metodo === "EFECTIVO" ? "Efectivo" : "Transferencia"}
                      {p.referencia ? ` · ${p.referencia}` : ""}
                    </p>
                  </div>
                  {visit && (
                    <Button
                      tone="secondary"
                      onClick={() => onOpen(visit.id_visita)}
                    >
                      Revisar pagos
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
