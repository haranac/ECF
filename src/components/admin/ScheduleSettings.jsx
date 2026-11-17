import { useState } from "react";
import { addClosure, deleteClosure, updateHours } from "../../services/admin";
import { message } from "../../services/api";
import { dateKey } from "../../lib/appointments";
import { Button, Field, Notice } from "../ui";

const days = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
function DayRow({ hour, onSaved }) {
  const [form, setForm] = useState({
    activo: hour.activo,
    apertura: hour.apertura.slice(0, 5),
    cierre: hour.cierre.slice(0, 5),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (form.apertura >= form.cierre)
        throw {
          code: "22023",
          message: "El cierre debe ser posterior a la apertura.",
        };
      await updateHours(hour.dia_semana, form);
      onSaved(`Horario de ${days[hour.dia_semana].toLowerCase()} guardado.`);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={save}
      className="space-y-2 border-b border-canwash-light/40 py-4 last:border-0"
    >
      <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
        <label className="flex min-h-11 w-32 items-center gap-2 text-sm font-semibold text-canwash-dark">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(e) =>
              setForm((f) => ({ ...f, activo: e.target.checked }))
            }
          />
          {days[hour.dia_semana]}
        </label>
        <Field label="Apertura">
          <input
            className="cw-input"
            type="time"
            value={form.apertura}
            required
            disabled={!form.activo}
            onChange={(e) =>
              setForm((f) => ({ ...f, apertura: e.target.value }))
            }
          />
        </Field>
        <Field label="Cierre">
          <input
            className="cw-input"
            type="time"
            value={form.cierre}
            required
            disabled={!form.activo}
            onChange={(e) => setForm((f) => ({ ...f, cierre: e.target.value }))}
          />
        </Field>
        <Button
          type="submit"
          tone="secondary"
          busy={busy}
          aria-label={`Guardar horario de ${days[hour.dia_semana]}`}
        >
          Guardar
        </Button>
        {!form.activo && (
          <span className="pb-3 text-xs text-canwash-muted">
            No se ofrecen visitas este día
          </span>
        )}
      </fieldset>
      <Notice tone="error">{error}</Notice>
    </form>
  );
}
export default function ScheduleSettings({ hours, closures, onSaved }) {
  const [form, setForm] = useState({ fecha: dateKey(), motivo: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!form.motivo.trim())
        throw { code: "22023", message: "Escribe el motivo del cierre." };
      await addClosure(form.fecha, form.motivo.trim());
      setForm((f) => ({ ...f, motivo: "" }));
      onSaved("Día de cierre agregado.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (fecha) => {
    setBusy(true);
    setError("");
    try {
      await deleteClosure(fecha);
      onSaved("Día de cierre retirado.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <section className="cw-panel">
        <h3 className="text-lg font-bold text-canwash-dark">Horario semanal</h3>
        <p className="mt-1 text-sm text-canwash-muted">
          El servicio completo debe terminar antes del cierre. Revisa las
          reservas existentes antes de reducir una jornada.
        </p>
        {hours.map((h) => (
          <DayRow
            key={`${h.dia_semana}:${h.apertura}:${h.cierre}:${h.activo}`}
            hour={h}
            onSaved={onSaved}
          />
        ))}
      </section>
      <section className="cw-panel space-y-4">
        <h3 className="text-lg font-bold text-canwash-dark">
          Días de cierre extraordinario
        </h3>
        <Notice tone="error">{error}</Notice>
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <Field label="Fecha de cierre">
            <input
              className="cw-input"
              type="date"
              value={form.fecha}
              min={dateKey()}
              required
              disabled={busy}
              onChange={(e) =>
                setForm((f) => ({ ...f, fecha: e.target.value }))
              }
            />
          </Field>
          <Field label="Motivo" className="min-w-40 flex-1">
            <input
              className="cw-input"
              value={form.motivo}
              maxLength={300}
              required
              disabled={busy}
              onChange={(e) =>
                setForm((f) => ({ ...f, motivo: e.target.value }))
              }
            />
          </Field>
          <Button type="submit" busy={busy}>
            Agregar cierre
          </Button>
        </form>
        {!closures.length && (
          <p className="text-sm text-canwash-muted">
            No hay cierres extraordinarios registrados.
          </p>
        )}
        {closures.map((c) => (
          <div
            key={c.fecha}
            className="flex items-center justify-between gap-4 rounded-xl bg-canwash-background p-3"
          >
            <p className="text-sm text-canwash-dark">
              <strong>{c.fecha}</strong> · {c.motivo}
            </p>
            <Button
              tone="danger"
              disabled={busy}
              onClick={() => remove(c.fecha)}
            >
              Retirar cierre
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
