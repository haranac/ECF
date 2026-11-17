import { useState } from "react";
import {
  updateDiscount,
  updatePrice,
  updateService,
} from "../../services/admin";
import { message } from "../../services/api";
import { Button, Field, Notice } from "../ui";

function PriceRow({ price, service, onSaved }) {
  const [total, setTotal] = useState(price.precio);
  const [bath, setBath] = useState(price.componente_bano);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updatePrice(price.id_precio, {
        precio: Number(total),
        componente_bano:
          service.tipo === "EXTRA" || service.tipo === "INDIVIDUAL"
            ? 0
            : service.codigo === "BANO_INTEGRAL"
              ? Number(total)
              : Number(bath),
      });
      onSaved(
        "Tarifa actualizada. Las reservas anteriores conservan sus precios.",
      );
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={save}
      className="space-y-2 border-t border-canwash-light/30 py-3"
    >
      <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
        <p className="min-w-28 flex-1 pb-3 text-sm font-semibold text-canwash-dark">
          {price.especie === "GATO"
            ? "Gato"
            : price.especie === "PERRO"
              ? `Perro · ${price.tamano.toLowerCase()}`
              : "Todas las mascotas"}
        </p>
        <Field label="Precio total (MXN)">
          <input
            className="cw-input w-32"
            type="number"
            min="0"
            step="0.01"
            required
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
        </Field>
        {service.tipo === "PAQUETE" && service.codigo !== "BANO_INTEGRAL" && (
          <Field label="Parte del baño con descuento">
            <input
              className="cw-input w-36"
              type="number"
              min="0"
              max={total}
              step="0.01"
              required
              value={bath}
              onChange={(e) => setBath(e.target.value)}
            />
          </Field>
        )}
        <Button type="submit" tone="secondary" busy={busy}>
          Guardar tarifa
        </Button>
      </fieldset>
      <Notice tone="error">{error}</Notice>
    </form>
  );
}
function ServiceCard({ service, prices, onSaved }) {
  const [form, setForm] = useState({
    nombre: service.nombre,
    descripcion: service.descripcion || "",
    activo: service.activo,
    requiere_valoracion: service.requiere_valoracion,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!form.nombre.trim())
        throw { code: "22023", message: "El servicio necesita un nombre." };
      await updateService(service.id_servicio, {
        ...form,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
      });
      onSaved("Servicio actualizado.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="cw-panel space-y-4">
      <form onSubmit={save} className="space-y-3">
        <Notice tone="error">{error}</Notice>
        <fieldset disabled={busy} className="space-y-3">
          <Field label="Nombre del servicio">
            <input
              className="cw-input"
              value={form.nombre}
              maxLength={120}
              required
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre: e.target.value }))
              }
            />
          </Field>
          <Field label="Qué incluye">
            <textarea
              className="cw-input"
              rows={2}
              value={form.descripcion}
              onChange={(e) =>
                setForm((f) => ({ ...f, descripcion: e.target.value }))
              }
            />
          </Field>
          <div className="flex flex-wrap gap-4 text-sm text-canwash-dark">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, activo: e.target.checked }))
                }
              />
              Disponible para reservar
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.requiere_valoracion}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    requiere_valoracion: e.target.checked,
                  }))
                }
              />
              Requiere valoración
            </label>
          </div>
        </fieldset>
        <Button tone="secondary" type="submit" busy={busy}>
          Guardar servicio
        </Button>
      </form>
      <p className="text-xs text-canwash-muted">
        {service.tipo === "PAQUETE"
          ? "El precio del paquete ya incluye el baño. Solo su componente de baño participa en el descuento."
          : "Los adicionales y el corte de garras individual no tienen descuento."}
      </p>
      {prices.map((p) => (
        <PriceRow
          key={`${p.id_precio}:${p.precio}:${p.componente_bano}`}
          price={p}
          service={service}
          onSaved={onSaved}
        />
      ))}
    </article>
  );
}
function DiscountRow({ discount, onSaved }) {
  const [value, setValue] = useState(discount.porcentaje);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateDiscount(discount.minimo_mascotas, Number(value));
      onSaved("Descuento actualizado.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label={`${discount.minimo_mascotas}${discount.minimo_mascotas === 4 ? " o más" : ""} mascotas`}
        >
          <input
            className="cw-input"
            type="number"
            min="0"
            max="15"
            step="0.01"
            required
            value={value}
            disabled={busy || discount.minimo_mascotas === 1}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        {discount.minimo_mascotas > 1 && (
          <Button tone="secondary" type="submit" busy={busy}>
            Guardar porcentaje
          </Button>
        )}
      </div>
      <Notice tone="error">{error}</Notice>
    </form>
  );
}
export default function CatalogSettings({
  services,
  prices,
  discounts,
  onSaved,
}) {
  return (
    <div className="space-y-5">
      <section className="cw-panel space-y-4">
        <h3 className="text-lg font-bold text-canwash-dark">
          Descuentos por visita
        </h3>
        <p className="text-sm text-canwash-muted">
          Porcentajes sobre baños y visita; no se descuentan extras. Máximo 15%.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {discounts.map((d) => (
            <DiscountRow
              key={`${d.minimo_mascotas}:${d.porcentaje}`}
              discount={d}
              onSaved={onSaved}
            />
          ))}
        </div>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        {services.map((s) => (
          <ServiceCard
            key={`${s.id_servicio}:${s.nombre}:${s.descripcion}:${s.activo}:${s.requiere_valoracion}`}
            service={s}
            prices={prices.filter((p) => p.id_servicio === s.id_servicio)}
            onSaved={onSaved}
          />
        ))}
      </div>
    </div>
  );
}
