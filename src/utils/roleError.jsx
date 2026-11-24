import {
  AlertCircle,
  LogOut,
} from "lucide-react";


function RoleError({
  role,
  onLogout,
}) {
  return (
    <main
      className="
        grid
        min-h-screen
        place-items-center
        bg-canwash-background
        px-6
      "
    >

      <section
        className="
          w-full
          max-w-md

          rounded-3xl

          bg-white

          p-8

          text-center

          shadow-xl
          shadow-canwash-dark/10
        "
      >

        <div
          className="
            mx-auto

            grid
            h-16
            w-16
            place-items-center

            rounded-2xl

            bg-red-100
            text-red-600
          "
        >
          <AlertCircle size={32} />
        </div>


        <h1
          className="
            mt-5

            text-2xl
            font-bold
            text-canwash-dark
          "
        >
          Rol no reconocido
        </h1>


        <p
          className="
            mt-3

            text-sm
            leading-6
            text-canwash-muted
          "
        >
          El rol{" "}

          <strong
            className="
              text-canwash-dark
            "
          >
            {role ||
              "desconocido"}
          </strong>

          {" "}no está configurado
          en la aplicación.
        </p>


        <button
          type="button"

          onClick={
            onLogout
          }

          className="
            mt-6

            flex
            w-full
            items-center
            justify-center
            gap-2

            rounded-xl

            bg-canwash-dark

            px-5
            py-4

            text-sm
            font-semibold
            text-white

            transition

            hover:bg-canwash
          "
        >

          <LogOut size={18} />

          Cerrar sesión

        </button>

      </section>

    </main>
  );
}


export default RoleError;