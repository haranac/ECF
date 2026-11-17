import { useEffect, useState } from "react";
import { Button, Field, Modal, Notice } from "../ui";
import useQuery from "../../hooks/useQuery";
import { listBreeds, savePet, sizeForWeight } from "../../services/pets";
import { message } from "../../services/api";

export default function PetForm({ clientId, pet, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    nombre: pet?.nombre || "",
    especie: pet?.especie || "PERRO",
    id_raza: pet?.id_raza || "",
    raza: pet?.raza || "",
    peso_kg: pet?.peso_kg ?? "",
    longitud_pelo: pet?.longitud_pelo || "",
    tipo_capa: pet?.tipo_capa || "",
    estado_pelaje: pet?.estado_pelaje || "",
    manejo_dificil: pet?.manejo_dificil || false,
    padecimientos: pet?.padecimientos || "",
    comportamiento: pet?.comportamiento || "",
    notas: pet?.notas || "",
  }));
  const breeds = useQuery(listBreeds);
  const [size, setSize] = useState(pet?.tamano || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    const timer = window.setTimeout(async () => {
      if (form.especie === "GATO") {
        setSize("Gato · tarifa propia");
        return;
      }
      if (!(Number(form.peso_kg) > 0)) {
        setSize("Ingresa un peso positivo");
        return;
      }
      try {
        const value = await sizeForWeight(form.peso_kg);
        if (current) setSize(value);
      } catch {
        if (current) setSize("Se calculará al guardar");
      }
    }, 250);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [form.especie, form.peso_kg]);
  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((old) => ({
      ...old,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "especie" ? { id_raza: "", raza: "" } : {}),
      ...(name === "id_raza"
        ? {
            raza:
              breeds.data?.find((b) => String(b.id_raza) === value)?.nombre ||
              "",
          }
        : {}),
    }));
    setError("");
  };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!form.nombre.trim())
        throw { code: "22023", message: "Escribe el nombre de tu mascota." };
      await savePet(clientId, pet?.id_mascota, form);
      onSaved();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  const pick = (label, name, entries) => (
    <Field label={label}>
      <select
        className="cw-input"
        name={name}
        value={form[name] === "SIN_DATOS" ? "" : form[name]}
        onChange={change}
        required
      >
        <option value="">Selecciona una opción</option>
        {entries.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <Modal
      title={pet ? `Editar a ${pet.nombre}` : "Registrar mascota"}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm leading-6 text-canwash-muted">
          Estos datos nos ayudan a reservar el tiempo que tu mascota necesita.
          El estilista podrá confirmar su condición durante la visita.
        </p>
        <Notice tone="error">
          {error || (breeds.error && message(breeds.error))}
        </Notice>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input
              className="cw-input"
              name="nombre"
              autoComplete="off"
              maxLength={100}
              value={form.nombre}
              onChange={change}
              required
            />
          </Field>
          {pick("Especie", "especie", [
            ["PERRO", "Perro"],
            ["GATO", "Gato"],
          ])}
          <Field label="Raza">
            <select
              className="cw-input"
              name="id_raza"
              value={form.id_raza}
              onChange={change}
              disabled={breeds.loading}
            >
              <option value="">Sin especificar / conservar raza</option>
              {breeds.data
                ?.filter((b) => b.especie === form.especie)
                .map((b) => (
                  <option key={b.id_raza} value={b.id_raza}>
                    {b.nombre}
                  </option>
                ))}
            </select>
          </Field>
          <Field
            label="Peso (kg)"
            hint={`Tamaño: ${size || "se calcula con el peso"}`}
          >
            <input
              className="cw-input"
              type="number"
              name="peso_kg"
              min="0.01"
              max="999"
              step="0.01"
              required={form.especie === "PERRO"}
              value={form.peso_kg}
              onChange={change}
            />
          </Field>
          {pick("Longitud del pelo", "longitud_pelo", [
            ["CORTO", "Corto"],
            ["LARGO", "Largo"],
          ])}
          {pick("Tipo de capa", "tipo_capa", [
            ["SIMPLE", "Simple"],
            ["DOBLE", "Doble capa"],
          ])}
          {pick("Estado del pelaje", "estado_pelaje", [
            ["NORMAL", "Normal"],
            ["ENREDADO", "Enredado"],
            ["APELMAZADO", "Apelmazado / nudos severos"],
          ])}
          <label className="flex items-center gap-3 rounded-xl bg-canwash-background p-3 text-sm text-canwash-dark">
            <input
              type="checkbox"
              name="manejo_dificil"
              checked={form.manejo_dificil}
              onChange={change}
            />{" "}
            Requiere manejo especial o difícil
          </label>
          <Field label="Padecimientos o cuidados" className="sm:col-span-2">
            <textarea
              className="cw-input"
              name="padecimientos"
              value={form.padecimientos}
              onChange={change}
              rows={2}
            />
          </Field>
          <Field label="Comportamiento">
            <textarea
              className="cw-input"
              name="comportamiento"
              value={form.comportamiento}
              onChange={change}
              rows={2}
            />
          </Field>
          <Field label="Notas adicionales">
            <textarea
              className="cw-input"
              name="notas"
              value={form.notas}
              onChange={change}
              rows={2}
            />
          </Field>
        </fieldset>
        <div className="flex flex-wrap justify-end gap-3">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" busy={busy}>
            {pet ? "Guardar cambios" : "Registrar mascota"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
