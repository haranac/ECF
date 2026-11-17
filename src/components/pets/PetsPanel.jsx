import { Cat, Dog, Pencil, Plus } from "lucide-react";
import { Button, Empty } from "../ui";

export default function PetsPanel({ pets, onAdd, onEdit }) {
  return (
    <section className="cw-panel mt-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-canwash-dark">Mis mascotas</h2>
          <p className="mt-1 text-sm text-canwash-muted">
            Su perfil, cuidados y características para cada visita.
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus size={18} /> Registrar mascota
        </Button>
      </div>
      {!pets.length ? (
        <div className="mt-6">
          <Empty title="Tu primera visita empieza con su perfil">
            Registra a tus perros o gatos para consultar servicios y horarios.
          </Empty>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pets.map((pet) => {
            const Icon = pet.especie === "GATO" ? Cat : Dog;
            const incomplete = [
              "longitud_pelo",
              "tipo_capa",
              "estado_pelaje",
            ].some((k) => !pet[k] || pet[k] === "SIN_DATOS");
            return (
              <article
                key={pet.id_mascota}
                className="rounded-2xl border border-canwash-light/50 bg-canwash-background/60 p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-2xl bg-canwash-light/40 p-3 text-canwash-dark">
                    <Icon size={26} />
                  </span>
                  <Button
                    tone="ghost"
                    onClick={() => onEdit(pet)}
                    aria-label={`Editar a ${pet.nombre}`}
                  >
                    <Pencil size={16} /> Editar
                  </Button>
                </div>
                <h3 className="mt-4 text-xl font-bold text-canwash-dark">
                  {pet.nombre}
                </h3>
                <p className="mt-1 text-sm text-canwash-muted">
                  {pet.raza || "Raza sin especificar"} ·{" "}
                  {pet.peso_kg ? `${pet.peso_kg} kg` : "Sin peso"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="cw-tag">
                    {pet.especie === "GATO"
                      ? "Gato"
                      : pet.tamano || "Tamaño pendiente"}
                  </span>
                  <span className="cw-tag">
                    {pet.longitud_pelo === "LARGO"
                      ? "Pelo largo"
                      : pet.longitud_pelo === "CORTO"
                        ? "Pelo corto"
                        : "Pelaje pendiente"}
                  </span>
                  {pet.tipo_capa === "DOBLE" && (
                    <span className="cw-tag">Doble capa</span>
                  )}
                </div>
                {incomplete && (
                  <p className="mt-4 text-xs font-medium text-amber-800">
                    Completa el pelaje antes de agendar.
                  </p>
                )}
                {pet.padecimientos && (
                  <p className="mt-3 text-sm leading-5 text-canwash-muted">
                    Cuidados: {pet.padecimientos}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
