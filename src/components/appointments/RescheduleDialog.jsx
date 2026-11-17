import { useCallback, useState } from "react";
import useQuery from "../../hooks/useQuery";
import { rpc, message } from "../../services/api";
import {
  dateKey,
  dateLabel,
  duration,
  timeLabel,
} from "../../lib/appointments";
import { Button, Empty, Field, Modal, Notice } from "../ui";

export default function RescheduleDialog({ visit, onClose, onSaved }) {
  const zone = visit.cotizacion_snapshot.zona_horaria;
  const [date, setDate] = useState(
    dateKey(new Date(visit.agenda_estilistas.inicio), zone),
  );
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      date
        ? rpc("horarios_reprogramacion", {
            p_id_visita: visit.id_visita,
            p_fecha: date,
          })
        : Promise.resolve([]),
    [date, visit.id_visita],
  );
  const slots = useQuery(load);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await rpc("reprogramar_visita", {
        p_id_visita: visit.id_visita,
        p_inicio: slot,
      });
      onSaved("Horario actualizado.");
    } catch (cause) {
      setError(message(cause));
      setSlot("");
      slots.reload();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Reprogramar visita" onClose={onClose} busy={busy}>
      <div className="space-y-5">
        <Notice>
          Conservamos el precio y los {duration(visit.duracion_minutos)} que ya
          reservaste. Selecciona un nuevo espacio.
        </Notice>
        <Notice tone="error">
          {error || (slots.error && message(slots.error))}
        </Notice>
        <Field label="Nueva fecha">
          <input
            className="cw-input"
            type="date"
            min={dateKey(new Date(), zone)}
            value={date}
            disabled={busy}
            onChange={(e) => {
              setDate(e.target.value);
              setSlot("");
            }}
          />
        </Field>
        {slots.loading ? (
          <p className="text-sm text-canwash-muted">Consultando horarios…</p>
        ) : slots.error ? (
          <Button tone="secondary" onClick={slots.reload}>
            Reintentar consulta
          </Button>
        ) : !slots.data?.length ? (
          <Empty title="No hay horarios para esta visita">
            Selecciona otra fecha.
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.data.map((s) => (
              <button
                type="button"
                key={s.inicio}
                disabled={busy}
                onClick={() => setSlot(s.inicio)}
                aria-pressed={slot === s.inicio}
                className={`rounded-xl border p-3 text-sm font-semibold ${slot === s.inicio ? "border-canwash-dark bg-canwash-dark text-white" : "border-canwash-light text-canwash-dark"}`}
              >
                {timeLabel(s.inicio, zone)}
              </button>
            ))}
          </div>
        )}
        {slot && (
          <p className="text-sm font-semibold text-canwash-dark">
            {dateLabel(slot, zone)} · {timeLabel(slot, zone)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Volver
          </Button>
          <Button
            busy={busy}
            disabled={!slot || slots.loading || slots.error}
            onClick={save}
          >
            Guardar nuevo horario
          </Button>
        </div>
      </div>
    </Modal>
  );
}
