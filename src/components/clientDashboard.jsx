import { useCallback, useState } from "react";
import { CalendarDays, CheckCircle2, Dog, PawPrint, Plus } from "lucide-react";
import useQuery from "../hooks/useQuery";
import { loadClientData } from "../services/clients";
import { message } from "../services/api";
import DashboardLayout from "./DashboardLayout";
import { Button, Notice } from "./ui";
import PetsPanel from "./pets/PetsPanel";
import PetForm from "./pets/PetForm";
import AddressesPanel from "./addresses/AddressesPanel";
import BookingWizard from "./appointments/BookingWizard";
import VisitsPanel from "./appointments/VisitsPanel";

const titles = {
  inicio: "Tu espacio Can Wash",
  mascotas: "Mis mascotas",
  citas: "Mis citas",
  ubicacion: "Mis domicilios",
};
export default function ClientDashboard({
  user,
  onLogout,
  onProfile,
  initialView = "inicio",
}) {
  const [view, setView] = useState(
    titles[initialView] ? initialView : "inicio",
  );
  const [petForm, setPetForm] = useState(null);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState("");
  const load = useCallback(
    () => loadClientData(user.id_usuario),
    [user.id_usuario],
  );
  const query = useQuery(load);
  const { client, pets = [], visits = [], legacy = [] } = query.data || {};
  const upcoming = visits.filter(
    (v) =>
      !["CANCELADA", "COMPLETADA"].includes(v.estado) &&
      new Date(v.agenda_estilistas.fin) >= new Date(),
  );
  const openPet = () => (client ? setPetForm({}) : onProfile(view));
  const openBooking = () => (client ? setBooking(true) : onProfile(view));
  const navigate = (target) => {
    setSuccess("");
    setView(target);
  };
  const stats = [
    {
      label: "Mis mascotas",
      value: pets.length,
      text: "Perros y gatos registrados",
      icon: Dog,
    },
    {
      label: "Próximas visitas",
      value: upcoming.length,
      text: "Tiempo reservado para ellos",
      icon: CalendarDays,
    },
    {
      label: "Visitas completadas",
      value: visits.filter((v) => v.estado === "COMPLETADA").length,
      text: "Cuidados que dejan huella",
      icon: CheckCircle2,
    },
  ];
  return (
    <DashboardLayout
      user={user}
      view={view}
      onChangeView={navigate}
      onProfile={onProfile}
      onLogout={onLogout}
      onRefresh={query.reload}
      loading={query.loading}
      title={titles[view]}
    >
      <div className="space-y-6">
        <Notice tone="error">{query.error && message(query.error)}</Notice>
        <Notice tone="success">{success}</Notice>
        {query.loading && !query.data && (
          <p className="text-sm text-canwash-muted">Preparando tu espacio…</p>
        )}
        {!query.loading && !client && !query.error && (
          <Notice>
            Completa tu perfil para registrar mascotas y domicilios.{" "}
            <button
              className="font-semibold underline"
              onClick={() => onProfile(view)}
            >
              Completar mi perfil
            </button>
          </Notice>
        )}
        {view === "inicio" && (
          <>
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-canwash-light/80 to-canwash-cream/90 px-6 py-9 sm:px-9">
              <div className="relative z-10 max-w-lg">
                <p className="text-[10px] font-bold tracking-[0.2em] text-canwash-text">
                  CUIDADOS QUE LLEGAN A CASA
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-canwash-dark sm:text-4xl">
                  ¡Hola, {user.nombre?.split(" ")[0] || "bienvenido"}!
                </h2>
                <p className="mt-3 text-sm leading-7 text-canwash-text">
                  Un baño, mucho cariño y la tranquilidad de estar en casa.
                  Organiza la próxima visita de tus mascotas en un solo lugar.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={openBooking}>
                    <CalendarDays size={18} />
                    Agendar visita
                  </Button>
                  <Button tone="secondary" onClick={openPet}>
                    <Plus size={17} />
                    Registrar mascota
                  </Button>
                </div>
              </div>
              <PawPrint
                size={240}
                className="absolute -bottom-14 -right-5 rotate-12 text-canwash/20"
              />
            </section>
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map(({ label, value, text, icon: Icon }) => (
                <article
                  key={label}
                  className="cw-panel flex items-start gap-4"
                >
                  <span className="rounded-2xl bg-canwash-light/30 p-3 text-canwash-dark">
                    <Icon size={22} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-canwash-muted">
                      {label}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-canwash-dark">
                      {value}
                    </p>
                    <p className="mt-1 text-xs text-canwash-muted">{text}</p>
                  </div>
                </article>
              ))}
            </div>
            <VisitsPanel
              visits={visits}
              compact
              onBook={openBooking}
              onChanged={query.reload}
            />
            <PetsPanel
              pets={pets.slice(0, 3)}
              onAdd={openPet}
              onEdit={setPetForm}
            />
          </>
        )}
        {view === "mascotas" && (
          <PetsPanel pets={pets} onAdd={openPet} onEdit={setPetForm} />
        )}
        {view === "ubicacion" && (
          <AddressesPanel client={client} onProfile={() => onProfile(view)} />
        )}
        {view === "citas" && (
          <VisitsPanel
            visits={visits}
            legacy={legacy}
            onBook={openBooking}
            onChanged={query.reload}
          />
        )}
      </div>
      {petForm && client && (
        <PetForm
          key={petForm.id_mascota || "new"}
          clientId={client.id_cliente}
          pet={petForm.id_mascota ? petForm : null}
          onClose={() => setPetForm(null)}
          onSaved={() => {
            setPetForm(null);
            query.reload();
            setSuccess("Perfil de mascota guardado.");
          }}
        />
      )}
      {booking && client && (
        <BookingWizard
          client={client}
          pets={pets}
          onClose={() => setBooking(false)}
          onManagePets={() => {
            setBooking(false);
            setView("mascotas");
          }}
          onManageAddresses={() => {
            setBooking(false);
            setView("ubicacion");
          }}
          onReserved={() => {
            setBooking(false);
            setView("citas");
            setSuccess(
              "Tu visita quedó reservada. Puedes consultar aquí su estado y sus detalles.",
            );
            query.reload();
          }}
        />
      )}
    </DashboardLayout>
  );
}
