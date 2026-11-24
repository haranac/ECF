import { useState } from "react";
import { updateBusiness } from "../../services/admin";
import { message } from "../../services/api";
import { Button, Field, Notice } from "../ui";
import LocationPicker from "../addresses/LocationPicker";

export default function BusinessSettings({ business, onSaved }) {
  const [form, setForm] = useState(business);
  const [point, setPoint] = useState(
    business.origen_latitud != null
      ? { latitud: business.origen_latitud, longitud: business.origen_longitud }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!form.origen_nombre.trim())
        throw {
          code: "22023",
          message: "Escribe el nombre del punto de salida.",
        };
      await updateBusiness({
        pesos_por_hora: Number(form.pesos_por_hora),
        visita_minima: Number(form.visita_minima),
        precio_kilometro: Number(form.precio_kilometro),
        margen_minutos: Number(form.margen_minutos),
        intervalo_minutos: Number(form.intervalo_minutos),
        origen_nombre: form.origen_nombre.trim(),
        origen_url: form.origen_url?.trim() || null,
        origen_latitud: point?.latitud ?? null,
        origen_longitud: point?.longitud ?? null,
      });
      onSaved("Reglas del negocio guardadas.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="cw-panel space-y-5">
      <h3 className="text-lg font-bold text-canwash-dark">Tiempo y traslado</h3>
      <Notice tone="error">{error}</Notice>
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "pesos_por_hora",
              "Importe que equivale a una hora (MXN)",
              "0.01",
              "0.01",
            ],
            ["margen_minutos", "Separación entre visitas (min)", "0", "1"],
            [
              "intervalo_minutos",
              "Intervalo del selector de horarios (min)",
              "1",
              "1",
            ],
            ["visita_minima", "Costo mínimo de visita (MXN)", "0", "0.01"],
            ["precio_kilometro", "Precio por kilómetro (MXN)", "0", "0.01"],
          ].map(([name, label, min, step]) => (
            <Field key={name} label={label}>
              <input
                className="cw-input"
                type="number"
                min={min}
                max={name === "intervalo_minutos" ? 60 : undefined}
                step={step}
                required
                value={form[name]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [name]: e.target.value }))
                }
              />
            </Field>
          ))}
          <Field label="Zona horaria del negocio">
            <input
              className="cw-input"
              value={business.zona_horaria}
              readOnly
            />
          </Field>
        </div>
        <div className="border-t border-canwash-light/50 pt-5">
          <h3 className="mb-4 text-lg font-bold text-canwash-dark">
            Punto de salida
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del punto de salida">
              <input
                className="cw-input"
                required
                value={form.origen_nombre}
                onChange={(e) =>
                  setForm((f) => ({ ...f, origen_nombre: e.target.value }))
                }
              />
            </Field>
            <Field label="Enlace de referencia (opcional)">
              <input
                className="cw-input"
                type="url"
                value={form.origen_url || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, origen_url: e.target.value }))
                }
              />
            </Field>
          </div>
          <div className="mt-4">
            <LocationPicker value={point} onChange={setPoint} />
          </div>
        </div>
      </fieldset>
      <Notice>
        Cambiar el punto de salida deja pendientes de revisión los recorridos
        anteriores. Las visitas ya reservadas conservan su importe y duración.
      </Notice>
      <Button type="submit" busy={busy}>
        Guardar reglas del negocio
      </Button>
    </form>
  );
}
