import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dog,
  LogOut,
  MapPin,
  PawPrint,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Scissors,
  User,
  X,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function ClientDashboard({ user, onLogout }) {
  const [client, setClient] = useState(null);
  const [pets, setPets] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [view, setView] = useState("inicio");

  const [showProfileModal, setShowProfileModal] =
    useState(false);

  const [showPetModal, setShowPetModal] =
    useState(false);

  const [selectedPet, setSelectedPet] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =====================================================
  // CARGAR INFORMACIÓN
  // =====================================================

  const loadData = async () => {
    if (!user?.id_usuario) {
      setError(
        "No se encontró el usuario autenticado."
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // =============================================
      // PERFIL DEL CLIENTE
      // =============================================

      const {
        data: clientData,
        error: clientError,
      } = await supabase
        .from("clientes")
        .select(`
          id_cliente,
          id_usuario,
          nombre,
          telefono,
          email,
          colonia,
          direccion,
          medio_contacto,
          origen_cliente,
          notas,
          fecha_registro
        `)
        .eq(
          "id_usuario",
          user.id_usuario
        )
        .maybeSingle();

      if (clientError) {
        throw clientError;
      }

      setClient(clientData);

      // Si todavía no creó su perfil
      if (!clientData) {
        setPets([]);
        setAppointments([]);
        return;
      }

      // =============================================
      // MASCOTAS
      // =============================================

      const {
        data: petsData,
        error: petsError,
      } = await supabase
        .from("mascotas")
        .select(`
          id_mascota,
          id_cliente,
          nombre,
          especie,
          raza,
          tamano,
          peso_kg,
          padecimientos,
          comportamiento,
          notas,
          fecha_registro
        `)
        .eq(
          "id_cliente",
          clientData.id_cliente
        )
        .order(
          "fecha_registro",
          {
            ascending: false,
          }
        );

      if (petsError) {
        throw petsError;
      }

      setPets(petsData || []);

      // =============================================
      // CITAS DEL CLIENTE
      // =============================================

      const {
        data: appointmentsData,
        error: appointmentsError,
      } = await supabase
        .from("citas")
        .select(`
          id_cita,
          id_mascota,
          fecha,
          hora,
          direccion_servicio,
          colonia,
          costo_visita,
          estado,
          notas,

          mascotas (
            id_mascota,
            nombre,
            especie,
            raza,
            tamano
          ),

          detalle_cita (
            id_detalle,
            cantidad,
            precio,

            servicios (
              id_servicio,
              nombre,
              descripcion
            )
          )
        `)
        .eq(
          "id_cliente",
          clientData.id_cliente
        )
        .order(
          "fecha",
          {
            ascending: true,
          }
        )
        .order(
          "hora",
          {
            ascending: true,
          }
        );

      if (appointmentsError) {
        throw appointmentsError;
      }

      setAppointments(
        appointmentsData || []
      );

    } catch (error) {
      console.error(
        "Error cargando dashboard:",
        error
      );

      setError(
        "No fue posible cargar tu información."
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id_usuario]);

  // =====================================================
  // CITAS PRÓXIMAS
  // =====================================================

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const upcomingAppointments =
    useMemo(() => {
      return appointments.filter(
        (appointment) =>
          appointment.fecha >= today &&
          appointment.estado !== "CANCELADA"
      );
    }, [appointments, today]);

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.estado ===
        "COMPLETADA"
    ).length;

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      onLogout();

    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );
    }
  };

  // =====================================================
  // REGISTRAR MASCOTA
  // =====================================================

  const openPetRegistration = () => {
    if (!client) {
      setShowProfileModal(true);
      return;
    }

    setSelectedPet(null);
    setShowPetModal(true);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="client-loading">
        <PawPrint size={50} />

        <h2>
          Cargando Can Wash...
        </h2>

        <p>
          Preparando tu información.
        </p>
      </div>
    );
  }

  return (
    <div className="client-dashboard">

      {/* =================================================
          SIDEBAR
      ================================================== */}

      <aside className="client-sidebar">

        <div className="client-logo">
          <PawPrint size={35} />

          <div>
            <strong>
              Can Wash
            </strong>

            <span>
              PANEL DE CLIENTE
            </span>
          </div>
        </div>

        <nav>

          <button
            className={
              view === "inicio"
                ? "client-nav-active"
                : ""
            }
            onClick={() =>
              setView("inicio")
            }
          >
            <PawPrint size={20} />

            Inicio
          </button>

          <button
            className={
              view === "mascotas"
                ? "client-nav-active"
                : ""
            }
            onClick={() =>
              setView("mascotas")
            }
          >
            <Dog size={20} />

            Mis mascotas
          </button>

          <button
            className={
              view === "citas"
                ? "client-nav-active"
                : ""
            }
            onClick={() =>
              setView("citas")
            }
          >
            <CalendarDays size={20} />

            Mis citas
          </button>

          <button
            onClick={() =>
              setShowProfileModal(true)
            }
          >
            <User size={20} />

            Mi perfil
          </button>

        </nav>

        <button
          className="client-logout"
          onClick={handleLogout}
        >
          <LogOut size={20} />

          Cerrar sesión
        </button>

      </aside>

      {/* =================================================
          CONTENIDO
      ================================================== */}

      <main className="client-content">

        {/* TOPBAR */}

        <header className="client-topbar">

          <div>
            <span>
              CAN WASH
            </span>

            <h2>
              Mi cuenta
            </h2>
          </div>

          <div className="client-topbar-actions">

            <button
              className="client-refresh"
              onClick={loadData}
            >
              <RefreshCw size={18} />

              Actualizar
            </button>

            <div className="client-user">

              <div className="client-user-avatar">
                {user?.nombre
                  ?.charAt(0)
                  .toUpperCase() || "C"}
              </div>

              <div>
                <strong>
                  {user?.nombre ||
                    "Cliente"}
                </strong>

                <span>
                  Cliente
                </span>
              </div>

            </div>

          </div>

        </header>

        {/* ERROR */}

        {error && (
          <div className="client-error">
            <AlertCircle size={20} />

            {error}
          </div>
        )}

        {/* =================================================
            INICIO
        ================================================== */}

        {view === "inicio" && (
          <>

            <section className="client-welcome">

              <div>
                <span className="client-welcome-label">
                  BIENVENIDO A CAN WASH
                </span>

                <h1>
                  ¡Hola,{" "}
                  {user?.nombre ||
                    "Cliente"}!
                </h1>

                <p>
                  Registra a tus mascotas y
                  consulta la información de
                  sus próximos servicios.
                </p>

                <button
                  className="client-main-button"
                  onClick={
                    openPetRegistration
                  }
                >
                  <Plus size={19} />

                  Registrar mascota
                </button>
              </div>

              <PawPrint
                className="client-welcome-paw"
              />

            </section>

            {/* ESTADÍSTICAS */}

            <section className="client-stats">

              <ClientStat
                icon={<Dog />}
                title="Mis mascotas"
                value={pets.length}
                text="Mascotas registradas"
              />

              <ClientStat
                icon={<CalendarDays />}
                title="Próximas citas"
                value={
                  upcomingAppointments.length
                }
                text="Servicios programados"
              />

              <ClientStat
                icon={<CheckCircle2 />}
                title="Servicios realizados"
                value={
                  completedAppointments
                }
                text="Citas completadas"
              />

            </section>

            {/* PERFIL INCOMPLETO */}

            {!client && (
              <section className="client-profile-warning">

                <AlertCircle size={25} />

                <div>
                  <h3>
                    Completa tu perfil
                  </h3>

                  <p>
                    Antes de registrar a tu
                    mascota necesitamos tu
                    teléfono, colonia y
                    dirección.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowProfileModal(true)
                  }
                >
                  Completar perfil
                </button>

              </section>
            )}

            <PetSection
              pets={pets}
              onAdd={
                openPetRegistration
              }
              onSelectPet={
                setSelectedPet
              }
            />

            {upcomingAppointments.length >
              0 && (
              <AppointmentsSection
                appointments={
                  upcomingAppointments
                }
              />
            )}

          </>
        )}

        {/* =================================================
            MASCOTAS
        ================================================== */}

        {view === "mascotas" && (
          <PetSection
            pets={pets}
            onAdd={
              openPetRegistration
            }
            onSelectPet={
              setSelectedPet
            }
          />
        )}

        {/* =================================================
            CITAS
        ================================================== */}

        {view === "citas" && (
          <AppointmentsSection
            appointments={
              appointments
            }
          />
        )}

      </main>

      {/* =================================================
          PERFIL
      ================================================== */}

      {showProfileModal && (
        <ProfileModal
          user={user}
          client={client}
          onClose={() =>
            setShowProfileModal(false)
          }
          onSaved={() => {
            setShowProfileModal(false);

            loadData();
          }}
        />
      )}

      {/* =================================================
          REGISTRAR MASCOTA
      ================================================== */}

      {showPetModal && client && (
        <PetModal
          client={client}
          onClose={() =>
            setShowPetModal(false)
          }
          onSaved={() => {
            setShowPetModal(false);

            loadData();
          }}
        />
      )}

      {/* =================================================
          DETALLE MASCOTA
      ================================================== */}

      {selectedPet && (
        <PetDetailsModal
          pet={selectedPet}
          onClose={() =>
            setSelectedPet(null)
          }
        />
      )}

    </div>
  );
}

