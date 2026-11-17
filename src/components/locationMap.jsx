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
// DIRECCIÓN FIJA DE CAN WASH
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
  // CONVERTIR DIRECCIÓN CAN WASH
  // A COORDENADAS
  // =====================================================

  const getCanWashLocation =
    async () => {
      // Si ya tenemos las coordenadas,
      // no volver a llamar a Nominatim.

      if (canWashLocation) {
        return canWashLocation;
      }


      const params =
        new URLSearchParams({
          q: CAN_WASH_ADDRESS,

          format:
            "jsonv2",

          limit:
            "1",

          countrycodes:
            "mx",
        });


      const response =
        await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            headers: {
              Accept:
                "application/json",
            },
          }
        );


      if (!response.ok) {
        throw new Error(
          "No fue posible localizar Can Wash."
        );
      }


      const data =
        await response.json();


      if (
        !Array.isArray(data) ||
        data.length === 0
      ) {
        throw new Error(
          "Nominatim no encontró la dirección de Can Wash."
        );
      }


      const latitude =
        Number(
          data[0].lat
        );


      const longitude =
        Number(
          data[0].lon
        );


      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        throw new Error(
          "Las coordenadas obtenidas para Can Wash no son válidas."
        );
      }


      const result = {
        latitude,
        longitude,

        displayName:
          data[0].display_name,
      };


      setCanWashLocation(
        result
      );


      return result;
    };


  // =====================================================
  // OSRM
  //
  // CALCULAR RUTA REAL POR CALLES
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
        // OBTENER COORDENADAS DE CAN WASH
        // ===============================================

        const origin =
          await getCanWashLocation();


        // ===============================================
        // IMPORTANTE:
        //
        // OSRM utiliza:
        //
        // longitud,latitud
        //
        // NO:
        //
        // latitud,longitud
        // ===============================================

        const coordinates =
          `${origin.longitude},${origin.latitude};` +
          `${clientLongitude},${clientLatitude}`;


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
        // ===============================================

        const distanceKm =
          route.distance /
          1000;


        // ===============================================
        // DURACIÓN
        // ===============================================

        const durationMinutes =
          Math.ceil(
            route.duration /
            60
          );


        // ===============================================
        // GUARDAR INFORMACIÓN
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


        setRouteInfo(
          result
        );


        return result;

      } catch (routeError) {
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


      onLocationSaved?.({
        latitude,
        longitude,
      });
    };


  // =====================================================
  // SOLICITAR UBICACIÓN
  // =====================================================

  const requestLocation =
    () => {
      setError("");
      setSuccess("");


      // ===============================================
      // GEOLOCATION DISPONIBLE
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
            // MOSTRAR UBICACIÓN
            // ===========================================

            setLocation({
              latitude,
              longitude,
              accuracy,
            });


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


              setSuccess(
                "Tu ubicación se guardó y la ruta fue calculada correctamente."
              );

            } catch (
              locationSaveError
            ) {
              console.error(
                "Error procesando ubicación:",
                locationSaveError
              );


              setError(
                locationSaveError
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
          // ERROR GEOLOCATION
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
          // CONFIGURACIÓN
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
  // CALCULAR RUTA PARA UBICACIÓN GUARDADA
  //
  // Si el cliente ya tenía ubicación en Supabase,
  // calculamos automáticamente la ruta.
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


    // ===================================================
    // CREAR MAPA
    // ===================================================

    if (!mapRef.current) {
      mapRef.current =
        L.map(
          mapContainerRef.current
        ).setView(
          [
            latitude,
            longitude,
          ],
          15
        );


      // ===============================================
      // OPENSTREETMAP
      // ===============================================

      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom:
            19,

          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      ).addTo(
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


    // ===================================================
    // MARCADOR CLIENTE
    // ===================================================

    if (
      clientMarkerRef.current
    ) {
      clientMarkerRef.current
        .remove();
    }


    clientMarkerRef.current =
      L.marker([
        latitude,
        longitude,
      ])
        .addTo(
          mapRef.current
        )
        .bindPopup(
          "<strong>Tu ubicación</strong>"
        );


    // ===================================================
    // CORREGIR TAMAÑO
    // ===================================================

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


    // ===================================================
    // BORRAR RUTA ANTERIOR
    // ===================================================

    if (
      routeLayerRef.current
    ) {
      routeLayerRef.current
        .remove();

      routeLayerRef.current =
        null;
    }


    // ===================================================
    // BORRAR MARCADOR CAN WASH
    // ===================================================

    if (
      canWashMarkerRef.current
    ) {
      canWashMarkerRef.current
        .remove();

      canWashMarkerRef.current =
        null;
    }


    // ===================================================
    // MARCADOR CAN WASH
    // ===================================================

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


    // ===================================================
    // RUTA GEOJSON
    // ===================================================

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


    // ===================================================
    // MOSTRAR TODA LA RUTA
    // ===================================================

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


    // ===================================================
    // POPUP CLIENTE
    // ===================================================

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
          HEADER
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

      {!location && !error && (
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
              UBICACIÓN
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
              INFORMACIÓN DE RUTA
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

              {/* HEADER */}

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


              {/* DATOS */}

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


              {/* ORIGEN */}

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
                  Av. República No. 5
                  privada del Heroico
                  Colegio Militar,
                  Barrio de Santa Ana,
                  San Francisco de
                  Campeche.
                </p>

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