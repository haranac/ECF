import { useState } from "react";

import {
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  PawPrint,
} from "lucide-react";

import { supabase } from "../lib/supabase";


function Login({
  onLogin,
  onBack,
  onRegister,
}) {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [form, setForm] =
    useState({
      email: "",
      password: "",
    });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  // =====================================================
  // ACTUALIZAR FORMULARIO
  // =====================================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;


    setForm((current) => ({
      ...current,
      [name]: value,
    }));


    setError("");
  };


  // =====================================================
  // LOGIN
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();


    // ===================================================
    // NORMALIZAR DATOS
    // ===================================================

    const email =
      form.email
        .trim()
        .toLowerCase();


    // ===================================================
    // VALIDACIONES
    // ===================================================

    if (!email) {
      setError(
        "Ingresa tu correo electrónico."
      );

      return;
    }


    if (!form.password) {
      setError(
        "Ingresa tu contraseña."
      );

      return;
    }


    setLoading(true);
    setError("");


    try {
      // =================================================
      // SUPABASE AUTH
      // =================================================

      const {
        data,
        error: loginError,
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password:
              form.password,
          });


      // =================================================
      // ERROR DE SUPABASE
      // =================================================

      if (loginError) {
        console.error(
          "Error iniciando sesión:",
          loginError
        );


        const message =
          loginError.message
            ?.toLowerCase() ||
          "";


        if (
          message.includes(
            "invalid login credentials"
          )
        ) {
          setError(
            "Correo o contraseña incorrectos."
          );

        } else if (
          message.includes(
            "email not confirmed"
          )
        ) {
          setError(
            "Debes confirmar tu correo electrónico antes de iniciar sesión."
          );

        } else if (
          message.includes(
            "failed to fetch"
          )
        ) {
          setError(
            "No fue posible conectarse con el servidor."
          );

        } else {
          setError(
            loginError.message ||
            "No fue posible iniciar sesión."
          );
        }


        return;
      }


      // =================================================
      // VALIDAR USUARIO
      // =================================================

      if (!data?.user) {
        setError(
          "No fue posible obtener la información de tu cuenta."
        );

        return;
      }


      // =================================================
      // APP / USEAUTH CARGARÁ:
      //
      // public.usuarios
      // nombre
      // rol
      // activo
      // =================================================

      if (onLogin) {
        await onLogin(
          data.user
        );
      }

    } catch (unexpectedError) {
      console.error(
        "Error inesperado durante el login:",
        unexpectedError
      );


      if (
        unexpectedError?.message
          ?.toLowerCase()
          .includes(
            "failed to fetch"
          )
      ) {
        setError(
          "No fue posible conectarse con Supabase."
        );

      } else {
        setError(
          "Ocurrió un error inesperado al iniciar sesión."
        );
      }

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <main
      className="
        grid
        min-h-screen
        bg-canwash-background

        lg:grid-cols-2
      "
    >

      {/* =================================================
          DECORACIÓN
      ================================================== */}

      <section
        className="
          relative
          hidden
          min-h-screen
          overflow-hidden

          bg-gradient-to-br
          from-canwash
          to-[#7899A4]

          p-12

          text-white

          lg:flex
          lg:flex-col
          lg:items-center
          lg:justify-center
          lg:text-center
        "
      >

        {/* CÍRCULO SUPERIOR */}

        <div
          className="
            absolute
            -left-44
            -top-44

            h-[450px]
            w-[450px]

            rounded-full

            bg-white/10
          "
        />


        {/* CÍRCULO INFERIOR */}

        <div
          className="
            absolute
            -bottom-36
            -right-32

            h-[350px]
            w-[350px]

            rounded-full

            bg-white/10
          "
        />


        {/* MARCA */}

        <div
          className="
            relative
            z-10
          "
        >

          <PawPrint
            size={75}
            className="mx-auto"
          />


          <h1
            className="
              mt-5

              text-6xl
              font-bold
              tracking-[-0.06em]
            "
          >
            Can Wash
          </h1>


          <p
            className="
              mt-3

              text-xs
              font-semibold
              tracking-[0.3em]

              text-white/90
            "
          >
            ESTÉTICA CANINA Y FELINA
          </p>


          <div
            className="
              mx-auto
              mt-10
              max-w-sm

              rounded-2xl

              border
              border-white/20

              bg-white/10

              p-6

              backdrop-blur-sm
            "
          >

            <h2
              className="
                text-lg
                font-semibold
              "
            >
              Bienvenido
            </h2>


            <p
              className="
                mt-2

                text-sm
                leading-6

                text-white/80
              "
            >
              Administra tus servicios,
              mascotas y citas desde un
              solo lugar.
            </p>

          </div>

        </div>

      </section>


      {/* =================================================
          LOGIN
      ================================================== */}

      <section
        className="
          flex
          min-h-screen
          items-center
          justify-center

          px-6
          py-12

          sm:px-10
        "
      >

        <div
          className="
            w-full
            max-w-md
          "
        >

          {/* LOGO MÓVIL */}

          <div
            className="
              mb-8

              flex
              items-center
              gap-3

              lg:hidden
            "
          >

            <div
              className="
                grid
                h-12
                w-12
                place-items-center

                rounded-xl

                bg-canwash-light
                text-canwash-dark
              "
            >
              <PawPrint size={27} />
            </div>


            <div>

              <strong
                className="
                  block
                  text-lg
                  text-canwash-dark
                "
              >
                Can Wash
              </strong>


              <span
                className="
                  text-[9px]
                  font-semibold
                  tracking-[0.15em]
                  text-canwash-muted
                "
              >
                ESTÉTICA CANINA Y FELINA
              </span>

            </div>

          </div>


          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="
              mb-7
              text-sm
              font-semibold
              text-canwash-dark
              transition
              hover:text-canwash
              hover:underline
              disabled:opacity-50
            "
          >
            Volver al inicio
          </button>


          {/* ICONO */}

          <div
            className="
              mb-6

              grid
              h-16
              w-16
              place-items-center

              rounded-2xl

              bg-canwash-light
              text-canwash-dark

              shadow-lg
              shadow-canwash/20
            "
          >
            <PawPrint size={38} />
          </div>


          {/* TÍTULO */}

          <h2
            className="
              text-4xl
              font-bold
              tracking-tight
              text-canwash-dark
            "
          >
            Bienvenido
          </h2>


          <p
            className="
              mt-3
              max-w-sm

              text-sm
              leading-7
              text-canwash-muted
            "
          >
            Inicia sesión para acceder a
            tu cuenta de Can Wash.
          </p>


          {/* =================================================
              FORMULARIO
          ================================================== */}

          <form
            onSubmit={
              handleSubmit
            }

            className="mt-8"
          >

            {/* CORREO */}

            <FormLabel
              htmlFor="email"
            >
              Correo electrónico
            </FormLabel>


            <InputContainer
              icon={
                <Mail size={20} />
              }
            >

              <input
                id="email"
                name="email"
                type="email"

                value={
                  form.email
                }

                onChange={
                  handleChange
                }

                placeholder="correo@ejemplo.com"

                autoComplete="email"

                disabled={
                  loading
                }

                className={
                  inputClasses
                }
              />

            </InputContainer>


            {/* CONTRASEÑA */}

            <FormLabel
              htmlFor="password"
            >
              Contraseña
            </FormLabel>


            <InputContainer
              icon={
                <Lock size={20} />
              }
            >

              <input
                id="password"
                name="password"

                type={
                  showPassword
                    ? "text"
                    : "password"
                }

                value={
                  form.password
                }

                onChange={
                  handleChange
                }

                placeholder="Ingresa tu contraseña"

                autoComplete="current-password"

                disabled={
                  loading
                }

                className={
                  inputClasses
                }
              />


              <button
                type="button"

                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }

                disabled={
                  loading
                }

                aria-label={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }

                className="
                  grid
                  h-9
                  w-9
                  shrink-0
                  place-items-center

                  rounded-lg

                  text-canwash

                  transition

                  hover:bg-canwash-background
                  hover:text-canwash-dark

                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-canwash

                  disabled:opacity-50
                "
              >

                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}

              </button>

            </InputContainer>


            {/* ERROR */}

            {error && (
              <div
                role="alert"

                className="
                  mt-5

                  rounded-xl

                  border
                  border-red-200

                  bg-red-50/80

                  px-4
                  py-3

                  text-sm
                  font-medium
                  leading-5
                  text-red-700

                  backdrop-blur-sm
                "
              >
                {error}
              </div>
            )}


            {/* BOTÓN LOGIN */}

            <button
              type="submit"

              disabled={
                loading
              }

              className="
                mt-6

                flex
                w-full
                items-center
                justify-center
                gap-2

                rounded-xl

                bg-canwash

                px-5
                py-4

                text-sm
                font-semibold
                text-white

                shadow-lg
                shadow-canwash/20

                transition

                hover:-translate-y-0.5
                hover:bg-[#7899A4]
                hover:shadow-xl

                focus:outline-none
                focus-visible:ring-4
                focus-visible:ring-canwash/30

                disabled:cursor-not-allowed
                disabled:translate-y-0
                disabled:opacity-60
                disabled:shadow-none
              "
            >

              {loading
                ? "Iniciando sesión..."
                : "Iniciar sesión"}


              {!loading && (
                <LogIn size={19} />
              )}

            </button>


            {/* REGISTRO */}

            <div
              className="
                mt-6

                flex
                flex-wrap
                items-center
                justify-center
                gap-1.5

                text-sm
                text-canwash-muted
              "
            >

              <span>
                ¿No tienes una cuenta?
              </span>


              <button
                type="button"

                onClick={
                  onRegister
                }

                disabled={
                  loading
                }

                className="
                  rounded

                  font-bold
                  text-canwash-dark

                  transition

                  hover:text-canwash
                  hover:underline

                  disabled:opacity-50
                "
              >
                Crear cuenta
              </button>

            </div>

          </form>

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   LABEL
========================================================= */

function FormLabel({
  htmlFor,
  children,
}) {
  return (
    <label
      htmlFor={
        htmlFor
      }

      className="
        mb-2
        mt-5
        block

        text-sm
        font-semibold
        text-canwash-dark
      "
    >
      {children}
    </label>
  );
}


/* =========================================================
   INPUT CON ICONO
========================================================= */

function InputContainer({
  icon,
  children,
}) {
  return (
    <div
      className="
        flex
        min-h-12
        items-center
        gap-3

        rounded-xl

        border
        border-canwash-light

        bg-white/80

        px-4

        backdrop-blur-sm

        transition

        focus-within:border-canwash
        focus-within:ring-4
        focus-within:ring-canwash/20
      "
    >

      <span
        className="
          shrink-0
          text-canwash
        "
      >
        {icon}
      </span>


      {children}

    </div>
  );
}


/* =========================================================
   CLASE INPUT
========================================================= */

const inputClasses = `
  min-w-0
  flex-1

  border-none

  bg-transparent

  py-3.5

  text-sm
  text-canwash-text

  outline-none

  placeholder:text-slate-400

  focus:ring-0

  disabled:cursor-not-allowed
  disabled:opacity-60
`;


export default Login;