/* =========================================================
   ESTADÍSTICA
========================================================= */

function ClientStat({
  icon,
  title,
  value,
  text,
}) {
  return (
    <article className="client-stat-card">

      <div className="client-stat-icon">
        {icon}
      </div>

      <div>
        <span>
          {title}
        </span>

        <h2>
          {value}
        </h2>

        <small>
          {text}
        </small>
      </div>

    </article>
  );
}

/* =========================================================
   MASCOTAS
========================================================= */

function PetSection({
  pets,
  onAdd,
  onSelectPet,
}) {
  return (
    <section className="client-panel">

      <div className="client-panel-header">

        <div>
          <h2>
            Mis mascotas
          </h2>

          <p>
            Mascotas registradas para
            recibir servicios de Can Wash.
          </p>
        </div>

        <button
          className="client-add-button"
          onClick={onAdd}
        >
          <Plus size={18} />

          Registrar mascota
        </button>

      </div>

      {pets.length === 0 ? (
        <div className="client-empty">

          <PawPrint size={45} />

          <h3>
            No tienes mascotas registradas
          </h3>

          <p>
            Registra al perro o gato que
            recibirá el servicio.
          </p>

        </div>
      ) : (
        <div className="client-pets-grid">

          {pets.map((pet) => (
            <article
              key={pet.id_mascota}
              className="client-pet-card"
              onClick={() =>
                onSelectPet(pet)
              }
            >

              <div className="client-pet-icon">
                {pet.especie === "GATO" ? (
                  <PawPrint size={30} />
                ) : (
                  <Dog size={30} />
                )}
              </div>

              <div className="client-pet-header">

                <div>
                  <h3>
                    {pet.nombre}
                  </h3>

                  <span>
                    {pet.especie}
                  </span>
                </div>

              </div>

              <div className="client-pet-information">

                <div>
                  <span>
                    Raza
                  </span>

                  <strong>
                    {pet.raza ||
                      "Sin especificar"}
                  </strong>
                </div>

                <div>
                  <span>
                    Tamaño
                  </span>

                  <strong>
                    {pet.tamano ||
                      "Sin especificar"}
                  </strong>
                </div>

                {pet.peso_kg && (
                  <div>
                    <span>
                      Peso
                    </span>

                    <strong>
                      {pet.peso_kg} kg
                    </strong>
                  </div>
                )}

              </div>

              {pet.padecimientos && (
                <div className="client-pet-warning">

                  <AlertCircle
                    size={16}
                  />

                  <span>
                    {pet.padecimientos}
                  </span>

                </div>
              )}

            </article>
          ))}

        </div>
      )}

    </section>
  );
}

