import { Clock3 } from "lucide-react";
import { duration, money } from "../../lib/appointments";
import { Notice } from "../ui";

export default function QuoteSummary({ quote, compact = false }) {
  if (!quote) return null;
  const row = (label, value, className = "") => (
    <div className={`flex items-start justify-between gap-5 ${className}`}>
      <dt>{label}</dt>
      <dd className="shrink-0 font-semibold">{value}</dd>
    </div>
  );
  return (
    <div className="space-y-4">
      {!compact && (
        <div className="space-y-3">
          {quote.mascotas.map((pet) => (
            <div
              key={pet.id_mascota}
              className="rounded-2xl bg-canwash-background p-4"
            >
              <h3 className="font-bold text-canwash-dark">{pet.nombre}</h3>
              <ul className="mt-2 space-y-2 text-sm text-canwash-text">
                {pet.servicios.map((s) => (
                  <li key={s.codigo} className="flex justify-between gap-4">
                    <span>
                      {s.nombre}
                      {s.requiere_valoracion ? " · sujeto a valoración" : ""}
                    </span>
                    <span className="shrink-0">{money(s.precio)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <dl className="space-y-2.5 text-sm text-canwash-text">
        {row("Baños", money(quote.subtotal_banos))}
        {row("Adicionales y extras", money(quote.subtotal_extras))}
        {row("Visita a domicilio", money(quote.costo_visita))}
        {row(
          `Descuento (${quote.porcentaje_descuento}%) sobre baños y visita`,
          `−${money(quote.descuento)}`,
          "text-emerald-700",
        )}
        {row(
          "Total estimado",
          money(quote.total),
          "border-t border-canwash-light pt-4 text-lg font-bold text-canwash-dark",
        )}
      </dl>
      <div className="flex items-center gap-3 rounded-xl bg-canwash-light/25 p-4 text-canwash-dark">
        <Clock3 size={21} />
        <div>
          <p className="font-semibold">
            {duration(quote.duracion_minutos)} de tiempo reservado
          </p>
          <p className="mt-1 text-xs leading-5">
            Incluye servicios, extras y visita antes del descuento. Dejamos{" "}
            {duration(quote.margen_minutos)} entre visitas.
          </p>
        </div>
      </div>
      {quote.requiere_valoracion && (
        <Notice>
          El desenredado o caso extremo requiere valoración del estilista.
          Cualquier ajuste de servicio e importe deberá acordarse contigo.
        </Notice>
      )}
    </div>
  );
}
