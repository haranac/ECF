import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
} from "lucide-react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  supabase,
} from "../lib/supabase";


// =========================================================
// DIRECCIÓN OFICIAL DE CAN WASH
// =========================================================

const CAN_WASH_ADDRESS =
  "Av. República No. 5 privada del Heroico Colegio Militar, Barrio de Sta Ana, 24050 San Francisco de Campeche, Campeche, México";


// =========================================================
// COMPONENTE
// =========================================================

function LocationMap({
  client,
  onLocationSaved,
}) {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [
    location,
    setLocation,
  ] = useState(null);


  const [
    canWashLocation,
    setCanWashLocation,
  ] = useState(null);


  const [
    routeInfo,
    setRouteInfo,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    calculatingRoute,
    setCalculatingRoute,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  // =====================================================
  // REFERENCIAS LEAFLET
  // =====================================================

  const mapContainerRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const clientMarkerRef =
    useRef(null);

  const canWashMarkerRef =
    useRef(null);

  const routeLayerRef =
    useRef(null);


  // =====================================================
  // CARGAR UBICACIÓN GUARDADA DEL CLIENTE
  // =====================================================

  useEffect(() => {
    if (
      client?.latitud == null ||
      client?.longitud == null
    ) {
      return;
    }


    const latitude =
      Number(
        client.latitud
      );


    const longitude =
      Number(
        client.longitud
      );


    if (
      !Number.isFinite(
        latitude
      ) ||
      !Number.isFinite(
        longitude
      )
    ) {
      return;
    }


    setLocation({
      latitude,
      longitude,
      accuracy: null,
    });

  }, [
    client?.latitud,
    client?.longitud,
  ]);


  // =====================================================
  // NOMINATIM
  //
  // BUSCAR LA UBICACIÓN DE CAN WASH
  // =====================================================

  const getCanWashLocation =
    async () => {
      // ===============================================
      // YA ESTÁ EN MEMORIA
      // ===============================================

      if (canWashLocation) {
        return canWashLocation;
      }


      // ===============================================
      // FUNCIÓN AUXILIAR NOMINATIM
      // ===============================================

      const searchNominatim =
        async (searchParams) => {
          const params =
            new URLSearchParams({
              ...searchParams,

              format:
                "jsonv2",

              limit:
                "5",

              countrycodes:
                "mx",

              addressdetails:
                "1",
            });


          const response =
            await fetch(
              `https://nominatim.openstreetmap.org/search?${params.toString()}`,
              {
                headers: {
                  Accept:
                    "application/json",

                  "Accept-Language":
                    "es-MX,es;q=0.9",
                },
              }
            );


          if (!response.ok) {
            throw new Error(
              "No fue posible consultar Nominatim."
            );
          }


          const data =
            await response.json();


          return Array.isArray(data)
            ? data
            : [];
        };


      // ===============================================
      // INTENTO 1
      //
      // DIRECCIÓN SIMPLIFICADA
      // ===============================================

      let results =
        await searchNominatim({
          q:
            "Avenida Republica 5, Santa Ana, San Francisco de Campeche, Campeche, 24050, Mexico",
        });


      // ===============================================
      // INTENTO 2
      //
      // SIN EL NÚMERO
      // ===============================================

      if (
        results.length === 0
      ) {
        results =
          await searchNominatim({
            q:
              "Avenida Republica, Santa Ana, San Francisco de Campeche, Campeche, Mexico",
          });
      }


      // ===============================================
      // INTENTO 3
      //
      // BÚSQUEDA ESTRUCTURADA
      // ===============================================

      if (
        results.length === 0
      ) {
        results =
          await searchNominatim({
            street:
              "Avenida Republica",

            city:
              "San Francisco de Campeche",

            state:
              "Campeche",

            country:
              "Mexico",

            postalcode:
              "24050",
          });
      }


      // ===============================================
      // INTENTO 4
      //
      // CALLE + CIUDAD
      // ===============================================

      if (
        results.length === 0
      ) {
        results =
          await searchNominatim({
            q:
              "Avenida Republica, Campeche, Campeche, Mexico",
          });
      }


      // ===============================================
      // INTENTO 5
      //
      // BARRIO SANTA ANA
      // ===============================================

      if (
        results.length === 0
      ) {
        results =
          await searchNominatim({
            q:
              "Santa Ana, San Francisco de Campeche, Campeche, Mexico",
          });
      }


      // ===============================================
      // NO ENCONTRADO
      // ===============================================

      if (
        results.length === 0
      ) {
        throw new Error(
          "Nominatim no pudo localizar Avenida República en Campeche."
        );
      }


      // ===============================================
      // RESULTADO
      // ===============================================

      const result =
        results[0];


      const latitude =
        Number(
          result.lat
        );


      const longitude =
        Number(
          result.lon
        );


      // ===============================================
      // VALIDAR
      // ===============================================

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        throw new Error(
          "Nominatim devolvió coordenadas inválidas."
        );
      }


      const locationResult = {
        latitude,
        longitude,

        displayName:
          result.display_name ||
          CAN_WASH_ADDRESS,
      };


      // ===============================================
      // DEBUG
      // ===============================================

      console.log(
        "Can Wash encontrado:",
        locationResult
      );


      console.log(
        "Resultado completo de Nominatim:",
        result
      );


      // ===============================================
      // GUARDAR EN ESTADO
      // ===============================================

      setCanWashLocation(
        locationResult
      );


      return locationResult;
    };


  // =====================================================
  // OSRM
  //
  // CALCULAR RUTA POR CALLES
  // =====================================================

  const calculateRoute =
    async (
      clientLatitude,
      clientLongitude
    ) => {
      try {
        setCalculatingRoute(
          true
        );


        // ===============================================
        // OBTENER CAN WASH
        // ===============================================

        const origin =
          await getCanWashLocation();


        // ===============================================
        // OSRM UTILIZA:
        //
        // LONGITUD,LATITUD
        // ===============================================

        const coordinates =
          `${origin.longitude},${origin.latitude};` +
          `${clientLongitude},${clientLatitude}`;


        // ===============================================
        // URL OSRM
        // ===============================================

        const url =
          "https://router.project-osrm.org" +
          "/route/v1/driving/" +
          coordinates +
          "?overview=full" +
          "&geometries=geojson" +
          "&steps=false";


        const response =
          await fetch(
            url
          );


        if (!response.ok) {
          throw new Error(
            "No fue posible consultar el servicio de rutas."
          );
        }


        const data =
          await response.json();


        // ===============================================
        // VALIDAR RESPUESTA
        // ===============================================

        if (
          data.code !== "Ok" ||
          !data.routes?.length
        ) {
          throw new Error(
            "No se encontró una ruta entre Can Wash y tu ubicación."
          );
        }


        const route =
          data.routes[0];


        // ===============================================
        // DISTANCIA
        //
        // OSRM -> METROS
        // ===============================================

        const distanceKm =
          route.distance /
          1000;


        // ===============================================
        // TIEMPO
        //
        // OSRM -> SEGUNDOS
        // ===============================================

        const durationMinutes =
          Math.ceil(
            route.duration /
            60
          );


        // ===============================================
        // RESULTADO
        // ===============================================

        const result = {
          distanceMeters:
            route.distance,

          distanceKm,

          durationSeconds:
            route.duration,

          durationMinutes,

          geometry:
            route.geometry,

          origin,
        };


        console.log(
          "Ruta calculada:",
          result
        );


        setRouteInfo(
          result
        );


        return result;

      } catch (
        routeError
      ) {
        console.error(
          "Error calculando ruta:",
          routeError
        );


        setRouteInfo(
          null
        );


        throw routeError;

      } finally {
        setCalculatingRoute(
          false
        );
      }
    };


  // =====================================================
  // GUARDAR UBICACIÓN EN SUPABASE
  // =====================================================

  const saveLocation =
    async (
      latitude,
      longitude
    ) => {
      if (
        !client?.id_cliente
      ) {
        throw new Error(
          "No fue posible identificar tu perfil de cliente."
        );
      }


      const {
        error: updateError,
      } = await supabase
        .from("clientes")
        .update({
          latitud:
            latitude,

          longitud:
            longitude,
        })
        .eq(
          "id_cliente",
          client.id_cliente
        );


      if (updateError) {
        throw updateError;
      }


      // ===============================================
      // ACTUALIZAR PROFILE
      // ===============================================

      onLocationSaved?.({
        latitude,
        longitude,
      });
    };


  // =====================================================
  // SOLICITAR UBICACIÓN DEL CLIENTE
  // =====================================================

  const requestLocation =
    () => {
      setError("");
      setSuccess("");


      // ===============================================
      // GEOLOCATION
      // ===============================================

      if (
        !navigator.geolocation
      ) {
        setError(
          "Tu navegador no permite obtener la ubicación."
        );

        return;
      }


      // ===============================================
      // CLIENTE
      // ===============================================

      if (
        !client?.id_cliente
      ) {
        setError(
          "Primero guarda tu información de cliente antes de registrar tu ubicación."
        );

        return;
      }


      setLoading(
        true
      );


      // ===============================================
      // PEDIR PERMISO AL NAVEGADOR
      // ===============================================

      navigator.geolocation
        .getCurrentPosition(
          // =============================================
          // UBICACIÓN OBTENIDA
          // =============================================

          async (
            position
          ) => {
            const {
              latitude,
              longitude,
              accuracy,
            } =
              position.coords;


            // ===========================================
            // MOSTRAR UBICACIÓN INMEDIATAMENTE
            // ===========================================

            setLocation({
              latitude,
              longitude,
              accuracy,
            });


            // ===========================================
            // BORRAR RUTA ANTERIOR
            // ===========================================

            setRouteInfo(
              null
            );


            try {
              // =========================================
              // GUARDAR EN SUPABASE
              // =========================================

              await saveLocation(
                latitude,
                longitude
              );


              // =========================================
              // CALCULAR RUTA
              // =========================================

              await calculateRoute(
                latitude,
                longitude
              );


              // =========================================
              // ÉXITO
              // =========================================

              setSuccess(
                "Tu ubicación se guardó y la ruta fue calculada correctamente."
              );

            } catch (
              locationError
            ) {
              console.error(
                "Error procesando ubicación:",
                locationError
              );


              setError(
                locationError
                  .message ||
                "No fue posible procesar tu ubicación."
              );

            } finally {
              setLoading(
                false
              );
            }
          },


          // =============================================
          // ERROR DE GEOLOCALIZACIÓN
          // =============================================

          (
            locationError
          ) => {
            console.error(
              "Error de ubicación:",
              locationError
            );


            if (
              locationError.code ===
              1
            ) {
              setError(
                "No diste permiso para utilizar tu ubicación."
              );

            } else if (
              locationError.code ===
              2
            ) {
              setError(
                "No fue posible determinar tu ubicación."
              );

            } else if (
              locationError.code ===
              3
            ) {
              setError(
                "La solicitud de ubicación tardó demasiado."
              );

            } else {
              setError(
                "No fue posible obtener tu ubicación."
              );
            }


            setLoading(
              false
            );
          },


          // =============================================
          // OPCIONES
          // =============================================

          {
            enableHighAccuracy:
              true,

            timeout:
              10000,

            maximumAge:
              0,
          }
        );
    };


  // =====================================================
  // CALCULAR RUTA DE UBICACIÓN YA GUARDADA
  // =====================================================

  useEffect(() => {
    if (
      !location ||
      routeInfo ||
      calculatingRoute
    ) {
      return;
    }


    let cancelled =
      false;


    const loadRoute =
      async () => {
        try {
          const result =
            await calculateRoute(
              location.latitude,
              location.longitude
            );


          if (
            cancelled
          ) {
            return;
          }


          return result;

        } catch (
          routeError
        ) {
          if (
            cancelled
          ) {
            return;
          }


          console.error(
            "No se pudo cargar la ruta guardada:",
            routeError
          );


          setError(
            routeError.message ||
            "No fue posible calcular la ruta."
          );
        }
      };


    loadRoute();


    return () => {
      cancelled =
        true;
    };

  }, [
    location?.latitude,
    location?.longitude,
  ]);


  // =====================================================
  // CREAR MAPA
  // =====================================================

  useEffect(() => {
    if (
      !location ||
      !mapContainerRef.current
    ) {
      return;
    }


    const {
      latitude,
      longitude,
    } =
      location;


    // ===============================================
    // CREAR MAPA
    // ===============================================

    if (
      !mapRef.current
    ) {
      mapRef.current =
        L.map(
          mapContainerRef.current
        )
          .setView(
            [
              latitude,
              longitude,
            ],
            15
          );


      // =============================================
      // OPENSTREETMAP
      // =============================================

      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom:
            19,

          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      )
        .addTo(
          mapRef.current
        );

    } else {
      mapRef.current
        .setView(
          [
            latitude,
            longitude,
          ],
          15
        );
    }


    // ===============================================
    // MARCADOR CLIENTE ANTERIOR
    // ===============================================

    if (
      clientMarkerRef.current
    ) {
      clientMarkerRef.current
        .remove();
    }


    // ===============================================
    // MARCADOR CLIENTE
    // ===============================================

    clientMarkerRef.current =
      L.marker([
        latitude,
        longitude,
      ])
        .addTo(
          mapRef.current
        )
        .bindPopup(
          "<strong>Tu domicilio</strong>"
        );


    // ===============================================
    // CORREGIR TAMAÑO
    // ===============================================

    window.setTimeout(
      () => {
        mapRef.current
          ?.invalidateSize();
      },
      100
    );

  }, [
    location,
  ]);


  // =====================================================
  // DIBUJAR RUTA
  // =====================================================

  useEffect(() => {
    if (
      !routeInfo ||
      !mapRef.current
    ) {
      return;
    }


    // ===============================================
    // ELIMINAR RUTA ANTERIOR
    // ===============================================

    if (
      routeLayerRef.current
    ) {
      routeLayerRef.current
        .remove();


      routeLayerRef.current =
        null;
    }


    // ===============================================
    // ELIMINAR MARCADOR ANTERIOR DE CAN WASH
    // ===============================================

    if (
      canWashMarkerRef.current
    ) {
      canWashMarkerRef.current
        .remove();


      canWashMarkerRef.current =
        null;
    }


    // ===============================================
    // MARCADOR CAN WASH
    // ===============================================

    canWashMarkerRef.current =
      L.marker([
        routeInfo
          .origin
          .latitude,

        routeInfo
          .origin
          .longitude,
      ])
        .addTo(
          mapRef.current
        )
        .bindPopup(
          `
            <strong>Can Wash</strong>
            <br />
            Av. República No. 5
            <br />
            Barrio de Santa Ana
          `
        );


    // ===============================================
    // DIBUJAR RUTA GEOJSON
    // ===============================================

    routeLayerRef.current =
      L.geoJSON(
        routeInfo.geometry,
        {
          style: {
            color:
              "#14847f",

            weight:
              5,

            opacity:
              0.85,
          },
        }
      )
        .addTo(
          mapRef.current
        );


    // ===============================================
    // AJUSTAR MAPA A TODA LA RUTA
    // ===============================================

    const bounds =
      routeLayerRef.current
        .getBounds();


    if (
      bounds.isValid()
    ) {
      mapRef.current
        .fitBounds(
          bounds,
          {
            padding:
              [
                40,
                40,
              ],
          }
        );
    }


    // ===============================================
    // POPUP CLIENTE
    // ===============================================

    clientMarkerRef.current
      ?.bindPopup(
        "<strong>Tu domicilio</strong>"
      );

  }, [
    routeInfo,
  ]);


  // =====================================================
  // DESTRUIR MAPA
  // =====================================================

  useEffect(() => {
    return () => {
      if (
        mapRef.current
      ) {
        mapRef.current
          .remove();


        mapRef.current =
          null;

        clientMarkerRef.current =
          null;

        canWashMarkerRef.current =
          null;

        routeLayerRef.current =
          null;
      }
    };
  }, []);


  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <section
      className="
        rounded-2xl

        bg-white

        p-6

        shadow-lg
        shadow-canwash-dark/5
      "
    >

      {/* =================================================
          ENCABEZADO
      ================================================== */}

      <div
        className="
          flex
          flex-col
          gap-4

          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >

        <div>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >

            <MapPin
              size={21}

              className="
                text-canwash
              "
            />


            <h2
              className="
                text-xl
                font-bold

                text-canwash-dark
              "
            >
              Mi ubicación
            </h2>

          </div>


          <p
            className="
              mt-2

              text-sm
              leading-6

              text-canwash-muted
            "
          >
            Guarda tu ubicación y
            calcula la distancia desde
            Can Wash hasta tu domicilio.
          </p>

        </div>


        {/* ===============================================
            BOTÓN UBICACIÓN
        ================================================ */}

        <button
          type="button"

          onClick={
            requestLocation
          }

          disabled={
            loading
          }

          className="
            flex
            items-center
            justify-center
            gap-2

            rounded-xl

            bg-canwash-dark

            px-4
            py-3

            text-sm
            font-semibold
            text-white

            transition

            hover:bg-canwash

            disabled:
            cursor-not-allowed

            disabled:
            opacity-60
          "
        >

          {loading ? (
            <LoaderCircle
              size={18}

              className="
                animate-spin
              "
            />
          ) : (
            <LocateFixed
              size={18}
            />
          )}


          {loading
            ? "Procesando..."
            : location
              ? "Actualizar ubicación"
              : "Usar mi ubicación"}

        </button>

      </div>


      {/* =================================================
          ERROR
      ================================================== */}

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

            bg-red-50

            p-4

            text-sm
            text-red-700
          "
        >

          <AlertCircle
            size={19}

            className="
              mt-0.5
              shrink-0
            "
          />


          <span>
            {error}
          </span>

        </div>
      )}


      {/* =================================================
          ÉXITO
      ================================================== */}

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

            bg-emerald-50

            p-4

            text-sm
            font-medium

            text-emerald-700
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


      {/* =================================================
          SIN UBICACIÓN
      ================================================== */}

      {!location &&
        !error && (
        <div
          className="
            mt-6

            grid
            min-h-72
            place-items-center

            rounded-2xl

            border-2
            border-dashed
            border-canwash-light

            bg-canwash-background

            p-8

            text-center
          "
        >

          <div>

            <div
              className="
                mx-auto

                grid
                h-16
                w-16
                place-items-center

                rounded-2xl

                bg-canwash-light
                text-canwash-dark
              "
            >
              <MapPin
                size={30}
              />
            </div>


            <h3
              className="
                mt-4

                font-bold

                text-canwash-dark
              "
            >
              Ubicación no disponible
            </h3>


            <p
              className="
                mx-auto
                mt-2
                max-w-sm

                text-sm
                leading-6

                text-canwash-muted
              "
            >
              Presiona "Usar mi ubicación"
              y acepta el permiso del
              navegador.
            </p>

          </div>

        </div>
      )}


      {/* =================================================
          MAPA
      ================================================== */}

      {location && (
        <>

          <div
            ref={
              mapContainerRef
            }

            className="
              isolate

              mt-6

              h-[350px]
              w-full

              overflow-hidden

              rounded-2xl

              sm:h-[420px]
            "
          />


          {/* =============================================
              COORDENADAS DEL CLIENTE
          ============================================== */}

          <div
            className="
              mt-4

              grid
              grid-cols-1
              gap-3

              sm:grid-cols-3
            "
          >

            <LocationInformation
              label="Latitud"

              value={
                location.latitude
                  .toFixed(6)
              }
            />


            <LocationInformation
              label="Longitud"

              value={
                location.longitude
                  .toFixed(6)
              }
            />


            <LocationInformation
              label="Precisión"

              value={
                location.accuracy != null
                  ? `± ${Math.round(
                      location.accuracy
                    )} m`

                  : "Ubicación guardada"
              }
            />

          </div>


          {/* =============================================
              CALCULANDO RUTA
          ============================================== */}

          {calculatingRoute && (
            <div
              className="
                mt-5

                flex
                items-center
                justify-center
                gap-3

                rounded-2xl

                bg-canwash-background

                p-5

                text-sm
                text-canwash-muted
              "
            >

              <LoaderCircle
                size={19}

                className="
                  animate-spin
                  text-canwash
                "
              />

              Calculando ruta desde
              Can Wash...

            </div>
          )}


          {/* =============================================
              INFORMACIÓN DE LA RUTA
          ============================================== */}

          {routeInfo &&
            !calculatingRoute && (
            <div
              className="
                mt-5

                rounded-2xl

                border
                border-canwash-light

                bg-gradient-to-br
                from-canwash-background
                to-white

                p-5
              "
            >

              {/* =========================================
                  CABECERA
              ========================================== */}

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
                    h-11
                    w-11
                    place-items-center

                    rounded-xl

                    bg-canwash-light

                    text-canwash-dark
                  "
                >
                  <Route
                    size={22}
                  />
                </div>


                <div>

                  <span
                    className="
                      text-[10px]
                      font-bold
                      tracking-[0.15em]

                      text-canwash-muted
                    "
                  >
                    RUTA DE SERVICIO
                  </span>


                  <h3
                    className="
                      text-base
                      font-bold

                      text-canwash-dark
                    "
                  >
                    Can Wash → Tu domicilio
                  </h3>

                </div>

              </div>


              {/* =========================================
                  DISTANCIA / TIEMPO
              ========================================== */}

              <div
                className="
                  mt-5

                  grid
                  grid-cols-1
                  gap-3

                  sm:grid-cols-2
                "
              >

                {/* DISTANCIA */}

                <div
                  className="
                    flex
                    items-center
                    gap-3

                    rounded-xl

                    bg-white

                    p-4

                    shadow-sm
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

                      bg-canwash-light

                      text-canwash
                    "
                  >
                    <Navigation
                      size={19}
                    />
                  </div>


                  <div>

                    <span
                      className="
                        block

                        text-[10px]
                        font-semibold
                        uppercase

                        text-canwash-muted
                      "
                    >
                      Distancia
                    </span>


                    <strong
                      className="
                        mt-1
                        block

                        text-lg

                        text-canwash-dark
                      "
                    >
                      {
                        routeInfo
                          .distanceKm
                          .toFixed(2)
                      }{" "}
                      km
                    </strong>

                  </div>

                </div>


                {/* TIEMPO */}

                <div
                  className="
                    flex
                    items-center
                    gap-3

                    rounded-xl

                    bg-white

                    p-4

                    shadow-sm
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

                      bg-canwash-light

                      text-canwash
                    "
                  >
                    <Clock
                      size={19}
                    />
                  </div>


                  <div>

                    <span
                      className="
                        block

                        text-[10px]
                        font-semibold
                        uppercase

                        text-canwash-muted
                      "
                    >
                      Tiempo estimado
                    </span>


                    <strong
                      className="
                        mt-1
                        block

                        text-lg

                        text-canwash-dark
                      "
                    >
                      {
                        routeInfo
                          .durationMinutes
                      }{" "}
                      min
                    </strong>

                  </div>

                </div>

              </div>


              {/* =========================================
                  ORIGEN
              ========================================== */}

              <div
                className="
                  mt-4

                  rounded-xl

                  bg-white/70

                  p-4
                "
              >

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
                  Origen
                </span>


                <p
                  className="
                    mt-1

                    text-sm
                    leading-6

                    text-canwash-dark
                  "
                >
                  {CAN_WASH_ADDRESS}
                </p>


                {/* =======================================
                    DIRECCIÓN QUE ENCONTRÓ NOMINATIM
                ======================================== */}

                {routeInfo
                  .origin
                  .displayName && (
                  <p
                    className="
                      mt-2

                      text-xs
                      leading-5

                      text-canwash-muted
                    "
                  >
                    Nominatim:{" "}
                    {
                      routeInfo
                        .origin
                        .displayName
                    }
                  </p>
                )}

              </div>

            </div>
          )}

        </>
      )}

    </section>
  );
}


// =========================================================
// INFORMACIÓN
// =========================================================

function LocationInformation({
  label,
  value,
}) {
  return (
    <div
      className="
        rounded-xl

        bg-canwash-background

        p-4
      "
    >

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

          text-sm

          text-canwash-dark
        "
      >
        {value}
      </strong>

    </div>
  );
}


export default LocationMap;