/* =========================================================
   CITAS
========================================================= */

function AppointmentsSection({
  appointments,
}) {
  return (
    <section className="client-panel">

      <div className="client-panel-header">

        <div>
          <h2>
            Mis citas
          </h2>

          <p>
            Consulta los servicios
            programados para tus mascotas.
          </p>
        </div>

      </div>

      {appointments.length === 0 ? (
        <div className="client-empty">

          <CalendarDays size={45} />

          <h3>
            No tienes citas
          </h3>

          <p>
            Cuando tengas un servicio
            programado aparecerá aquí.
          </p>

        </div>
      ) : (
        <div className="client-appointments-list">

          {appointments.map(
            (appointment) => (
              <article
                key={
                  appointment.id_cita
                }
                className="client-appointment-card"
              >

                <div className="client-appointment-date">

                  <CalendarDays
                    size={20}
                  />

                  <div>
                    <strong>
                      {formatDate(
                        appointment.fecha
                      )}
                    </strong>

                    <span>
                      <Clock
                        size={13}
                      />

                      {formatTime(
                        appointment.hora
                      )}
                    </span>
                  </div>

                </div>

                <div className="client-appointment-main">

                  <div className="client-appointment-heading">

                    <div>
                      <h3>
                        {appointment
                          .mascotas
                          ?.nombre ||
                          "Mascota"}
                      </h3>

                      <span>
                        {appointment
                          .mascotas
                          ?.raza ||
                          appointment
                            .mascotas
                            ?.especie}
                      </span>
                    </div>

                    <StatusBadge
                      status={
                        appointment.estado
                      }
                    />

                  </div>

                  <div className="client-appointment-services">

                    {appointment
                      .detalle_cita
                      ?.map((detail) => (
                        <span
                          key={
                            detail.id_detalle
                          }
                        >
                          <Scissors
                            size={14}
                          />

                          {detail
                            .servicios
                            ?.nombre ||
                            "Servicio"}
                        </span>
                      ))}

                  </div>

                  <div className="client-appointment-address">

                    <MapPin size={16} />

                    <span>
                      {appointment
                        .direccion_servicio ||
                        appointment
                          .colonia ||
                        "Dirección por confirmar"}
                    </span>

                  </div>

                </div>

              </article>
            )
          )}

        </div>
      )}

    </section>
  );
}

