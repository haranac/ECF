import {
  CalendarDays,
  CreditCard,
  Dog,
  LogOut,
  MapPin,
  PawPrint,
  User,
  Users,
} from "lucide-react";


function Sidebar({
  user,
  view,
  isOpen,
  onChangeView,
  onProfile,
  onLogout,
}) {
  // =====================================================
  // ROL
  // =====================================================

  const role =
    user?.rol
      ?.trim()
      .toUpperCase() ||
    "";


  // =====================================================
  // OPCIONES SEGÚN ROL
  // =====================================================

  const menuItems =
    getMenuItems(role);


  // =====================================================
  // NOMBRE DEL PANEL
  // =====================================================

  const panelName =
    getPanelName(role);


  return (
    <aside
      className={`
        fixed
        left-0
        top-0
        z-50

        flex
        h-dvh
        w-72
        flex-col

        bg-gradient-to-b
        from-canwash
        to-[#7899A4]

        px-5
        py-8

        text-white

        shadow-2xl

        transition-transform
        duration-300
        ease-out

        ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }

        md:w-20
        md:translate-x-0
        md:px-3

        lg:w-64
        lg:px-5
      `}
    >

      {/* =================================================
          LOGO
      ================================================== */}

      <div
        className="
          flex
          items-center
          gap-3
          px-2

          md:justify-center

          lg:justify-start
        "
      >

        <PawPrint
          size={34}
          className="shrink-0"
        />


        <div
          className="
            md:hidden
            lg:block
          "
        >

          <strong
            className="
              block
              text-lg
              font-bold
            "
          >
            Can Wash
          </strong>


          <span
            className="
              mt-1
              block
              text-[10px]
              font-medium
              tracking-[0.15em]
              text-white/80
            "
          >
            {panelName}
          </span>

        </div>

      </div>


      {/* =================================================
          INFORMACIÓN DEL USUARIO
      ================================================== */}

      <div
        className="
          mt-8

          hidden

          rounded-2xl

          bg-white/10

          p-4

          lg:block
        "
      >

        <div
          className="
            flex
            items-center
            gap-3
          "
        >

          <div
            className="
              grid
              h-10
              w-10
              shrink-0
              place-items-center

              rounded-full

              bg-white/20

              font-bold
            "
          >
            {user?.nombre
              ?.charAt(0)
              .toUpperCase() ||
              "U"}
          </div>


          <div className="min-w-0">

            <strong
              className="
                block
                truncate
                text-sm
              "
            >
              {user?.nombre ||
                "Usuario"}
            </strong>


            <span
              className="
                mt-1
                block
                text-[10px]
                font-semibold
                tracking-wide
                text-white/70
              "
            >
              {role}
            </span>

          </div>

        </div>

      </div>


      {/* =================================================
          NAVEGACIÓN
      ================================================== */}

      <nav
        className="
          mt-8
          flex
          flex-col
          gap-2
        "
      >

        {menuItems.map(
          (item) => (

            <SidebarButton
              key={
                item.view
              }

              active={
                view === item.view
              }

              icon={
                item.icon
              }

              text={
                item.text
              }

              onClick={() =>
                onChangeView(
                  item.view
                )
              }
            />

          )
        )}


        {/* =================================================
            PERFIL
        ================================================== */}

        <SidebarButton
          active={
            view === "perfil"
          }

          icon={
            <User size={20} />
          }

          text="Mi perfil"

          onClick={
            onProfile
          }
        />

      </nav>


      {/* =================================================
          CERRAR SESIÓN
      ================================================== */}

      <button
        type="button"

        onClick={
          onLogout
        }

        title="Cerrar sesión"

        className="
          mt-auto

          flex
          w-full
          items-center
          gap-3

          rounded-xl

          px-4
          py-3

          text-sm
          font-medium
          text-white

          transition

          hover:bg-white/15

          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-white/60

          md:justify-center
          md:px-2

          lg:justify-start
          lg:px-4
        "
      >

        <LogOut
          size={20}
          className="shrink-0"
        />


        <span
          className="
            md:hidden
            lg:inline
          "
        >
          Cerrar sesión
        </span>

      </button>

    </aside>
  );
}


/* =========================================================
   BOTÓN DEL SIDEBAR
========================================================= */

function SidebarButton({
  active = false,
  icon,
  text,
  onClick,
}) {
  return (
    <button
      type="button"

      onClick={
        onClick
      }

      title={
        text
      }

      className={`
        flex
        w-full
        items-center
        gap-3

        rounded-xl

        px-4
        py-3

        text-sm
        font-medium
        text-white

        transition
        duration-200

        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-white/60

        md:justify-center
        md:px-2

        lg:justify-start
        lg:px-4

        ${
          active
            ? `
              bg-white/20
              font-semibold
              shadow-sm
            `
            : `
              hover:bg-white/15
            `
        }
      `}
    >

      <span className="shrink-0">
        {icon}
      </span>


      <span
        className="
          md:hidden
          lg:inline
        "
      >
        {text}
      </span>

    </button>
  );
}


/* =========================================================
   OPCIONES SEGÚN ROL
========================================================= */

function getMenuItems(role) {
  // =====================================================
  // CLIENTE
  // =====================================================

  if (role === "CLIENTE") {
    return [
      {
        view: "inicio",
        text: "Inicio",
        icon: (
          <PawPrint size={20} />
        ),
      },

      {
        view: "mascotas",
        text: "Mis mascotas",
        icon: (
          <Dog size={20} />
        ),
      },

      {
        view: "citas",
        text: "Mis citas",
        icon: (
          <CalendarDays size={20} />
        ),
      },

      {
        view: "ubicacion",
        text: "Mis domicilios",
        icon: (
          <MapPin size={20} />
        ),
      },
    ];
  }


  // =====================================================
  // EMPLEADO
  // =====================================================

  if (role === "EMPLEADO") {
    return [
      {
        view: "citas",
        text: "Mis citas",
        icon: (
          <CalendarDays size={20} />
        ),
      },

      {
        view: "pagos",
        text: "Pagos",
        icon: (
          <CreditCard size={20} />
        ),
      },
      { view: "recorridos", text: "Recorridos", icon: <MapPin size={20} /> },
    ];
  }


  // =====================================================
  // ADMINISTRADOR
  // =====================================================

  if (role === "ADMIN") {
    return [
      {
        view: "citas",
        text: "Citas",
        icon: (
          <CalendarDays size={20} />
        ),
      },

      {
        view: "pagos",
        text: "Pagos",
        icon: (
          <CreditCard size={20} />
        ),
      },

      {
        view: "empleados",
        text: "Administración",
        icon: (
          <Users size={20} />
        ),
      },
      { view: "recorridos", text: "Recorridos", icon: <MapPin size={20} /> },
    ];
  }


  // =====================================================
  // ROL DESCONOCIDO
  // =====================================================

  return [];
}


/* =========================================================
   NOMBRE DEL PANEL
========================================================= */

function getPanelName(role) {
  switch (role) {
    case "CLIENTE":
      return "PANEL DE CLIENTE";

    case "EMPLEADO":
      return "PANEL DE EMPLEADO";

    case "ADMIN":
      return "PANEL DE ADMINISTRADOR";

    default:
      return "CAN WASH";
  }
}


export default Sidebar;