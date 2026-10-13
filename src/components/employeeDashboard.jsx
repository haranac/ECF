import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  Clock,
  CreditCard,
  LogOut,
  MapPin,
  PawPrint,
  Phone,
  RefreshCw,
  Scissors,
  User,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Banknote,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function EmployeeDashboard({ user, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAppointment, setSelectedAppointment] =
    useState(null);

  const [view, setView] = useState("citas");

  // =====================================================
  // CARGAR DATOS
  // =====================================================

  const loadData = async () => {
    if (!user?.id_usuario) {
      setError(
        "No se encontró el identificador del empleado."
      );

      setLoading(false);

      return;
    }

    setLoading(true);
    setError("");

    try {
      // ===============================================
      // CITAS DEL EMPLEADO
      // ===============================================

      const {
        data: appointmentData,
        error: appointmentError,
      } = await supabase
        .from("citas")
        .select(`
          id_cita,
          fecha,
          hora,
          direccion_servicio,
          colonia,
          costo_visita,
          estado,
          notas,

          clientes (
            id_cliente,
            nombre,
            telefono,
            email
          ),

          mascotas (
            id_mascota,
            nombre,
            especie,
            raza,
            tamano,
            padecimientos,
            comportamiento,
            notas
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
          "id_usuario",
          user.id_usuario
        )
        .order("fecha", {
          ascending: true,
        })
        .order("hora", {
          ascending: true,
        });

      if (appointmentError) {
        throw appointmentError;
      }

      const appointmentsResult =
        appointmentData || [];

      setAppointments(
        appointmentsResult
      );

      // ===============================================
      // OBTENER IDs DE CITAS
      // ===============================================

      const appointmentIds =
        appointmentsResult.map(
          (appointment) =>
            appointment.id_cita
        );

      // ===============================================
      // PAGOS
      // ===============================================

      if (appointmentIds.length > 0) {
        const {
          data: paymentData,
          error: paymentError,
        } = await supabase
          .from("pagos")
          .select(`
            id_pago,
            id_cita,
            monto,
            tipo,
            metodo,
            referencia,
            comprobante_url,
            estado,
            fecha_pago
          `)
          .in(
            "id_cita",
            appointmentIds
          )
          .order("fecha_pago", {
            ascending: false,
          });

        if (paymentError) {
          throw paymentError;
        }

        setPayments(
          paymentData || []
        );
      } else {
        setPayments([]);
      }

    } catch (error) {
      console.error(
        "Error cargando dashboard:",
        error
      );

      setError(
        "No fue posible cargar la información."
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // CARGAR AL ENTRAR
  // =====================================================

  useEffect(() => {
    loadData();
  }, [user?.id_usuario]);


  // =====================================================
  // FECHA DE HOY
  // =====================================================

  const today = new Date()
    .toISOString()
    .split("T")[0];


  // =====================================================
  // CITAS DE HOY
  // =====================================================

  const todayAppointments = useMemo(() => {
    return appointments.filter(
      (appointment) =>
        appointment.fecha === today
    );
  }, [appointments, today]);


  // =====================================================
  // PRÓXIMAS CITAS
  // =====================================================

  const upcomingAppointments =
    useMemo(() => {
      return appointments.filter(
        (appointment) =>
          appointment.fecha >= today &&
          appointment.estado !==
            "CANCELADA"
      );
    }, [appointments, today]);


  // =====================================================
  // CONFIRMADAS
  // =====================================================

  const confirmedAppointments =
    todayAppointments.filter(
      (appointment) =>
        appointment.estado ===
        "CONFIRMADA"
    ).length;


  // =====================================================
  // PENDIENTES
  // =====================================================

  const pendingAppointments =
    todayAppointments.filter(
      (appointment) =>
        appointment.estado ===
        "PENDIENTE"
    ).length;


  // =====================================================
  // TOTAL PAGADO
  // =====================================================

  const totalPayments = payments
    .filter(
      (payment) =>
        payment.estado === "VALIDADO"
    )
    .reduce(
      (total, payment) =>
        total +
        Number(payment.monto || 0),
      0
    );


  // =====================================================
  // CERRAR SESIÓN
  // =====================================================

  const handleLogout = async () => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(error);
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
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="employee-loading">
        <PawPrint size={45} />

        <h2>
          Cargando Can Wash...
        </h2>

        <p>
          Consultando tus citas.
        </p>
      </div>
    );
  }


  return (
    <div className="employee-dashboard">

      {/* =============================================
          SIDEBAR
      ============================================== */}

      <aside className="employee-sidebar">

        <div className="employee-logo">

          <PawPrint size={34} />

          <div>
            <strong>
              Can Wash
            </strong>

            <span>
              PANEL DE EMPLEADO
            </span>
          </div>

        </div>


        <nav>

          <button
            className={
              view === "citas"
                ? "employee-nav-active"
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
            className={
              view === "pagos"
                ? "employee-nav-active"
                : ""
            }
            onClick={() =>
              setView("pagos")
            }
          >
            <CreditCard size={20} />

            Pagos
          </button>

        </nav>


        <button
          className="employee-logout"
          onClick={handleLogout}
        >
          <LogOut size={20} />

          Cerrar sesión
        </button>

      </aside>


      {/* =============================================
          CONTENIDO
      ============================================== */}

      <main className="employee-content">

        {/* TOPBAR */}

        <header className="employee-topbar">

          <div>
            <span className="employee-section-label">
              CAN WASH
            </span>

            <h2>
              Panel de empleado
            </h2>
          </div>


          <div className="employee-topbar-actions">

            <button
              className="employee-refresh"
              onClick={loadData}
            >
              <RefreshCw size={18} />

              Actualizar
            </button>


            <div className="employee-user">

              <div className="employee-avatar">
                {user?.nombre
                  ?.charAt(0)
                  .toUpperCase() || "E"}
              </div>

              <div>
                <strong>
                  {user?.nombre ||
                    "Empleado"}
                </strong>

                <span>
                  {user?.rol ||
                    "EMPLEADO"}
                </span>
              </div>

            </div>

          </div>

        </header>


        {/* ERROR */}

        {error && (
          <div className="employee-error">
            <AlertCircle size={20} />

            {error}
          </div>
        )}


        {/* =============================================
            CITAS
        ============================================== */}

        {view === "citas" && (
          <>

            {/* BIENVENIDA */}

            <section className="employee-welcome">

              <div>

                <span className="employee-welcome-label">
                  TU JORNADA
                </span>

                <h1>
                  ¡Hola,{" "}
                  {user?.nombre ||
                    "Empleado"}!
                </h1>

                <p>
                  Consulta tus citas,
                  horarios, clientes,
                  mascotas y servicios
                  programados.
                </p>

              </div>

              <PawPrint
                className="employee-welcome-paw"
              />

            </section>


            {/* ESTADÍSTICAS */}

            <section className="employee-stats">

              <EmployeeStat
                icon={<CalendarDays />}
                title="Citas de hoy"
                value={
                  todayAppointments.length
                }
                text="Servicios programados"
              />


              <EmployeeStat
                icon={<CheckCircle2 />}
                title="Confirmadas"
                value={
                  confirmedAppointments
                }
                text="Citas confirmadas"
              />


              <EmployeeStat
                icon={<AlertCircle />}
                title="Pendientes"
                value={
                  pendingAppointments
                }
                text="Por confirmar"
              />


              <EmployeeStat
                icon={<CalendarClock />}
                title="Próximas"
                value={
                  upcomingAppointments.length
                }
                text="Desde hoy"
              />

            </section>


            {/* CITAS DE HOY */}

            <AppointmentSection
              title="Citas de hoy"
              subtitle="Servicios programados para tu jornada."
              appointments={
                todayAppointments
              }
              payments={payments}
              onSelect={
                setSelectedAppointment
              }
            />


            {/* PRÓXIMAS */}

            <AppointmentSection
              title="Próximas citas"
              subtitle="Servicios que tienes asignados."
              appointments={
                upcomingAppointments
              }
              payments={payments}
              onSelect={
                setSelectedAppointment
              }
            />

          </>
        )}


        {/* =============================================
            PAGOS
        ============================================== */}

        {view === "pagos" && (
          <PaymentsView
            payments={payments}
            appointments={
              appointments
            }
            totalPayments={
              totalPayments
            }
          />
        )}

      </main>


      {/* =============================================
          MODAL DETALLE CITA
      ============================================== */}

      {selectedAppointment && (
        <AppointmentModal
          appointment={
            selectedAppointment
          }
          payments={payments.filter(
            (payment) =>
              payment.id_cita ===
              selectedAppointment.id_cita
          )}
          onClose={() =>
            setSelectedAppointment(null)
          }
        />
      )}

    </div>
  );
}


// =====================================================
// ESTADÍSTICA
// =====================================================

function EmployeeStat({
  icon,
  title,
  value,
  text,
}) {
  return (
    <article className="employee-stat-card">

      <div className="employee-stat-icon">
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


// =====================================================
// SECCIÓN CITAS
// =====================================================

function AppointmentSection({
  title,
  subtitle,
  appointments,
  payments,
  onSelect,
}) {
  return (
    <section className="employee-appointments">

      <div className="employee-panel-title">

        <div>
          <h2>{title}</h2>

          <p>{subtitle}</p>
        </div>

      </div>


      {appointments.length === 0 ? (

        <div className="employee-empty">

          <PawPrint size={45} />

          <h3>
            No hay citas
          </h3>

          <p>
            No tienes servicios
            programados en esta sección.
          </p>

        </div>

      ) : (

        <div className="appointment-list">

          {appointments.map(
            (appointment) => (

              <AppointmentCard
                key={
                  appointment.id_cita
                }
                appointment={
                  appointment
                }
                payments={
                  payments.filter(
                    (payment) =>
                      payment.id_cita ===
                      appointment.id_cita
                  )
                }
                onClick={() =>
                  onSelect(
                    appointment
                  )
                }
              />

            )
          )}

        </div>

      )}

    </section>
  );
}


// =====================================================
// TARJETA CITA
// =====================================================

function AppointmentCard({
  appointment,
  payments,
  onClick,
}) {
  const totalPaid = payments
    .filter(
      (payment) =>
        payment.estado === "VALIDADO"
    )
    .reduce(
      (total, payment) =>
        total +
        Number(payment.monto || 0),
      0
    );

  return (
    <article
      className="appointment-card"
      onClick={onClick}
    >

      <div className="appointment-time">

        <Clock size={19} />

        <div>
          <strong>
            {formatTime(
              appointment.hora
            )}
          </strong>

          <span>
            {formatDate(
              appointment.fecha
            )}
          </span>
        </div>

      </div>


      <div className="appointment-main">

        <div className="appointment-heading">

          <div>
            <h3>
              {appointment.mascotas
                ?.nombre ||
                "Mascota"}
            </h3>

            <span>
              {appointment.mascotas
                ?.especie ||
                "Sin especie"}

              {appointment.mascotas
                ?.raza &&
                ` · ${appointment.mascotas.raza}`}

              {appointment.mascotas
                ?.tamano &&
                ` · ${appointment.mascotas.tamano}`}
            </span>
          </div>


          <StatusBadge
            status={
              appointment.estado
            }
          />

        </div>


        {/* SERVICIOS */}

        <div className="appointment-services">

          {appointment.detalle_cita
            ?.map((detail) => (
              <span
                key={
                  detail.id_detalle
                }
              >
                <Scissors size={15} />

                {detail.servicios
                  ?.nombre ||
                  "Servicio"}
              </span>
            ))}

        </div>


        {/* INFORMACIÓN */}

        <div className="appointment-information">

          <div>
            <User size={17} />

            <span>
              {appointment.clientes
                ?.nombre ||
                "Sin cliente"}
            </span>
          </div>


          <div>
            <Phone size={17} />

            <span>
              {appointment.clientes
                ?.telefono ||
                "Sin teléfono"}
            </span>
          </div>


          <div>
            <MapPin size={17} />

            <span>
              {appointment.colonia ||
                "Sin colonia"}
            </span>
          </div>


          <div>
            <Banknote size={17} />

            <span>
              Pagado:{" "}
              {formatMoney(
                totalPaid
              )}
            </span>
          </div>

        </div>

      </div>

    </article>
  );
}


// =====================================================
// PAGOS
// =====================================================

function PaymentsView({
  payments,
  appointments,
  totalPayments,
}) {
  return (
    <>

      <section className="employee-welcome">

        <div>
          <span className="employee-welcome-label">
            PAGOS
          </span>

          <h1>
            Historial de pagos
          </h1>

          <p>
            Consulta los pagos asociados
            a las citas que tienes
            asignadas.
          </p>
        </div>

        <CreditCard
          className="employee-welcome-paw"
        />

      </section>


      <section className="employee-stats payments-stats">

        <EmployeeStat
          icon={<Banknote />}
          title="Pagos validados"
          value={
            payments.filter(
              (payment) =>
                payment.estado ===
                "VALIDADO"
            ).length
          }
          text="Registros validados"
        />

        <EmployeeStat
          icon={<CreditCard />}
          title="Total registrado"
          value={
            formatMoney(
              totalPayments
            )
          }
          text="Pagos validados"
        />

      </section>


      <section className="employee-appointments">

        <div className="employee-panel-title">

          <div>
            <h2>
              Movimientos
            </h2>

            <p>
              Pagos correspondientes a
              tus citas.
            </p>
          </div>

        </div>


        {payments.length === 0 ? (

          <div className="employee-empty">

            <CreditCard size={45} />

            <h3>
              No hay pagos
            </h3>

          </div>

        ) : (

          <div className="payment-list">

            {payments.map(
              (payment) => {

                const appointment =
                  appointments.find(
                    (item) =>
                      item.id_cita ===
                      payment.id_cita
                  );

                return (
                  <div
                    className="payment-row"
                    key={
                      payment.id_pago
                    }
                  >

                    <div className="payment-icon">
                      <Banknote />
                    </div>


                    <div className="payment-information">

                      <strong>
                        {payment.tipo}
                      </strong>

                      <span>
                        {appointment
                          ?.clientes
                          ?.nombre ||
                          "Cliente"}

                        {" · "}

                        {appointment
                          ?.mascotas
                          ?.nombre ||
                          "Mascota"}
                      </span>

                    </div>


                    <div className="payment-method">

                      <strong>
                        {payment.metodo}
                      </strong>

                      <span>
                        {formatPaymentDate(
                          payment.fecha_pago
                        )}
                      </span>

                    </div>


                    <div className="payment-amount">

                      <strong>
                        {formatMoney(
                          payment.monto
                        )}
                      </strong>

                      <StatusBadge
                        status={
                          payment.estado
                        }
                      />

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </section>

    </>
  );
}


// =====================================================
// MODAL DETALLE
// =====================================================

function AppointmentModal({
  appointment,
  payments,
  onClose,
}) {
  const serviceTotal =
    appointment.detalle_cita
      ?.reduce(
        (total, detail) =>
          total +
          Number(detail.precio || 0) *
            Number(
              detail.cantidad || 1
            ),
        0
      ) || 0;

  const visitCost =
    Number(
      appointment.costo_visita || 0
    );

  const total =
    serviceTotal + visitCost;

  const paid = payments
    .filter(
      (payment) =>
        payment.estado === "VALIDADO"
    )
    .reduce(
      (sum, payment) =>
        sum +
        Number(payment.monto || 0),
      0
    );

  const pending =
    Math.max(total - paid, 0);

  return (
    <div
      className="appointment-modal-background"
      onClick={onClose}
    >

      <div
        className="appointment-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="modal-header">

          <div>
            <span>
              DETALLE DE CITA
            </span>

            <h2>
              {appointment.mascotas
                ?.nombre ||
                "Mascota"}
            </h2>
          </div>

          <button
            onClick={onClose}
          >
            ×
          </button>

        </div>


        <div className="modal-grid">

          <ModalInformation
            title="Fecha"
            value={
              formatDate(
                appointment.fecha
              )
            }
          />

          <ModalInformation
            title="Hora"
            value={
              formatTime(
                appointment.hora
              )
            }
          />

          <ModalInformation
            title="Cliente"
            value={
              appointment.clientes
                ?.nombre
            }
          />

          <ModalInformation
            title="Teléfono"
            value={
              appointment.clientes
                ?.telefono
            }
          />

          <ModalInformation
            title="Colonia"
            value={
              appointment.colonia
            }
          />

          <ModalInformation
            title="Estado"
            value={
              appointment.estado
            }
          />

        </div>


        <div className="modal-section">

          <h3>
            Mascota
          </h3>

          <p>
            <strong>Especie:</strong>{" "}
            {appointment.mascotas
              ?.especie ||
              "Sin información"}
          </p>

          <p>
            <strong>Raza:</strong>{" "}
            {appointment.mascotas
              ?.raza ||
              "Sin información"}
          </p>

          <p>
            <strong>Tamaño:</strong>{" "}
            {appointment.mascotas
              ?.tamano ||
              "Sin información"}
          </p>

          {appointment.mascotas
            ?.padecimientos && (
            <p>
              <strong>
                Padecimientos:
              </strong>{" "}
              {
                appointment.mascotas
                  .padecimientos
              }
            </p>
          )}

          {appointment.mascotas
            ?.comportamiento && (
            <p>
              <strong>
                Comportamiento:
              </strong>{" "}
              {
                appointment.mascotas
                  .comportamiento
              }
            </p>
          )}

        </div>


        <div className="modal-section">

          <h3>
            Servicios
          </h3>

          {appointment.detalle_cita
            ?.map((detail) => (

              <div
                className="modal-service-row"
                key={
                  detail.id_detalle
                }
              >

                <span>
                  {detail.servicios
                    ?.nombre}
                </span>

                <strong>
                  {formatMoney(
                    detail.precio
                  )}
                </strong>

              </div>

            ))}

        </div>


        <div className="modal-section">

          <h3>
            Pago
          </h3>

          <div className="appointment-payment-summary">

            <div>
              <span>
                Total
              </span>

              <strong>
                {formatMoney(total)}
              </strong>
            </div>

            <div>
              <span>
                Pagado
              </span>

              <strong>
                {formatMoney(paid)}
              </strong>
            </div>

            <div>
              <span>
                Pendiente
              </span>

              <strong>
                {formatMoney(pending)}
              </strong>
            </div>

          </div>

        </div>


        {appointment.notas && (

          <div className="modal-section">

            <h3>
              Notas
            </h3>

            <p>
              {appointment.notas}
            </p>

          </div>

        )}

      </div>

    </div>
  );
}


function ModalInformation({
  title,
  value,
}) {
  return (
    <div className="modal-information">

      <span>
        {title}
      </span>

      <strong>
        {value || "Sin información"}
      </strong>

    </div>
  );
}


// =====================================================
// ESTADOS
// =====================================================

function StatusBadge({ status }) {
  const normalized =
    status?.toUpperCase();

  let className =
    "status-default";

  if (
    normalized === "CONFIRMADA" ||
    normalized === "VALIDADO"
  ) {
    className =
      "status-confirmed";
  }

  if (
    normalized === "PENDIENTE"
  ) {
    className =
      "status-pending";
  }

  if (
    normalized === "COMPLETADA"
  ) {
    className =
      "status-completed";
  }

  if (
    normalized === "CANCELADA" ||
    normalized === "RECHAZADO"
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


// =====================================================
// FORMATOS
// =====================================================

function formatMoney(value) {
  return new Intl.NumberFormat(
    "es-MX",
    {
      style: "currency",
      currency: "MXN",
    }
  ).format(
    Number(value || 0)
  );
}


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
    new Date(`${date}T00:00:00`)
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


function formatPaymentDate(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "es-MX",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(date)
  );
}


export default EmployeeDashboard;