/* =========================================================
   PERFIL CLIENTE
========================================================= */

function ProfileModal({
  user,
  client,
  onClose,
  onSaved,
}) {
  const [form, setForm] =
    useState({
      telefono:
        client?.telefono || "",

      colonia:
        client?.colonia || "",

      direccion:
        client?.direccion || "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleChange = (e) => {
    setForm({
      ...form,

      [e.target.name]:
        e.target.value,
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.telefono.trim() ||
      !form.colonia.trim()
    ) {
      setError(
        "Teléfono y colonia son obligatorios."
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      if (client) {
        const {
          error: updateError,
        } = await supabase
          .from("clientes")
          .update({
            telefono:
              form.telefono.trim(),

            colonia:
              form.colonia.trim(),

            direccion:
              form.direccion.trim() ||
              null,
          })
          .eq(
            "id_cliente",
            client.id_cliente
          );

        if (updateError) {
          throw updateError;
        }

      } else {
        const {
          error: insertError,
        } = await supabase
          .from("clientes")
          .insert({
            id_usuario:
              user.id_usuario,

            nombre:
              user.nombre,

            email:
              user.email,

            telefono:
              form.telefono.trim(),

            colonia:
              form.colonia.trim(),

            direccion:
              form.direccion.trim() ||
              null,

            medio_contacto:
              "APP",

            origen_cliente:
              "APP",
          });

        if (insertError) {
          throw insertError;
        }
      }

      onSaved();

    } catch (error) {
      console.error(
        "Error guardando perfil:",
        error
      );

      setError(
        "No fue posible guardar tu información."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBackground
      onClose={onClose}
    >

      <div className="client-modal-header">

        <div>
          <span>
            MI INFORMACIÓN
          </span>

          <h2>
            Datos del cliente
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
        >
          <X size={20} />
        </button>

      </div>

      <form
        onSubmit={handleSubmit}
      >

        <label>
          Nombre
        </label>

        <input
          value={
            user.nombre || ""
          }
          disabled
        />

        <label>
          Correo
        </label>

        <input
          value={
            user.email || ""
          }
          disabled
        />

        <label>
          WhatsApp / Teléfono *
        </label>

        <div className="input-container">

          <Phone size={19} />

          <input
            name="telefono"
            value={
              form.telefono
            }
            onChange={
              handleChange
            }
            placeholder="981 123 4567"
          />

        </div>

        <label>
          Colonia *
        </label>

        <div className="input-container">

          <MapPin size={19} />

          <input
            name="colonia"
            value={
              form.colonia
            }
            onChange={
              handleChange
            }
            placeholder="Ej. Santa Ana"
          />

        </div>

        <label>
          Dirección
        </label>

        <textarea
          name="direccion"
          value={
            form.direccion
          }
          onChange={
            handleChange
          }
          placeholder="Calle, número y referencias"
        />

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <button
          className="primary-button"
          disabled={loading}
        >
          <Save size={18} />

          {loading
            ? "Guardando..."
            : "Guardar información"}
        </button>

      </form>

    </ModalBackground>
  );
}

/* =========================================================
   REGISTRAR PERRO / MASCOTA
========================================================= */

function PetModal({
  client,
  onClose,
  onSaved,
}) {
  const [form, setForm] =
    useState({
      nombre: "",
      especie: "PERRO",
      raza: "",
      tamano: "MEDIANO",
      peso_kg: "",
      padecimientos: "",
      comportamiento: "",
      notas: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleChange = (e) => {
    setForm({
      ...form,

      [e.target.name]:
        e.target.value,
    });

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      setError(
        "Ingresa el nombre de tu mascota."
      );

      return;
    }

    if (!form.tamano) {
      setError(
        "Selecciona el tamaño de tu mascota."
      );

      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        error: insertError,
      } = await supabase
        .from("mascotas")
        .insert({
          id_cliente:
            client.id_cliente,

          nombre:
            form.nombre.trim(),

          especie:
            form.especie,

          raza:
            form.raza.trim() ||
            null,

          tamano:
            form.tamano,

          peso_kg:
            form.peso_kg
              ? Number(
                  form.peso_kg
                )
              : null,

          padecimientos:
            form.padecimientos
              .trim() ||
            null,

          comportamiento:
            form.comportamiento
              .trim() ||
            null,

          notas:
            form.notas.trim() ||
            null,
        });

      if (insertError) {
        throw insertError;
      }

      onSaved();

    } catch (error) {
      console.error(
        "Error registrando mascota:",
        error
      );

      setError(
        "No fue posible registrar la mascota."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalBackground
      onClose={onClose}
    >

      <div className="client-modal-header">

        <div>
          <span>
            CAN WASH
          </span>

          <h2>
            Registrar mascota
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
        >
          <X size={20} />
        </button>

      </div>

      <p className="client-modal-description">
        Registra la información que
        necesitamos conocer antes de
        realizar el baño.
      </p>

      <form
        onSubmit={handleSubmit}
      >

        <div className="client-form-grid">

          <div>
            <label>
              Nombre *
            </label>

            <input
              name="nombre"
              value={
                form.nombre
              }
              onChange={
                handleChange
              }
              placeholder="Ej. Max"
            />
          </div>

          <div>
            <label>
              Especie *
            </label>

            <select
              name="especie"
              value={
                form.especie
              }
              onChange={
                handleChange
              }
            >
              <option value="PERRO">
                Perro
              </option>

              <option value="GATO">
                Gato
              </option>
            </select>
          </div>

          <div>
            <label>
              Raza
            </label>

            <input
              name="raza"
              value={
                form.raza
              }
              onChange={
                handleChange
              }
              placeholder="Ej. French Poodle"
            />
          </div>

          <div>
            <label>
              Tamaño *
            </label>

            <select
              name="tamano"
              value={
                form.tamano
              }
              onChange={
                handleChange
              }
            >
              <option value="CHICO">
                Chico
              </option>

              <option value="MEDIANO">
                Mediano
              </option>

              <option value="GRANDE">
                Grande
              </option>

              <option value="GIGANTE">
                Gigante
              </option>
            </select>
          </div>

          <div>
            <label>
              Peso aproximado
            </label>

            <input
              name="peso_kg"
              type="number"
              min="0"
              step="0.1"
              value={
                form.peso_kg
              }
              onChange={
                handleChange
              }
              placeholder="Ej. 12.5 kg"
            />
          </div>

        </div>

        <label>
          ¿Tiene algún padecimiento?
        </label>

        <textarea
          name="padecimientos"
          value={
            form.padecimientos
          }
          onChange={
            handleChange
          }
          placeholder="Epilepsia, problemas cardíacos, alergias, etc."
        />

        <label>
          ¿Cómo es su comportamiento?
        </label>

        <textarea
          name="comportamiento"
          value={
            form.comportamiento
          }
          onChange={
            handleChange
          }
          placeholder="Tranquilo, nervioso, agresivo, intenta morder..."
        />

        <label>
          Observaciones del pelaje
        </label>

        <textarea
          name="notas"
          value={
            form.notas
          }
          onChange={
            handleChange
          }
          placeholder="Nudos, doble capa, pelaje apelmazado, sensibilidad..."
        />

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={loading}
        >
          <Save size={18} />

          {loading
            ? "Registrando..."
            : "Registrar mascota"}
        </button>

      </form>

    </ModalBackground>
  );
}

/* =========================================================
   DETALLE MASCOTA
========================================================= */

function PetDetailsModal({
  pet,
  onClose,
}) {
  return (
    <ModalBackground
      onClose={onClose}
    >

      <div className="client-modal-header">

        <div>
          <span>
            MASCOTA
          </span>

          <h2>
            {pet.nombre}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
        >
          <X size={20} />
        </button>

      </div>

      <div className="client-pet-detail-icon">
        {pet.especie === "GATO" ? (
          <PawPrint size={42} />
        ) : (
          <Dog size={42} />
        )}
      </div>

      <div className="client-detail-grid">

        <Detail
          title="Especie"
          value={pet.especie}
        />

        <Detail
          title="Raza"
          value={
            pet.raza ||
            "Sin especificar"
          }
        />

        <Detail
          title="Tamaño"
          value={
            pet.tamano ||
            "Sin especificar"
          }
        />

        <Detail
          title="Peso"
          value={
            pet.peso_kg
              ? `${pet.peso_kg} kg`
              : "Sin especificar"
          }
        />

      </div>

      <div className="client-detail-section">

        <h3>
          Padecimientos
        </h3>

        <p>
          {pet.padecimientos ||
            "No se registraron padecimientos."}
        </p>

      </div>

      <div className="client-detail-section">

        <h3>
          Comportamiento
        </h3>

        <p>
          {pet.comportamiento ||
            "Sin observaciones."}
        </p>

      </div>

      <div className="client-detail-section">

        <h3>
          Observaciones
        </h3>

        <p>
          {pet.notas ||
            "Sin observaciones."}
        </p>

      </div>

    </ModalBackground>
  );
}

function Detail({
  title,
  value,
}) {
  return (
    <div className="client-detail-item">

      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

/* =========================================================
   MODAL BASE
========================================================= */

function ModalBackground({
  children,
  onClose,
}) {
  return (
    <div
      className="client-modal-background"
      onClick={onClose}
    >
      <div
        className="client-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   ESTADOS
========================================================= */

function StatusBadge({ status }) {
  let className =
    "status-default";

  if (
    status === "CONFIRMADA"
  ) {
    className =
      "status-confirmed";
  }

  if (
    status === "PENDIENTE"
  ) {
    className =
      "status-pending";
  }

  if (
    status === "COMPLETADA"
  ) {
    className =
      "status-completed";
  }

  if (
    status === "CANCELADA"
  ) {
    className =
      "status-cancelled";
  }

  return (
    <span
      className={`appointment-status ${className}`}
    >
      {status}
    </span>
  );
}

/* =========================================================
   FORMATO
========================================================= */

function formatDate(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(
      `${date}T00:00:00`
    )
  );
}

function formatTime(time) {
  if (!time) {
    return "";
  }

  return time
    .toString()
    .slice(0, 5);
}

export default ClientDashboard;