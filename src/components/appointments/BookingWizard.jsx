import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  RefreshCw,
} from "lucide-react";
import useQuery from "../../hooks/useQuery";
import {
  addressReady,
  getBusiness,
  listAddresses,
} from "../../services/addresses";
import {
  findReservation,
  findSlots,
  getCatalog,
  quoteVisit,
  reserveVisit,
} from "../../services/visits";
import { message } from "../../services/api";
import {
  dateKey,
  dateLabel,
  duration,
  money,
  timeLabel,
} from "../../lib/appointments";
import { Button, Empty, Field, Modal, Notice } from "../ui";
import QuoteSummary from "./QuoteSummary";
import PetServiceChoice from "./PetServiceChoice";

const pendingKey = (clientId) => `canwash:reserva-pendiente:${clientId}`;
function readPending(clientId) {
  try {
    return JSON.parse(sessionStorage.getItem(pendingKey(clientId)) || "null");
  } catch {
    return null;
  }
}
const initialPackage = (pet) =>
  ["ENREDADO", "APELMAZADO"].includes(pet.estado_pelaje)
    ? "BANO_RAPADO"
    : "BANO_INTEGRAL";

export default function BookingWizard({
  client,
  pets,
  onClose,
  onReserved,
  onManagePets,
  onManageAddresses,
}) {
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState(() =>
    pets.length === 1
      ? {
          [pets[0].id_mascota]: {
            paquete: initialPackage(pets[0]),
            extras: [],
          },
        }
      : {},
  );
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(dateKey());
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(() => readPending(client.id_cliente));
  const catalog = useQuery(getCatalog);
  const loadAddresses = useCallback(async () => {
    const [addresses, business] = await Promise.all([
      listAddresses(client.id_cliente),
      getBusiness(),
    ]);
    return { addresses, business };
  }, [client.id_cliente]);
  const addresses = useQuery(loadAddresses);
  const input = useMemo(
    () =>
      Object.entries(selection).map(([id, values]) => ({
        id_mascota: Number(id),
        ...values,
      })),
    [selection],
  );
  const body = JSON.stringify(input);
  const loadQuote = useCallback(
    () =>
      step >= 2 && address && input.length
        ? quoteVisit(address, JSON.parse(body))
        : Promise.resolve(null),
    [step, address, body, input.length],
  );
  const quote = useQuery(loadQuote);
  const loadSlots = useCallback(
    () =>
      step === 3 && address && date && quote.data
        ? findSlots(date, address, JSON.parse(body))
        : Promise.resolve([]),
    [step, address, date, body, quote.data],
  );
  const slots = useQuery(loadSlots);
  const pickedAddress = addresses.data?.addresses.find(
    (a) => String(a.id_direccion) === address,
  );
  const incomplete = input.some((i) => {
    const p = pets.find((p) => p.id_mascota === i.id_mascota);
    return (
      !p ||
      (p.especie === "PERRO" && !p.peso_kg) ||
      ["longitud_pelo", "tipo_capa", "estado_pelaje"].some(
        (k) => !p[k] || p[k] === "SIN_DATOS",
      )
    );
  });
  const togglePet = (pet) => {
    setError("");
    setSelection((old) => {
      const next = { ...old };
      if (next[pet.id_mascota]) delete next[pet.id_mascota];
      else next[pet.id_mascota] = { paquete: initialPackage(pet), extras: [] };
      return next;
    });
  };
  const editSelection = (id, patch) => {
    setSelection((old) => ({ ...old, [id]: { ...old[id], ...patch } }));
    setError("");
  };
  const next = () => {
    setError("");
    setSlot("");
    setStep((s) => s + 1);
  };
  const finish = (visitId) => {
    sessionStorage.removeItem(pendingKey(client.id_cliente));
    setPending(null);
    onReserved(visitId);
  };
  const confirm = async () => {
    const parameters = pending || {
      p_inicio: slot,
      p_id_direccion: Number(address),
      p_mascotas: input,
      p_total_esperado: quote.data.total,
      p_duracion_esperada: quote.data.duracion_minutos,
      p_solicitud: crypto.randomUUID(),
    };
    setBusy(true);
    setError("");
    setPending(parameters);
    try {
      sessionStorage.setItem(
        pendingKey(client.id_cliente),
        JSON.stringify(parameters),
      );
      const existing = await findReservation(parameters.p_solicitud);
      finish(existing?.id_visita || (await reserveVisit(parameters)));
    } catch (cause) {
      if (cause.code) {
        sessionStorage.removeItem(pendingKey(client.id_cliente));
        setPending(null);
        setSlot("");
        quote.reload();
        slots.reload();
      }
      setError(
        cause.code
          ? message(cause)
          : "No recibimos una confirmación. Reintenta con el mismo botón; conservamos la solicitud para evitar una reserva duplicada.",
      );
    } finally {
      setBusy(false);
    }
  };
  const zone =
    quote.data?.zona_horaria || addresses.data?.business?.zona_horaria;
  const steps = [
    "Mascotas y servicios",
    "Domicilio",
    "Tu cotización",
    "Fecha y horario",
  ];
  return (
    <Modal title="Agendar visita" onClose={onClose} busy={busy} wide>
      <div className="space-y-6">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((label, i) => (
            <li
              key={label}
              aria-current={step === i ? "step" : undefined}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${i === step ? "bg-canwash-dark text-white" : i < step ? "bg-canwash-light/50 text-canwash-dark" : "bg-canwash-background text-canwash-muted"}`}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
        <Notice tone="error">
          {error ||
            (catalog.error && message(catalog.error)) ||
            (addresses.error && message(addresses.error))}
        </Notice>
        {pending ? (
          <div className="space-y-4">
            <Notice>
              Hay una solicitud de reserva sin respuesta confirmada. Podemos
              comprobarla o reenviarla sin crear otra reserva.
            </Notice>
            <p className="font-semibold text-canwash-dark">
              {dateLabel(pending.p_inicio, zone)} ·{" "}
              {timeLabel(pending.p_inicio, zone)}
            </p>
            <p className="text-sm text-canwash-muted">
              Total: {money(pending.p_total_esperado)} · Duración:{" "}
              {duration(pending.p_duracion_esperada)}
            </p>
            <Button busy={busy} onClick={confirm}>
              Comprobar y reintentar confirmación
            </Button>
          </div>
        ) : (
          <>
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-canwash-dark">
                    ¿A quién vamos a consentir?
                  </h3>
                  <p className="mt-1 text-sm text-canwash-muted">
                    Puedes incluir varias mascotas en una misma visita.
                  </p>
                </div>
                {!pets.length && (
                  <Empty title="Primero registra una mascota">
                    <Button className="mt-4" onClick={onManagePets}>
                      Ir a mis mascotas
                    </Button>
                  </Empty>
                )}
                {catalog.loading && (
                  <p className="text-sm text-canwash-muted">
                    Cargando servicios…
                  </p>
                )}
                {pets.map((pet) => {
                  const chosen = selection[pet.id_mascota];
                  return (
                    <section
                      key={pet.id_mascota}
                      className={`rounded-2xl border p-4 ${chosen ? "border-canwash bg-canwash-background/50" : "border-canwash-light/50"}`}
                    >
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={Boolean(chosen)}
                          onChange={() => togglePet(pet)}
                          className="h-5 w-5 accent-canwash-dark"
                        />
                        <span>
                          <strong className="block text-canwash-dark">
                            {pet.nombre}
                          </strong>
                          <span className="text-xs text-canwash-muted">
                            {pet.especie === "GATO" ? "Gato" : pet.tamano} ·{" "}
                            {pet.raza || "Raza sin especificar"}
                          </span>
                        </span>
                      </label>
                      {chosen && (
                        <PetServiceChoice
                          pet={pet}
                          catalog={catalog.data}
                          value={chosen}
                          onChange={(patch) =>
                            editSelection(pet.id_mascota, patch)
                          }
                        />
                      )}
                    </section>
                  );
                })}
                {incomplete && (
                  <Notice>
                    Hay datos de peso o pelaje pendientes.{" "}
                    <button
                      className="font-semibold underline"
                      onClick={onManagePets}
                    >
                      Completar perfiles de mascotas
                    </button>
                  </Notice>
                )}
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex justify-between gap-3">
                  <h3 className="text-lg font-bold text-canwash-dark">
                    ¿Dónde será la visita?
                  </h3>
                  <Button
                    tone="ghost"
                    onClick={addresses.reload}
                    aria-label="Actualizar recorridos"
                  >
                    <RefreshCw size={17} />
                  </Button>
                </div>
                {!addresses.loading && !addresses.data?.addresses.length && (
                  <Empty title="Agrega el domicilio del servicio">
                    Guarda el punto y las referencias antes de reservar.
                  </Empty>
                )}
                {addresses.data?.addresses.map((a) => {
                  const ready = addressReady(a, addresses.data.business);
                  return (
                    <label
                      key={a.id_direccion}
                      className={`flex gap-3 rounded-2xl border p-4 ${String(a.id_direccion) === address ? "border-canwash bg-canwash-background" : "border-canwash-light/50"} ${ready ? "cursor-pointer" : "opacity-65"}`}
                    >
                      <input
                        type="radio"
                        name="domicilio-visita"
                        value={a.id_direccion}
                        checked={String(a.id_direccion) === address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={!ready}
                        className="mt-1 accent-canwash-dark"
                      />
                      <span>
                        <strong className="block text-canwash-dark">
                          {a.direccion}
                        </strong>
                        <span className="mt-1 block text-sm text-canwash-muted">
                          {a.colonia}
                        </span>
                        <span
                          className={`mt-2 block text-xs font-semibold ${ready ? "text-emerald-700" : "text-amber-800"}`}
                        >
                          {ready
                            ? `Recorrido validado · ${a.distancia_origen_km} km`
                            : "El personal debe revisar el recorrido antes de reservar"}
                        </span>
                      </span>
                    </label>
                  );
                })}
                <Button tone="secondary" onClick={onManageAddresses}>
                  <MapPin size={17} /> Administrar mis domicilios
                </Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-canwash-dark">
                  Revisa los detalles de tu visita
                </h3>
                <Notice tone="error">
                  {quote.error && message(quote.error)}
                </Notice>
                {quote.loading ? (
                  <p className="text-sm text-canwash-muted">
                    Calculando cotización…
                  </p>
                ) : (
                  <QuoteSummary quote={quote.data} />
                )}
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-6 md:grid-cols-[1fr_0.8fr]">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-canwash-dark">
                    Elige tu horario
                  </h3>
                  <Field
                    label="Fecha de la visita"
                    hint="Los horarios reflejan la jornada y los cierres del negocio."
                  >
                    <input
                      className="cw-input"
                      type="date"
                      min={dateKey(new Date(), zone)}
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setSlot("");
                        setError("");
                      }}
                    />
                  </Field>
                  <Notice tone="error">
                    {slots.error && message(slots.error)}
                  </Notice>
                  {slots.loading ? (
                    <p className="text-sm text-canwash-muted">
                      Buscando horarios disponibles…
                    </p>
                  ) : slots.error ? (
                    <Button tone="secondary" onClick={slots.reload}>
                      Volver a consultar horarios
                    </Button>
                  ) : !slots.data?.length ? (
                    <Empty title="No hay espacio para esta visita en la fecha seleccionada">
                      Prueba con otro día. La atención completa debe terminar
                      antes del cierre.
                    </Empty>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {slots.data.map((s) => (
                        <button
                          key={s.inicio}
                          type="button"
                          onClick={() => setSlot(s.inicio)}
                          aria-pressed={slot === s.inicio}
                          className={`rounded-xl border p-3 text-sm font-semibold transition ${slot === s.inicio ? "border-canwash-dark bg-canwash-dark text-white" : "border-canwash-light bg-white text-canwash-dark hover:bg-canwash-background"}`}
                        >
                          {timeLabel(s.inicio, zone)}
                          <span
                            className={`mt-1 block text-xs font-normal ${slot === s.inicio ? "text-white/80" : "text-canwash-muted"}`}
                          >
                            hasta {timeLabel(s.fin, zone)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {slot && (
                    <Notice tone="success">
                      <span className="font-semibold">
                        {dateLabel(slot, zone)}
                      </span>
                      <br />
                      {timeLabel(slot, zone)} · domicilio:{" "}
                      {pickedAddress?.direccion}
                    </Notice>
                  )}
                </div>
                <aside className="rounded-2xl bg-canwash-background p-4">
                  <QuoteSummary quote={quote.data} compact />
                </aside>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-canwash-light/50 pt-5">
              <Button
                tone="ghost"
                onClick={() => (step ? setStep((s) => s - 1) : onClose())}
                disabled={busy}
              >
                <ArrowLeft size={17} />
                {step ? "Anterior" : "Cancelar"}
              </Button>
              {step < 3 ? (
                <Button
                  onClick={next}
                  disabled={
                    (step === 0 &&
                      (!input.length ||
                        incomplete ||
                        catalog.loading ||
                        !catalog.data)) ||
                    (step === 1 &&
                      (!pickedAddress ||
                        !addressReady(
                          pickedAddress,
                          addresses.data?.business,
                        ))) ||
                    (step === 2 &&
                      (!quote.data || quote.loading || quote.error))
                  }
                >
                  Continuar <ArrowRight size={17} />
                </Button>
              ) : (
                <Button
                  onClick={confirm}
                  busy={busy}
                  disabled={
                    !slot ||
                    slots.loading ||
                    slots.error ||
                    quote.loading ||
                    quote.error ||
                    !quote.data
                  }
                >
                  <Check size={17} />
                  Confirmar visita
                </Button>
              )}
            </div>
            <p className="flex items-center gap-2 text-xs text-canwash-muted">
              <Clock3 size={14} />
              Los horarios se vuelven a comprobar al confirmar tu reserva.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
