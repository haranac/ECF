import {
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  Clock,
  PawPrint,
  Scissors,
  X,
} from "lucide-react";

import { supabase } from "../lib/supabase";


function AppointmentForm({
  user,
  onClose,
  onCreated,
}) {
  const [mascotas, setMascotas] =
    useState([]);

  const [servicios, setServicios] =
    useState([]);

  const [form, setForm] = useState({
    mascota: "",
    fecha: "",
    hora: "",
    servicios: [],
  });

  const [loading, setLoading] =
    useState(false);

  const [loadingData, setLoadingData] =
    useState(true);

  const [error, setError] =
    useState("");


  // =====================================================
  // CARGAR MASCOTAS Y SERVICIOS
  // =====================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        setError("");


        // ===============================================
        // BUSCAR CLIENTE
        // ===============================================

        const {
          data: cliente,
          error: clienteError,
        } = await supabase
          .from("clientes")
          .select("id_cliente")
          .eq(
            "id_usuario",
            user.id_usuario
          )
          .single();


        if (clienteError) {
          throw clienteError;
        }


        // ===============================================
        // MASCOTAS
        // ===============================================

        const {
          data: mascotasData,
          error: mascotasError,
        } = await supabase
          .from("mascotas")
          .select(`
            id_mascota,
            nombre,
            especie,
            raza
          `)
          .eq(
            "id_cliente",
            cliente.id_cliente
          )
          .order("nombre");


        if (mascotasError) {
          throw mascotasError;
        }


        // ===============================================
        // SERVICIOS
        // ===============================================

        const {
          data: serviciosData,
          error: serviciosError,
        } = await supabase
          .from("servicios")
          .select(`
            id_servicio,
            nombre,
            descripcion,
            precio
          `)
          .eq("activo", true)
          .order("nombre");


        if (serviciosError) {
          throw serviciosError;
        }


        setMascotas(
          mascotasData || []
        );

        setServicios(
          serviciosData || []
        );

      } catch (error) {
        console.error(
          "Error cargando formulario:",
          error
        );

        setError(
          "No fue posible cargar la información."
        );

      } finally {
        setLoadingData(false);
      }
    };


    loadData();
  }, [user.id_usuario]);


  // =====================================================
  // CAMBIAR INPUT
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
  // SELECCIONAR SERVICIO
  // =====================================================

  const toggleServicio = (
    idServicio
  ) => {
    setForm((current) => {
      const selected =
        current.servicios.includes(
          idServicio
        );


      return {
        ...current,

        servicios: selected
          ? current.servicios.filter(
              (id) =>
                id !== idServicio
            )
          : [
              ...current.servicios,
              idServicio,
            ],
      };
    });
  };


  // =====================================================
  // PRECIO TOTAL
  // =====================================================

  const total =
    servicios
      .filter((servicio) =>
        form.servicios.includes(
          servicio.id_servicio
        )
      )
      .reduce(
        (sum, servicio) =>
          sum +
          Number(
            servicio.precio || 0
          ),
        0
      );


  // =====================================================
  // CREAR CITA
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.mascota) {
      setError(
        "Selecciona una mascota."
      );
      return;
    }

    if (!form.fecha) {
      setError(
        "Selecciona una fecha."
      );
      return;
    }

    if (!form.hora) {
      setError(
        "Selecciona una hora."
      );
      return;
    }

    if (
      form.servicios.length === 0
    ) {
      setError(
        "Selecciona al menos un servicio."
      );
      return;
    }


    try {
      setLoading(true);
      setError("");


      // ===============================================
      // CREAR CITA
      // ===============================================

      const {
        data: cita,
        error: citaError,
      } = await supabase
        .from("citas")
        .insert({
          id_mascota:
            form.mascota,

          fecha:
            form.fecha,

          hora:
            form.hora,

          estado:
            "PENDIENTE",
        })
        .select("id_cita")
        .single();


      if (citaError) {
        throw citaError;
      }


      // ===============================================
      // CREAR DETALLES
      // ===============================================

      const detalles =
        form.servicios.map(
          (idServicio) => ({
            id_cita:
              cita.id_cita,

            id_servicio:
              idServicio,
          })
        );


      const {
        error: detalleError,
      } = await supabase
        .from("detalle_cita")
        .insert(detalles);


      if (detalleError) {
        throw detalleError;
      }


      // ===============================================
      // TERMINAR
      // ===============================================

      if (onCreated) {
        await onCreated();
      }

      onClose();

    } catch (error) {
      console.error(
        "Error creando cita:",
        error
      );

      setError(
        error.message ||
        "No fue posible agendar la cita."
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[200]

        flex
        items-center
        justify-center

        bg-[#153b39]/70

        p-4

        backdrop-blur-sm
      "
    >

      <div
        className="
          max-h-[90vh]
          w-full
          max-w-2xl

          overflow-y-auto

          rounded-3xl

          bg-[#fffaf2]

          p-6

          shadow-2xl

          sm:p-8
        "
      >

        {/* CABECERA */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >

          <div>

            <span
              className="
                text-xs
                font-bold
                tracking-[0.2em]

                text-[#14847f]
              "
            >
              CAN WASH
            </span>

            <h2
              className="
                mt-1

                text-2xl
                font-bold

                text-[#153b39]
              "
            >
              Agendar cita
            </h2>

            <p
              className="
                mt-2

                text-sm

                text-[#687877]
              "
            >
              Selecciona tu mascota,
              fecha y servicios.
            </p>

          </div>


          <button
            type="button"
            onClick={onClose}
            className="
              grid
              h-10
              w-10
              place-items-center

              rounded-full

              bg-[#dcefed]

              text-[#153b39]

              transition

              hover:bg-[#14847f]
              hover:text-white
            "
          >
            <X size={20} />
          </button>

        </div>


        {loadingData ? (
          <div
            className="
              py-16
              text-center
              text-[#687877]
            "
          >
            Cargando información...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8"
          >

            {/* MASCOTA */}

            <label
              className="
                mb-2
                block

                text-sm
                font-semibold

                text-[#153b39]
              "
            >
              Mascota
            </label>


            <div
              className="
                flex
                items-center
                gap-3

                rounded-xl

                border
                border-[#cce8e3]

                bg-white

                px-4
              "
            >

              <PawPrint
                size={20}
                className="
                  text-[#14847f]
                "
              />


              <select
                name="mascota"

                value={
                  form.mascota
                }

                onChange={
                  handleChange
                }

                className="
                  min-w-0
                  flex-1

                  bg-transparent

                  py-4

                  text-sm

                  text-[#153b39]

                  outline-none
                "
              >
                <option value="">
                  Selecciona una mascota
                </option>

                {mascotas.map(
                  (mascota) => (
                    <option
                      key={
                        mascota.id_mascota
                      }

                      value={
                        mascota.id_mascota
                      }
                    >
                      {mascota.nombre}
                      {" — "}
                      {mascota.especie}
                    </option>
                  )
                )}

              </select>

            </div>


            {/* FECHA Y HORA */}

            <div
              className="
                mt-6

                grid
                gap-4

                sm:grid-cols-2
              "
            >

              <div>

                <label
                  className="
                    mb-2
                    block

                    text-sm
                    font-semibold

                    text-[#153b39]
                  "
                >
                  Fecha
                </label>


                <div
                  className="
                    flex
                    items-center
                    gap-3

                    rounded-xl

                    border
                    border-[#cce8e3]

                    bg-white

                    px-4
                  "
                >

                  <CalendarDays
                    size={20}
                    className="
                      text-[#14847f]
                    "
                  />


                  <input
                    type="date"
                    name="fecha"

                    value={
                      form.fecha
                    }

                    onChange={
                      handleChange
                    }

                    className="
                      min-w-0
                      flex-1

                      bg-transparent

                      py-4

                      text-sm

                      outline-none
                    "
                  />

                </div>

              </div>


              <div>

                <label
                  className="
                    mb-2
                    block

                    text-sm
                    font-semibold

                    text-[#153b39]
                  "
                >
                  Hora
                </label>


                <div
                  className="
                    flex
                    items-center
                    gap-3

                    rounded-xl

                    border
                    border-[#cce8e3]

                    bg-white

                    px-4
                  "
                >

                  <Clock
                    size={20}
                    className="
                      text-[#14847f]
                    "
                  />


                  <input
                    type="time"
                    name="hora"

                    value={
                      form.hora
                    }

                    onChange={
                      handleChange
                    }

                    className="
                      min-w-0
                      flex-1

                      bg-transparent

                      py-4

                      text-sm

                      outline-none
                    "
                  />

                </div>

              </div>

            </div>


            {/* SERVICIOS */}

            <div className="mt-7">

              <div
                className="
                  mb-3

                  flex
                  items-center
                  gap-2
                "
              >
                <Scissors
                  size={19}
                  className="
                    text-[#14847f]
                  "
                />

                <h3
                  className="
                    text-sm
                    font-semibold

                    text-[#153b39]
                  "
                >
                  Servicios
                </h3>
              </div>


              <div
                className="
                  grid
                  gap-3
                "
              >

                {servicios.map(
                  (servicio) => {
                    const selected =
                      form.servicios
                        .includes(
                          servicio.id_servicio
                        );


                    return (
                      <button
                        key={
                          servicio.id_servicio
                        }

                        type="button"

                        onClick={() =>
                          toggleServicio(
                            servicio.id_servicio
                          )
                        }

                        className={`
                          flex
                          items-center
                          justify-between
                          gap-4

                          rounded-xl

                          border

                          p-4

                          text-left

                          transition

                          ${
                            selected
                              ? `
                                border-[#14847f]
                                bg-[#dcefed]
                              `
                              : `
                                border-[#cce8e3]
                                bg-white

                                hover:border-[#14847f]/50
                              `
                          }
                        `}
                      >

                        <div>

                          <strong
                            className="
                              block

                              text-sm

                              text-[#153b39]
                            "
                          >
                            {servicio.nombre}
                          </strong>


                          {servicio.descripcion && (
                            <span
                              className="
                                mt-1
                                block

                                text-xs

                                text-[#687877]
                              "
                            >
                              {
                                servicio.descripcion
                              }
                            </span>
                          )}

                        </div>


                        <span
                          className="
                            shrink-0

                            text-sm
                            font-bold

                            text-[#14847f]
                          "
                        >
                          $
                          {Number(
                            servicio.precio || 0
                          ).toFixed(2)}
                        </span>

                      </button>
                    );
                  }
                )}

              </div>

            </div>


            {/* TOTAL */}

            <div
              className="
                mt-6

                flex
                items-center
                justify-between

                rounded-xl

                bg-[#dcefed]/50

                px-5
                py-4
              "
            >

              <span
                className="
                  text-sm
                  font-semibold

                  text-[#687877]
                "
              >
                Total estimado
              </span>


              <strong
                className="
                  text-xl

                  text-[#153b39]
                "
              >
                $
                {total.toFixed(2)}
              </strong>

            </div>


            {/* ERROR */}

            {error && (
              <div
                className="
                  mt-5

                  rounded-xl

                  border
                  border-red-200

                  bg-red-50

                  px-4
                  py-3

                  text-sm
                  text-red-700
                "
              >
                {error}
              </div>
            )}


            {/* BOTONES */}

            <div
              className="
                mt-7

                flex
                flex-col-reverse
                gap-3

                sm:flex-row
                sm:justify-end
              "
            >

              <button
                type="button"

                onClick={onClose}

                disabled={loading}

                className="
                  rounded-xl

                  px-5
                  py-3

                  text-sm
                  font-semibold

                  text-[#687877]

                  transition

                  hover:bg-[#dcefed]
                "
              >
                Cancelar
              </button>


              <button
                type="submit"

                disabled={
                  loading ||
                  loadingData
                }

                className="
                  flex
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-[#14847f]

                  px-6
                  py-3

                  text-sm
                  font-semibold
                  text-white

                  shadow-lg
                  shadow-[#14847f]/20

                  transition

                  hover:-translate-y-0.5
                  hover:bg-[#106f6b]

                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <CalendarDays
                  size={18}
                />

                {loading
                  ? "Agendando..."
                  : "Confirmar cita"}
              </button>

            </div>

          </form>
        )}

      </div>

    </div>
  );
}


export default AppointmentForm;