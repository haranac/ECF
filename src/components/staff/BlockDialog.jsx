import { useState } from "react";
import { Button, Field, Modal, Notice } from "../ui";
import { message, rpc } from "../../services/api";
import { dateKey, toBusinessInstant } from "../../lib/appointments";
export default function BlockDialog({ date, zone, onClose, onSaved }) {
  const [form, setForm] = useState({
    inicio: `${date || dateKey()}T08:00`,
    fin: `${date || dateKey()}T09:00`,
    motivo: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (form.fin <= form.inicio) {
      setError("El final debe ser posterior al inicio.");
      return;
    }
    setBusy(true);
    try {
      await rpc("bloquear_agenda", {
        p_inicio: toBusinessInstant(form.inicio, zone),
        p_fin: toBusinessInstant(form.fin, zone),
        p_motivo: form.motivo.trim(),
      });
      onSaved("Bloqueo guardado en la agenda.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Bloquear un horario" onClose={onClose} busy={busy}>
      <form onSubmit={save} className="space-y-5">
        <p className="text-sm leading-6 text-canwash-muted">
          Reserva tiempo para descansos, traslados especiales o asuntos del
          negocio. Un bloqueo no puede encimarse con una visita.
        </p>
        <Notice tone="error">{error}</Notice>
        <fieldset disabled={busy} className="space-y-4">
          {[
            ["inicio", "Inicio del bloqueo"],
            ["fin", "Final del bloqueo"],
          ].map(([name, label]) => (
            <Field key={name} label={label}>
              <input
                className="cw-input"
                type="datetime-local"
                value={form[name]}
                required
                onChange={(e) =>
                  setForm((f) => ({ ...f, [name]: e.target.value }))
                }
              />
            </Field>
          ))}
          <Field label="Motivo">
            <input
              className="cw-input"
              value={form.motivo}
              maxLength={300}
              required
              onChange={(e) =>
                setForm((f) => ({ ...f, motivo: e.target.value }))
              }
            />
          </Field>
        </fieldset>
        <div className="flex justify-end gap-3">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" busy={busy}>
            Guardar bloqueo
          </Button>
        </div>
      </form>
    </Modal>
  );
}
