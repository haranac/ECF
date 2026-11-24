import { useState } from "react";
import LocationPicker from "./LocationPicker";
import { Button, Field, Modal, Notice } from "../ui";
import { saveAddress } from "../../services/addresses";
import { message } from "../../services/api";
export default function AddressForm({ clientId, address, onClose, onSaved }) {
  const [form, setForm] = useState({
    direccion: address?.direccion || "",
    colonia: address?.colonia || "",
  });
  const [point, setPoint] = useState(
    address?.latitud != null
      ? { latitud: address.latitud, longitud: address.longitud }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!point) {
      setError("Marca el domicilio en el mapa antes de guardarlo.");
      return;
    }
    if (!form.direccion.trim()) {
      setError("Escribe la calle, número y referencias del domicilio.");
      return;
    }
    setBusy(true);
    try {
      await saveAddress(clientId, address?.id_direccion, form, point);
      onSaved();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={address ? "Editar domicilio" : "Agregar domicilio"}
      onClose={onClose}
      busy={busy}
      wide
    >
      <form onSubmit={submit} className="space-y-5">
        <Notice tone="error">{error}</Notice>
        <fieldset disabled={busy} className="space-y-4">
          <Field label="Calle, número y referencias">
            <textarea
              className="cw-input"
              rows={2}
              value={form.direccion}
              onChange={(e) =>
                setForm((f) => ({ ...f, direccion: e.target.value }))
              }
              required
              maxLength={1000}
              placeholder="Calle y número, entre calles, color de fachada…"
            />
          </Field>
          <Field label="Colonia">
            <input
              className="cw-input"
              value={form.colonia}
              onChange={(e) =>
                setForm((f) => ({ ...f, colonia: e.target.value }))
              }
              maxLength={100}
            />
          </Field>
          <LocationPicker value={point} onChange={setPoint} />
        </fieldset>
        <Notice>
          El personal revisará el recorrido para confirmar el costo de visita.
          Si cambias el domicilio o su punto en el mapa, deberá validarse
          nuevamente.
        </Notice>
        <div className="flex flex-wrap justify-end gap-3">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" busy={busy}>
            Guardar domicilio
          </Button>
        </div>
      </form>
    </Modal>
  );
}
