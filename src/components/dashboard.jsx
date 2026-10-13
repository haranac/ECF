import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PawPrint,
  Plus,
  Scissors,
  Users,
} from "lucide-react";

function Dashboard({
  user,
  onRegisterClient,
  onLogout,
}) {
  const clients =
    JSON.parse(localStorage.getItem("canWashClients")) ||
    [];

  const totalPets = clients.reduce(
    (total, client) =>
      total + (client.pets?.length || 0),
    0
  );

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <PawPrint size={36} />
          <div>
            <strong>Can Wash</strong>
            <span>Administración</span>
          </div>
        </div>

        <nav>
          <button className="nav-active">
            <LayoutDashboard />
            Inicio
          </button>

          <button>
            <Users />
            Clientes
          </button>

          <button>
            <CalendarDays />
            Citas
          </button>

          <button>
            <Scissors />
            Servicios
          </button>

          <button>
            <CreditCard />
            Pagos
          </button>
        </nav>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          <LogOut />
          Cerrar sesión
        </button>
      </aside>

      <main className="dashboard-content">
        <header className="topbar">
          <div>
            <span>Panel administrativo</span>
          </div>

          <div className="user">
            <div className="avatar">
              {user.name.charAt(0)}
            </div>

            <div>
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>
        </header>

        <section className="welcome-card">
          <div>
            <span className="welcome-label">
              CAN WASH
            </span>

            <h1>
              ¡Hola, {user.name}!
            </h1>

            <p>
              Gestiona clientes, mascotas, citas y
              servicios desde un solo lugar.
            </p>

            <button
              onClick={onRegisterClient}
              className="welcome-button"
            >
              <Plus size={18} />
              Registrar cliente
            </button>
          </div>

          <PawPrint className="welcome-paw" />
        </section>

        <section className="stats-grid">
          <StatCard
            icon={<Users />}
            title="Clientes"
            value={clients.length}
            text="Registrados"
          />

          <StatCard
            icon={<PawPrint />}
            title="Mascotas"
            value={totalPets}
            text="Registradas"
          />

          <StatCard
            icon={<CalendarDays />}
            title="Citas de hoy"
            value="0"
            text="Sin citas pendientes"
          />

          <StatCard
            icon={<CreditCard />}
            title="Ingresos"
            value="$0"
            text="Este mes"
          />
        </section>

        <section className="clients-panel">
          <div className="panel-header">
            <div>
              <h2>Clientes recientes</h2>
              <p>
                Últimos clientes registrados en Can Wash.
              </p>
            </div>

            <button
              className="small-button"
              onClick={onRegisterClient}
            >
              <Plus size={18} />
              Nuevo cliente
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="empty-state">
              <PawPrint size={45} />

              <h3>Todavía no hay clientes</h3>

              <p>
                Registra tu primer cliente para comenzar.
              </p>
            </div>
          ) : (
            <div className="client-list">
              {clients
                .slice()
                .reverse()
                .slice(0, 5)
                .map((client) => (
                  <div
                    className="client-row"
                    key={client.id}
                  >
                    <div className="client-avatar">
                      {client.name.charAt(0)}
                    </div>

                    <div className="client-info">
                      <strong>{client.name}</strong>

                      <span>
                        {client.phone} · {client.colony}
                      </span>
                    </div>

                    <div className="pet-count">
                      <PawPrint size={16} />

                      {client.pets?.length || 0} mascota(s)
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value, text }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div>
        <span>{title}</span>
        <h2>{value}</h2>
        <small>{text}</small>
      </div>
    </article>
  );
}

export default Dashboard;