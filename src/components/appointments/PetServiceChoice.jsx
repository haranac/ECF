import { money } from "../../lib/appointments";
import { Field } from "../ui";

export default function PetServiceChoice({ pet, catalog, value, onChange }) {
  if (!catalog) return null;
  return (
    <div className="mt-4 space-y-4">
      <Field label={`Servicio para ${pet.nombre}`}>
        <select
          className="cw-input"
          value={value.paquete}
          onChange={(e) => onChange({ paquete: e.target.value, extras: [] })}
        >
          {catalog.services
            .filter((s) => s.tipo !== "EXTRA")
            .map((s) => (
              <option
                key={s.codigo}
                value={s.codigo}
                disabled={
                  (pet.estado_pelaje === "ENREDADO" &&
                    s.codigo === "BANO_INTEGRAL") ||
                  (pet.estado_pelaje === "APELMAZADO" &&
                    s.codigo === "BANO_DESENREDADO")
                }
              >
                {s.nombre}
              </option>
            ))}
        </select>
      </Field>
      {value.paquete !== "GARRAS" && (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold text-canwash-dark">
            Extras para {pet.nombre}
          </legend>
          {catalog.services
            .filter((s) => s.tipo === "EXTRA")
            .map((extra) => {
              const automatic =
                (extra.codigo === "DOBLE_CAPA" && pet.tipo_capa === "DOBLE") ||
                (extra.codigo === "MANEJO_DIFICIL" && pet.manejo_dificil) ||
                (extra.codigo === "CASO_EXTREMO" &&
                  pet.estado_pelaje === "APELMAZADO");
              const incompatible =
                (extra.codigo === "DOBLE_CAPA" && pet.tipo_capa !== "DOBLE") ||
                (extra.codigo === "CASO_EXTREMO" &&
                  value.paquete === "BANO_DESENREDADO");
              const price = catalog.prices.find(
                (p) => p.id_servicio === extra.id_servicio && p.especie == null,
              );
              return (
                <label
                  key={extra.codigo}
                  className={`flex items-start gap-2 rounded-xl border border-canwash-light/40 p-3 text-sm ${incompatible ? "opacity-40" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={automatic || value.extras.includes(extra.codigo)}
                    disabled={
                      automatic ||
                      (incompatible && !value.extras.includes(extra.codigo))
                    }
                    onChange={(e) =>
                      onChange({
                        extras: e.target.checked
                          ? [...value.extras, extra.codigo]
                          : value.extras.filter((x) => x !== extra.codigo),
                      })
                    }
                    className="mt-1 accent-canwash-dark"
                  />
                  <span>
                    {extra.nombre} {price && `+${money(price.precio)}`}
                    {automatic && (
                      <span className="block text-xs text-canwash-muted">
                        Se agrega por su perfil
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
        </fieldset>
      )}
    </div>
  );
}
