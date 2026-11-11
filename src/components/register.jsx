import { useEffect, useState } from "react";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  PawPrint,
  User,
  UserPlus,
  UserRound,
} from "lucide-react";

import { supabase } from "../lib/supabase";


function Register({
  onRegister,
  onBack,
}) {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [
    accountType,
    setAccountType,
  ] = useState("CLIENTE");


  const [form, setForm] =
    useState({
      nombre: "",
      email: "",
      password: "",
      confirmPassword: "",
    });


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);


  const [error, setError] =
    useState("");


  const [success, setSuccess] =
    useState("");


  const [loading, setLoading] =
    useState(false);

  const [pendingEmail, setPendingEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const busy = loading || resending;

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timeout = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [resendCooldown]);


  // =====================================================
  // FORMULARIO
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
    setSuccess("");

    if (name === "email" && value.trim().toLowerCase() !== pendingEmail) {
      setPendingEmail("");
      setResendMessage("");
      setResendError("");
      setResendCooldown(0);
    }
  };


  // =====================================================
  // TIPO DE CUENTA
  // =====================================================

  const selectAccountType = (
    type
  ) => {
    setAccountType(type);

    setError("");
    setSuccess("");
  };


  // =====================================================
  // REGISTRO
  // =====================================================

  const handleResendVerification = async () => {
    const email = form.email.trim().toLowerCase();

    if (busy || resendCooldown > 0 || !pendingEmail || email !== pendingEmail) {
      return;
    }

    setResending(true);
    setResendMessage("");
    setResendError("");

    try {
      const { error: resendFailure } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
      });

      if (resendFailure) {
        if (
          resendFailure.status === 429 ||
          resendFailure.code === "over_email_send_rate_limit" ||
          resendFailure.code === "over_request_rate_limit"
        ) {
          setResendCooldown(60);
          setResendError("Espera un momento antes de solicitar otro correo de verificación.");
        } else {
          setResendError("No fue posible reenviar el correo de verificación. Inténtalo de nuevo.");
        }

        return;
      }

      setResendCooldown(60);
      setResendMessage("Solicitud de reenvío recibida. Revisa tu bandeja de entrada y correo no deseado.");
    } catch {
      setResendError("No fue posible conectarse con el servidor. Inténtalo de nuevo.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (busy || pendingEmail) return;


    setError("");
    setSuccess("");


    // ===================================================
    // NORMALIZAR
    // ===================================================

    const nombre =
      form.nombre.trim();


    const email =
      form.email
        .trim()
        .toLowerCase();


    // ===================================================
    // VALIDACIONES
    // ===================================================

    if (!nombre) {
      setError(
        "Ingresa tu nombre completo."
      );

      return;
    }


    if (nombre.length < 3) {
      setError(
        "El nombre debe contener al menos 3 caracteres."
      );

      return;
    }


    if (!email) {
      setError(
        "Ingresa tu correo electrónico."
      );

      return;
    }


    if (!form.password) {
      setError(
        "Ingresa una contraseña."
      );

      return;
    }


    if (
      form.password.length < 6
    ) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }


    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }


    if (
      accountType !== "CLIENTE" &&
      accountType !== "EMPLEADO"
    ) {
      setError(
        "Selecciona un tipo de cuenta válido."
      );

      return;
    }


    setLoading(true);


    try {
      // =================================================
      // CREAR CUENTA EN SUPABASE AUTH
      // =================================================

      const {
        data,
        error: signUpError,
      } =
        await supabase.auth
          .signUp({
            email,

            password:
              form.password,

            options: {
              data: {
                nombre,
                rol:
                  accountType,
              },
            },
          });


      // =================================================
      // ERROR
      // =================================================

      if (signUpError) {
        console.error(
          "Error registrando usuario:",
          signUpError
        );


        const message =
          signUpError.message
            ?.toLowerCase() ||
          "";


        if (
          signUpError.code === "user_already_exists" ||
          message.includes(
            "already registered"
          ) ||
          message.includes(
            "already been registered"
          )
        ) {
          setError(
            "Ya existe una cuenta registrada con este correo."
          );

        } else if (
          signUpError.status === 429 ||
          signUpError.code === "over_email_send_rate_limit" ||
          signUpError.code === "over_request_rate_limit"
        ) {
          setError("Espera un momento antes de volver a intentar el registro.");

        } else if (
          message.includes(
            "password"
          )
        ) {
          setError(
            "La contraseña no cumple con los requisitos de seguridad."
          );

        } else if (
          message.includes(
            "invalid email"
          )
        ) {
          setError(
            "El correo electrónico no es válido."
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
            signUpError.message ||
            "No fue posible crear la cuenta."
          );
        }


        return;
      }


      // =================================================
      // VALIDAR RESPUESTA
      // =================================================

      if (!data?.user) {
        setError(
          "No fue posible obtener la información de la nueva cuenta."
        );

        return;
      }

      // Detectar la respuesta de un registro repetido ya confirmado.
      if (
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        setError(
          "Ya existe una cuenta registrada con este correo. Inicia sesión."
        );

        return;
      }

      // Tanto un alta nueva como una cuenta anterior pueden estar pendientes.
      if (!data.session) {
        setPendingEmail(email);
        setResendMessage("");
        setResendError("");
        setResendCooldown(60);
        setForm((current) => ({
          ...current,
          email,
          password: "",
          confirmPassword: "",
        }));

        return;
      }

      /*
        ==================================================
        IMPORTANTE

        React NO inserta manualmente en:

        public.usuarios

        La cuenta se crea en:

        auth.users

        enviando:

        raw_user_meta_data.nombre
        raw_user_meta_data.rol

        El trigger de Supabase debe crear después
        la fila correspondiente en public.usuarios.

        ==================================================
      */


      // =================================================
      // LIMPIAR FORMULARIO
      // =================================================

      setForm({
        nombre: "",
        email: "",
        password: "",
        confirmPassword: "",
      });


      // =================================================
      // REGISTRO CON SESIÓN AUTOMÁTICA
      // =================================================

      // Cerramos la sesión automática para volver al inicio de sesión.
      const {
        error: logoutError,
      } =
        await supabase.auth
          .signOut();


      if (logoutError) {
        console.warn(
          "No fue posible cerrar la sesión automática:",
          logoutError
        );
      }


      setSuccess(
        "Cuenta creada correctamente. Ya puedes iniciar sesión."
      );


      // =================================================
      // VOLVER AL LOGIN
      // =================================================

      window.setTimeout(() => {
        if (onRegister) {
          onRegister();
        }
      }, 1800);

    } catch (unexpectedError) {
      console.error(
        "Error inesperado durante el registro:",
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
          "Ocurrió un error inesperado al crear la cuenta."
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

              text-left

              backdrop-blur-sm
            "
          >

            <h2
              className="
                text-lg
                font-semibold
              "
            >
              Crea tu cuenta
            </h2>


            <p
              className="
                mt-2

                text-sm
                leading-6
                text-white/80
              "
            >
              Regístrate para utilizar
              las funciones de Can Wash
              según el tipo de cuenta
              seleccionado.
            </p>

          </div>

        </div>

      </section>


      {/* =================================================
          FORMULARIO
      ================================================== */}

      <section
        className="
          flex
          min-h-screen
          items-center
          justify-center

          px-6
          py-10

          sm:px-10
        "
      >

        <div
          className="
            w-full
            max-w-xl
          "
        >

          {/* VOLVER */}

          <button
            type="button"

            onClick={
              onBack
            }

            disabled={
              busy
            }

            className="
              mb-7

              flex
              items-center
              gap-2

              text-sm
              font-semibold
              text-canwash-dark

              transition

              hover:text-canwash

              disabled:opacity-50
            "
          >
            <ArrowLeft size={18} />

            Volver
          </button>


          {/* LOGO MÓVIL */}

          <div
            className="
              mb-7

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
            <UserPlus size={34} />
          </div>


          <h2
            className="
              text-4xl
              font-bold
              tracking-tight
              text-canwash-dark
            "
          >
            Crear cuenta
          </h2>


          <p
            className="
              mt-3

              text-sm
              leading-7
              text-canwash-muted
            "
          >
            Registra tus datos para crear
            una cuenta de Can Wash.
          </p>


          {/* =================================================
              TIPO DE CUENTA
          ================================================== */}

          <div className="mt-8">

            <span
              className="
                mb-3
                block

                text-sm
                font-semibold
                text-canwash-dark
              "
            >
              Tipo de cuenta
            </span>


            <div
              className="
                grid
                grid-cols-1
                gap-4

                sm:grid-cols-2
              "
            >

              {/* CLIENTE */}

              <AccountTypeButton
                selected={
                  accountType ===
                  "CLIENTE"
                }

                icon={
                  <UserRound size={24} />
                }

                title="Cliente"

                description="Registra tus mascotas y consulta sus servicios."

                onClick={() =>
                  selectAccountType(
                    "CLIENTE"
                  )
                }

                disabled={
                  busy || Boolean(pendingEmail)
                }
              />


              {/* EMPLEADO */}

              <AccountTypeButton
                selected={
                  accountType ===
                  "EMPLEADO"
                }

                icon={
                  <BriefcaseBusiness
                    size={24}
                  />
                }

                title="Empleado"

                description="Consulta citas, servicios y actividades asignadas."

                onClick={() =>
                  selectAccountType(
                    "EMPLEADO"
                  )
                }

                disabled={
                  busy || Boolean(pendingEmail)
                }
              />

            </div>

          </div>


          {/* =================================================
              FORMULARIO
          ================================================== */}

          <form
            onSubmit={
              handleSubmit
            }

            className="mt-8"
          >

            {/* NOMBRE */}

            <FormLabel
              htmlFor="nombre"
            >
              Nombre completo
            </FormLabel>


            <InputContainer
              icon={
                <User size={20} />
              }
            >

              <input
                id="nombre"
                name="nombre"
                type="text"

                value={
                  form.nombre
                }

                onChange={
                  handleChange
                }

                placeholder="Ej. Juan Pérez"

                autoComplete="name"

                disabled={
                  busy || Boolean(pendingEmail)
                }

                className={
                  inputClasses
                }
              />

            </InputContainer>


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

                aria-describedby={
                  pendingEmail ? "email-verification-status" : undefined
                }

                disabled={
                  busy
                }

                className={
                  inputClasses
                }
              />

            </InputContainer>


            {pendingEmail && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                <p id="email-verification-status" role="status" className="font-semibold">
                  Cuenta con verificación pendiente
                </p>

                <p className="mt-1 leading-6">
                  Confirma tu correo con el enlace enviado. Si no lo encuentras,
                  revisa tu carpeta de correo no deseado o solicita otro.
                </p>

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={busy || resendCooldown > 0}
                  className="mt-2 rounded font-semibold underline underline-offset-4 hover:text-canwash-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canwash disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resending
                    ? "Reenviando correo..."
                    : resendCooldown > 0
                      ? `Reenviar correo de verificación (${resendCooldown} s)`
                      : "Reenviar correo de verificación"}
                </button>

                {resendMessage && (
                  <p role="status" className="mt-2 leading-6">{resendMessage}</p>
                )}

                {resendError && (
                  <p role="alert" className="mt-2 leading-6 text-red-700">{resendError}</p>
                )}
              </div>
            )}

            {/* CONTRASEÑA */}

            <FormLabel
              htmlFor="password"
            >
              Contraseña
            </FormLabel>


            <PasswordInput
              id="password"
              name="password"

              value={
                form.password
              }

              onChange={
                handleChange
              }

              placeholder="Mínimo 6 caracteres"

              visible={
                showPassword
              }

              onToggle={() =>
                setShowPassword(
                  (current) =>
                    !current
                )
              }

              disabled={
                busy || Boolean(pendingEmail)
              }
            />


            {/* CONFIRMAR */}

            <FormLabel
              htmlFor="confirmPassword"
            >
              Confirmar contraseña
            </FormLabel>


            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"

              value={
                form.confirmPassword
              }

              onChange={
                handleChange
              }

              placeholder="Repite tu contraseña"

              visible={
                showConfirmPassword
              }

              onToggle={() =>
                setShowConfirmPassword(
                  (current) =>
                    !current
                )
              }

              disabled={
                busy || Boolean(pendingEmail)
              }
            />


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
                  text-red-700

                  backdrop-blur-sm
                "
              >
                {error}
              </div>
            )}


            {/* ÉXITO */}

            {success && (
              <div
                role="status"

                className="
                  mt-5

                  flex
                  items-start
                  gap-3

                  rounded-xl

                  border
                  border-emerald-200

                  bg-emerald-50/80

                  px-4
                  py-3

                  text-sm
                  font-medium
                  leading-5
                  text-emerald-700

                  backdrop-blur-sm
                "
              >

                <CheckCircle2
                  size={19}
                  className="
                    mt-0.5
                    shrink-0
                  "
                />

                <span>
                  {success}
                </span>

              </div>
            )}


            {/* CREAR CUENTA */}

            <button
              type="submit"

              disabled={
                busy || Boolean(pendingEmail)
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
              "
            >

              {loading
                ? "Creando cuenta..."
                : "Crear cuenta"}


              {!loading && (
                <UserPlus size={19} />
              )}

            </button>


            {/* LOGIN */}

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
                ¿Ya tienes una cuenta?
              </span>


              <button
                type="button"

                onClick={
                  onBack
                }

                disabled={
                  busy
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
                Iniciar sesión
              </button>

            </div>

          </form>

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   TIPO DE CUENTA
========================================================= */

function AccountTypeButton({
  selected,
  icon,
  title,
  description,
  onClick,
  disabled,
}) {
  return (
    <button
      type="button"

      onClick={
        onClick
      }

      disabled={
        disabled
      }

      className={`
        group

        flex
        min-h-36
        w-full
        flex-col
        items-start
        gap-4

        rounded-2xl

        border-2

        p-5

        text-left

        backdrop-blur-sm

        transition

        focus:outline-none
        focus-visible:ring-4
        focus-visible:ring-canwash/20

        disabled:cursor-not-allowed
        disabled:opacity-60

        ${
          selected
            ? `
              border-canwash
              bg-canwash-light/30
              shadow-md
              shadow-canwash/10
            `
            : `
              border-canwash-cream
              bg-white/70

              hover:-translate-y-0.5
              hover:border-canwash
              hover:bg-white/90
              hover:shadow-md
            `
        }
      `}
    >

      <div
        className={`
          grid
          h-12
          w-12
          place-items-center

          rounded-xl

          transition

          ${
            selected
              ? `
                bg-canwash
                text-white
              `
              : `
                bg-canwash-cream
                text-canwash-dark

                group-hover:bg-canwash-light
              `
          }
        `}
      >
        {icon}
      </div>


      <div>

        <strong
          className="
            block
            text-base
            text-canwash-dark
          "
        >
          {title}
        </strong>


        <span
          className="
            mt-1
            block

            text-xs
            leading-5
            text-canwash-muted
          "
        >
          {description}
        </span>

      </div>

    </button>
  );
}


/* =========================================================
   PASSWORD INPUT
========================================================= */

function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  visible,
  onToggle,
  disabled,
}) {
  return (
    <InputContainer
      icon={
        <Lock size={20} />
      }
    >

      <input
        id={id}
        name={name}

        type={
          visible
            ? "text"
            : "password"
        }

        value={
          value
        }

        onChange={
          onChange
        }

        placeholder={
          placeholder
        }

        autoComplete="new-password"

        disabled={
          disabled
        }

        className={
          inputClasses
        }
      />


      <button
        type="button"

        onClick={
          onToggle
        }

        disabled={
          disabled
        }

        aria-label={
          visible
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

        {visible ? (
          <EyeOff size={19} />
        ) : (
          <Eye size={19} />
        )}

      </button>

    </InputContainer>
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
   INPUT
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


export default Register;
