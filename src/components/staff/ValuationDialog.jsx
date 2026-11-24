import { useCallback, useState } from "react";
import useQuery from "../../hooks/useQuery";
import { getCatalog, quoteVisit } from "../../services/visits";
import { inputFromQuote, loadPetsForVisit } from "../../services/staff";
import { message, rpc } from "../../services/api";
import { Button, Field, Modal, Notice } from "../ui";
import PetServiceChoice from "../appointments/PetServiceChoice";
import QuoteSummary from "../appointments/QuoteSummary";

function ValuationEditor({ visit, data, onSaved, onBusy }) {
  const [pets, setPets] = useState(data.pets);
  const [input, setInput] = useState(() =>
    inputFromQuote(visit.cotizacion_snapshot, data.catalog),
  );
  const [quote, setQuote] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changePet = (id, name, value) => {
    setPets((old) =>
      old.map((p) => (p.id_mascota === id ? { ...p, [name]: value } : p)),
    );
    setQuote(null);
    setAccepted(false);
  };
  const changeServices = (id, patch) => {
    setInput((old) =>
      old.map((p) => (p.id_mascota === id ? { ...p, ...patch } : p)),
    );
    setQuote(null);
    setAccepted(false);
  };
  const work = async (task) => {
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await task();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  };
  const calculate = () =>
    work(async () => {
      if (
        pets.some(
          (p) =>
            (p.especie === "PERRO" && !(Number(p.peso_kg) > 0)) ||
            ["longitud_pelo", "tipo_capa", "estado_pelaje"].some(
              (k) => !p[k] || p[k] === "SIN_DATOS",
            ),
        )
      )
        throw {
          code: "22023",
          message:
            "Completa el peso y las características de todas las mascotas antes de guardar la valoración.",
        };
      for (const p of pets)
        await rpc("actualizar_mascota_valorada", {
          p_id_visita: visit.id_visita,
          p_id_mascota: p.id_mascota,
          p_peso: p.peso_kg === "" ? null : Number(p.peso_kg),
          p_longitud_pelo: p.longitud_pelo,
          p_tipo_capa: p.tipo_capa,
          p_estado_pelaje: p.estado_pelaje,
          p_manejo_dificil: p.manejo_dificil,
        });
      setQuote(await quoteVisit(visit.id_direccion, input));
      setAccepted(false);
    });
  const save = () =>
    work(async () => {
      await rpc("valorar_visita", {
        p_id_visita: visit.id_visita,
        p_mascotas: input,
        p_total_aceptado: quote.total,
      });
      onSaved("Valoración aceptada y visita confirmada.");
    });
  return (
    <div className="space-y-5">
      <Notice>
        Revisa las condiciones reales con el cliente. El nuevo tiempo debe caber
        antes de la siguiente visita; si no cabe, habrá que reprogramar.
      </Notice>
      <Notice tone="error">{error}</Notice>
      <fieldset disabled={busy} className="space-y-4">
        {pets.map((pet) => (
          <section
            key={pet.id_mascota}
            className="rounded-2xl border border-canwash-light/60 p-4"
          >
            <h3 className="mb-4 text-lg font-bold text-canwash-dark">
              {pet.nombre}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Peso de ${pet.nombre} (kg)`}>
                <input
                  className="cw-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={pet.peso_kg ?? ""}
                  onChange={(e) =>
                    changePet(pet.id_mascota, "peso_kg", e.target.value)
                  }
                />
              </Field>
              {[
                [
                  "longitud_pelo",
                  "Longitud",
                  [
                    ["CORTO", "Corto"],
                    ["LARGO", "Largo"],
                  ],
                ],
                [
                  "tipo_capa",
                  "Capa",
                  [
                    ["SIMPLE", "Simple"],
                    ["DOBLE", "Doble"],
                  ],
                ],
                [
                  "estado_pelaje",
                  "Estado del pelaje",
                  [
                    ["NORMAL", "Normal"],
                    ["ENREDADO", "Enredado"],
                    ["APELMAZADO", "Apelmazado / nudos severos"],
                  ],
                ],
              ].map(([name, label, values]) => (
                <Field key={name} label={`${label} de ${pet.nombre}`}>
                  <select
                    className="cw-input"
                    value={pet[name]}
                    onChange={(e) =>
                      changePet(pet.id_mascota, name, e.target.value)
                    }
                  >
                    <option value="SIN_DATOS">Seleccionar</option>
                    {values.map(([v, t]) => (
                      <option value={v} key={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
              <label className="flex items-center gap-2 text-sm text-canwash-dark">
                <input
                  type="checkbox"
                  checked={pet.manejo_dificil}
                  onChange={(e) =>
                    changePet(
                      pet.id_mascota,
                      "manejo_dificil",
                      e.target.checked,
                    )
                  }
                />{" "}
                Manejo difícil
              </label>
            </div>
            <PetServiceChoice
              pet={pet}
              catalog={data.catalog}
              value={input.find((i) => i.id_mascota === pet.id_mascota)}
              onChange={(patch) => changeServices(pet.id_mascota, patch)}
            />
          </section>
        ))}
      </fieldset>
      <Button tone="secondary" onClick={calculate} busy={busy}>
        Guardar valoración y calcular cotización
      </Button>
      {quote && (
        <div className="space-y-4 border-t border-canwash-light/50 pt-5">
          <QuoteSummary quote={quote} />
          <label className="flex items-start gap-3 rounded-xl bg-canwash-background p-4 text-sm text-canwash-dark">
            <input
              type="checkbox"
              className="mt-1"
              checked={accepted}
              disabled={busy}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            He explicado los servicios y el importe actualizado, y el cliente
            los aceptó.
          </label>
          <Button busy={busy} disabled={!accepted} onClick={save}>
            Aceptar cotización y confirmar visita
          </Button>
        </div>
      )}
    </div>
  );
}
export default function ValuationDialog({ visit, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [pets, catalog] = await Promise.all([
      loadPetsForVisit(visit),
      getCatalog(),
    ]);
    return { pets, catalog };
  }, [visit]);
  const query = useQuery(load);
  return (
    <Modal title="Valoración del estilista" onClose={onClose} busy={busy} wide>
      <Notice tone="error">{query.error && message(query.error)}</Notice>
      {query.loading ? (
        <p className="text-sm text-canwash-muted">Cargando perfiles…</p>
      ) : (
        query.data && (
          <ValuationEditor
            visit={visit}
            data={query.data}
            onSaved={onSaved}
            onBusy={setBusy}
          />
        )
      )}
    </Modal>
  );
}
