import { useState } from "react";
import { message, rpc } from "../../services/api";
import { money, paymentTotals, stateLabels } from "../../lib/appointments";
import { Button, Field, Modal, Notice } from "../ui";

export default function PaymentDialog({ visit, onClose, onSaved }) {
  const paid = paymentTotals(visit.pagos);
  const balance = Math.max(0, Number(visit.total) - paid.net);
  const [form, setForm] = useState({
    monto: "",
    tipo: visit.estado === "CANCELADA" ? "REEMBOLSO" : "ANTICIPO",
    metodo: "EFECTIVO",
    referencia: "",
    estado: "VALIDADO",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const work = async (task) => {
    setBusy(true);
    setError("");
    try {
      await task();
      onSaved("Movimiento de pago actualizado.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  const submit = (event) => {
    event.preventDefault();
    work(() =>
      rpc("registrar_pago_visita", {
        p_id_visita: visit.id_visita,
        p_monto: Number(form.monto),
        p_tipo: form.tipo,
        p_metodo: form.metodo,
        p_referencia: form.referencia.trim() || null,
        p_estado: form.estado,
      }),
    );
  };
  const review = (id, approve) =>
    work(() =>
      rpc("validar_pago_visita", { p_id_pago: id, p_aprobar: approve }),
    );
  return (
    <Modal title="Pagos de la visita" onClose={onClose} busy={busy} wide>
      <div className="grid gap-7 md:grid-cols-2">
        <section className="space-y-4">
          <h3 className="font-bold text-canwash-dark">Resumen</h3>
          <dl className="space-y-2 rounded-2xl bg-canwash-background p-4 text-sm">
            {[
              ["Total de la visita", visit.total],
              ["Recibido", paid.received],
              ["Reembolsado", paid.refunded],
              ["Saldo pendiente", balance],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt>{label}</dt>
                <dd className="font-semibold">{money(value)}</dd>
              </div>
            ))}
          </dl>
          <h3 className="font-bold text-canwash-dark">
            Movimientos registrados
          </h3>
          {!visit.pagos.length && (
            <p className="text-sm text-canwash-muted">
              Todavía no hay movimientos.
            </p>
          )}
          {visit.pagos.map((p) => (
            <article
              key={p.id_pago}
              className="rounded-xl border border-canwash-light/50 p-3 text-sm"
            >
              <div className="flex justify-between gap-3">
                <strong>
                  {p.tipo === "REEMBOLSO"
                    ? "Reembolso"
                    : p.tipo === "ANTICIPO"
                      ? "Anticipo"
                      : "Pago final"}
                </strong>
                <strong>{money(p.monto)}</strong>
              </div>
              <p className="mt-1 text-xs text-canwash-muted">
                {p.metodo === "EFECTIVO" ? "Efectivo" : "Transferencia"} ·{" "}
                {stateLabels[p.estado] || p.estado}
              </p>
              {p.referencia && (
                <p className="mt-1 break-words text-xs text-canwash-muted">
                  {p.referencia}
                </p>
              )}
              {p.estado === "PENDIENTE" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    tone="secondary"
                    onClick={() => review(p.id_pago, true)}
                    disabled={busy}
                  >
                    Validar
                  </Button>
                  <Button
                    tone="danger"
                    onClick={() => review(p.id_pago, false)}
                    disabled={busy}
                  >
                    Rechazar
                  </Button>
                </div>
              )}
            </article>
          ))}
        </section>
        <form className="space-y-4" onSubmit={submit}>
          <h3 className="font-bold text-canwash-dark">Registrar movimiento</h3>
          <Notice tone="error">{error}</Notice>
          <fieldset disabled={busy} className="space-y-4">
            <Field label="Concepto">
              <select
                className="cw-input"
                value={form.tipo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo: e.target.value, monto: "" }))
                }
              >
                {visit.estado !== "CANCELADA" && (
                  <>
                    <option value="ANTICIPO">Anticipo</option>
                    <option value="PAGO_FINAL">Pago final</option>
                  </>
                )}
                <option value="REEMBOLSO">Reembolso</option>
              </select>
            </Field>
            <Field label="Importe (MXN)">
              <input
                className="cw-input"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.monto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monto: e.target.value }))
                }
              />
            </Field>
            <Field label="Método">
              <select
                className="cw-input"
                value={form.metodo}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    metodo: e.target.value,
                    estado:
                      e.target.value === "TRANSFERENCIA"
                        ? "PENDIENTE"
                        : "VALIDADO",
                  }))
                }
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </Field>
            <Field label="Referencia o nota">
              <input
                className="cw-input"
                maxLength={150}
                value={form.referencia}
                onChange={(e) =>
                  setForm((f) => ({ ...f, referencia: e.target.value }))
                }
              />
            </Field>
            <Field label="Estado del movimiento">
              <select
                className="cw-input"
                value={form.estado}
                onChange={(e) =>
                  setForm((f) => ({ ...f, estado: e.target.value }))
                }
              >
                <option value="PENDIENTE">Pendiente de verificar</option>
                <option value="VALIDADO">Ya verificado</option>
              </select>
            </Field>
          </fieldset>
          <p className="text-xs leading-5 text-canwash-muted">
            Registra cobros o devoluciones acordados con el cliente. Esta acción
            no realiza transferencias bancarias.
          </p>
          <Button type="submit" busy={busy}>
            Guardar movimiento
          </Button>
        </form>
      </div>
    </Modal>
  );
}
