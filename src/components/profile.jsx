import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";

import { supabase } from "../lib/supabase";

import Sidebar from "../utils/sidebar";
import MobileMenu from "../utils/mobileMenu";
import Card from "../utils/card";
import LoadingScreen from "../utils/loadingScreen";

import AddressesPanel from "./addresses/AddressesPanel";


function Profile({
  user,
  onBack,
  onLogout,
}) {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [client, setClient] =
    useState(null);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  const [form, setForm] =
    useState({
      telefono: "",
      colonia: "",
      direccion: "",
    });


  // =====================================================
  // ROL
  // =====================================================

  const role =
    user?.rol
      ?.trim()
      .toUpperCase() ||
    "";


  const isClient =
    role === "CLIENTE";


  // =====================================================
  // CARGAR PERFIL
  // =====================================================

  const userId = user?.id_usuario;
  const loadProfile = useCallback(async () => {
    if (!userId) {
      setError(
        "No se encontró el usuario."
      );

      setLoading(false);
      return;
    }


    setLoading(true);
    setError("");


    try {
      /*
        Por ahora los campos adicionales
        pertenecen a la tabla clientes.
      */

      if (isClient) {
        const {
          data,
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
            userId
          )
          .maybeSingle();


        if (clientError) {
          throw clientError;
        }


        setClient(data);


        setForm({
          telefono:
            data?.telefono || "",

          colonia:
            data?.colonia || "",

          direccion:
            data?.direccion || "",
        });
      }

    } catch (loadError) {
      console.error(
        "Error cargando perfil:",
        loadError
      );

      setError(
        "No fue posible cargar la información del perfil."
      );

    } finally {
      setLoading(false);
    }
  }, [userId, isClient]);


  // =====================================================
  // CARGA
  // =====================================================

  useEffect(() => {
    Promise.resolve().then(loadProfile);
  }, [loadProfile]);


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
  };


  // =====================================================
  // GUARDAR
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();


    if (!isClient) {
      return;
    }


    if (!form.telefono.trim()) {
      setError(
        "Ingresa tu número de teléfono."
      );

      return;
    }


    if (!form.colonia.trim()) {
      setError(
        "Ingresa tu colonia."
      );

      return;
    }


    setSaving(true);
    setError("");
    setSuccess("");


    try {
      // ===============================================
      // ACTUALIZAR
      // ===============================================

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
              form.direccion
                .trim() ||
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
        // =============================================
        // CREAR PERFIL
        // =============================================

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
              form.direccion
                .trim() ||
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


      await loadProfile();


      setSuccess(
        "Tu información se guardó correctamente."
      );

    } catch (saveError) {
      console.error(
        "Error guardando perfil:",
        saveError
      );


      setError(
        "No fue posible guardar los cambios."
      );

    } finally {
      setSaving(false);
    }
  };


  // =====================================================
  // NAVEGACIÓN
  // =====================================================

  const handleBack = (view) => {
    setMobileMenuOpen(false);
    onBack?.(typeof view === "string" ? view : undefined);
  };


  const handleLogout = () => {
    setMobileMenuOpen(false);
    onLogout?.();
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return <LoadingScreen />;
  }


  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <div
      className="
        min-h-screen
        bg-canwash-background
      "
    >
      {/* ===============================================
          SIDEBAR
      ================================================ */}

      <Sidebar
        user={user}

        view="perfil"

        isOpen={
          mobileMenuOpen
        }

        onChangeView={
          handleBack
        }

        onProfile={() =>
          setMobileMenuOpen(false)
        }

        onLogout={
          handleLogout
        }
      />


      <MobileMenu
        isOpen={
          mobileMenuOpen
        }

        onToggle={() =>
          setMobileMenuOpen(
            (current) =>
              !current
          )
        }

        onClose={() =>
          setMobileMenuOpen(false)
        }
      />


      {/* ===============================================
          CONTENIDO
      ================================================ */}

      <main
        className="
          min-h-screen
          px-4
          pb-24

          sm:px-6

          md:ml-20
          md:px-6
          md:pb-12

          lg:ml-64
          lg:px-9
        "
      >
        {/* =============================================
            TOPBAR
        ============================================== */}

        <header
          className="
            flex
            min-h-20
            items-center
            justify-between
            gap-4
            py-3
          "
        >
          <div>
            <span
              className="
                text-[10px]
                font-bold
                tracking-[0.2em]
                text-canwash-muted
              "
            >
              CAN WASH
            </span>

            <h2
              className="
                mt-1
                text-xl
                font-bold
                text-canwash-dark
              "
            >
              Mi perfil
            </h2>
          </div>


          <button
            type="button"
            onClick={
              loadProfile
            }
            className="
              grid
              h-11
              w-11
              place-items-center
              rounded-xl
              border
              border-canwash-light
              bg-white/80
              text-canwash-dark
              backdrop-blur-sm
              transition
              hover:bg-white
              sm:flex
              sm:w-auto
              sm:gap-2
              sm:px-4
            "
          >
            <RefreshCw size={18} />

            <span className="hidden sm:inline">
              Actualizar
            </span>
          </button>
        </header>


        {/* =============================================
            CABECERA PERFIL
        ============================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-3xl

            bg-gradient-to-br
            from-canwash-light/80
            to-canwash-cream/80

            p-6

            shadow-lg
            shadow-canwash-dark/5

            backdrop-blur-sm

            sm:p-8
          "
        >
          <div
            className="
              relative
              z-10
              flex
              flex-col
              gap-5
              sm:flex-row
              sm:items-center
            "
          >
            <div
              className="
                grid
                h-20
                w-20
                shrink-0
                place-items-center
                rounded-2xl
                bg-canwash-dark
                text-3xl
                font-bold
                text-white
                shadow-lg
              "
            >
              {user?.nombre
                ?.charAt(0)
                .toUpperCase() ||
                "U"}
            </div>


            <div>
              <span
                className="
                  text-[10px]
                  font-bold
                  tracking-[0.2em]
                  text-canwash-muted
                "
              >
                PERFIL DE USUARIO
              </span>

              <h1
                className="
                  mt-1
                  text-2xl
                  font-bold
                  text-canwash-dark
                  sm:text-3xl
                "
              >
                {user?.nombre ||
                  "Usuario"}
              </h1>

              <p
                className="
                  mt-1
                  text-sm
                  text-canwash-muted
                "
              >
                {user?.email ||
                  "Sin correo"}
              </p>

              <span
                className="
                  mt-3
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-white/70
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-canwash-dark
                "
              >
                <ShieldCheck
                  size={15}
                />

                {role ||
                  "USUARIO"}
              </span>
            </div>
          </div>


          <PawPrint
            className="
              absolute
              -bottom-16
              right-8
              hidden
              h-52
              w-52
              text-canwash/20
              sm:block
            "
          />
        </section>


        {/* =============================================
            MENSAJES
        ============================================== */}

        {error && (
          <div
            role="alert"
            className="
              mt-5
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50/80
              p-4
              text-sm
              text-red-700
            "
          >
            <AlertCircle
              size={19}
              className="shrink-0"
            />

            {error}
          </div>
        )}


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
              p-4
              text-sm
              font-medium
              text-emerald-700
            "
          >
            <CheckCircle2
              size={19}
              className="shrink-0"
            />

            {success}
          </div>
        )}


        {/* =============================================
            GRID
        ============================================== */}

        <div
          className="
            mt-6
            grid
            grid-cols-1
            gap-6
            xl:grid-cols-3
          "
        >
          {/* INFORMACIÓN */}

          <Card
            opacity={80}
            className="xl:col-span-2"
          >
            <h2
              className="
                text-xl
                font-bold
                text-canwash-dark
              "
            >
              Información personal
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-canwash-muted
              "
            >
              Información asociada a tu
              cuenta de Can Wash.
            </p>


            <div
              className="
                mt-6
                grid
                grid-cols-1
                gap-4
                sm:grid-cols-2
              "
            >
              <ProfileInformation
                icon={
                  <User size={19} />
                }
                label="Nombre"
                value={
                  user?.nombre
                }
              />

              <ProfileInformation
                icon={
                  <Mail size={19} />
                }
                label="Correo electrónico"
                value={
                  user?.email
                }
              />

              <ProfileInformation
                icon={
                  <ShieldCheck
                    size={19}
                  />
                }
                label="Tipo de cuenta"
                value={role}
              />

              {isClient && (
                <ProfileInformation
                  icon={
                    <Phone size={19} />
                  }
                  label="Teléfono"
                  value={
                    form.telefono
                  }
                />
              )}
            </div>


            {/* FORM CLIENTE */}

            {isClient && (
              <form
                onSubmit={
                  handleSubmit
                }
                className="
                  mt-7
                  border-t
                  border-canwash-cream
                  pt-2
                "
              >
                <div
                  className="
                    grid
                    grid-cols-1
                    gap-x-5
                    sm:grid-cols-2
                  "
                >
                  <div>
                    <FormLabel
                      htmlFor="telefono"
                    >
                      Teléfono
                    </FormLabel>

                    <InputContainer
                      icon={
                        <Phone
                          size={19}
                        />
                      }
                    >
                      <input
                        id="telefono"
                        name="telefono"
                        type="tel"
                        value={
                          form.telefono
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="981 123 4567"
                        className={
                          innerInputClasses
                        }
                      />
                    </InputContainer>
                  </div>


                  <div>
                    <FormLabel
                      htmlFor="colonia"
                    >
                      Colonia
                    </FormLabel>

                    <InputContainer
                      icon={
                        <MapPin
                          size={19}
                        />
                      }
                    >
                      <input
                        id="colonia"
                        name="colonia"
                        value={
                          form.colonia
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Ej. Santa Ana"
                        className={
                          innerInputClasses
                        }
                      />
                    </InputContainer>
                  </div>
                </div>


                <FormLabel
                  htmlFor="direccion"
                >
                  Dirección
                </FormLabel>

                <textarea
                  id="direccion"
                  name="direccion"
                  value={
                    form.direccion
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Calle, número y referencias"
                  className="
                    min-h-28
                    w-full
                    resize-y
                    rounded-xl
                    border
                    border-canwash-light
                    bg-white/70
                    px-4
                    py-3.5
                    text-sm
                    leading-6
                    text-canwash-text
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-canwash
                    focus:ring-4
                    focus:ring-canwash/20
                  "
                />


                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="
                    mt-6
                    flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-canwash
                    px-5
                    py-3.5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-[#7899A4]
                    disabled:opacity-60
                  "
                >
                  <Save size={18} />

                  {saving
                    ? "Guardando..."
                    : "Guardar cambios"}
                </button>
              </form>
            )}
          </Card>


          {/* SEGURIDAD */}

          <Card opacity={80}>
            <div
              className="
                grid
                h-12
                w-12
                place-items-center
                rounded-xl
                bg-canwash-cream/80
                text-canwash-dark
              "
            >
              <KeyRound size={23} />
            </div>

            <h2
              className="
                mt-5
                text-lg
                font-bold
                text-canwash-dark
              "
            >
              Seguridad
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-canwash-muted
              "
            >
              Administra las credenciales
              y seguridad de tu cuenta.
            </p>

            <button
              type="button"
              className="
                mt-6
                w-full
                rounded-xl
                bg-canwash-dark
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-canwash
              "
            >
              Cambiar contraseña
            </button>
          </Card>
        </div>


        {/* =============================================
            UBICACIÓN — SOLO CLIENTE
        ============================================== */}

        {isClient && (
          <section className="mt-6">
            <div className="mb-4">
              <span
                className="
                  text-[10px]
                  font-bold
                  tracking-[0.2em]
                  text-canwash-muted
                "
              >
                SERVICIO A DOMICILIO
              </span>

              <h2
                className="
                  mt-1
                  text-xl
                  font-bold
                  text-canwash-dark
                "
              >
                Ubicación del domicilio
              </h2>

              <p
                className="
                  mt-1
                  max-w-2xl
                  text-sm
                  leading-6
                  text-canwash-muted
                "
              >
                Permite el acceso a tu
                ubicación para visualizar
                tu posición en el mapa.
              </p>
            </div>


            <AddressesPanel client={client} />
          </section>
        )}
      </main>
    </div>
  );
}


/* =========================================================
   INFORMACIÓN
========================================================= */

function ProfileInformation({
  icon,
  label,
  value,
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
        rounded-xl
        bg-canwash-background/70
        p-4
      "
    >
      <div
        className="
          grid
          h-10
          w-10
          shrink-0
          place-items-center
          rounded-lg
          bg-white/70
          text-canwash
        "
      >
        {icon}
      </div>

      <div className="min-w-0">
        <span
          className="
            block
            text-[10px]
            font-semibold
            uppercase
            tracking-wide
            text-canwash-muted
          "
        >
          {label}
        </span>

        <strong
          className="
            mt-1
            block
            break-words
            text-sm
            text-canwash-dark
          "
        >
          {value ||
            "Sin registrar"}
        </strong>
      </div>
    </div>
  );
}


/* =========================================================
   INPUT
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
        bg-white/70
        px-4
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


function FormLabel({
  htmlFor,
  children,
}) {
  return (
    <label
      htmlFor={htmlFor}
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


const innerInputClasses = `
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
`;


export default Profile;