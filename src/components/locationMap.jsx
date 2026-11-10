import { useEffect, useRef, useState } from "react";

import {
  LocateFixed,
  MapPin,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import L from "leaflet";
import "leaflet/dist/leaflet.css";


function LocationMap() {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [location, setLocation] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  // =====================================================
  // REFERENCIAS DE LEAFLET
  // =====================================================

  const mapContainerRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const markerRef =
    useRef(null);


  // =====================================================
  // SOLICITAR UBICACIÓN
  // =====================================================

  const requestLocation = () => {
    setError("");


    // Comprobar compatibilidad
    if (!navigator.geolocation) {
      setError(
        "Tu navegador no permite obtener la ubicación."
      );

      return;
    }


    setLoading(true);


    navigator.geolocation.getCurrentPosition(
      // ===============================================
      // PERMISO CONCEDIDO
      // ===============================================

      (position) => {
        const {
          latitude,
          longitude,
          accuracy,
        } = position.coords;


        setLocation({
          latitude,
          longitude,
          accuracy,
        });


        setLoading(false);
      },


      // ===============================================
      // ERROR / PERMISO DENEGADO
      // ===============================================

      (locationError) => {
        console.error(
          "Error de ubicación:",
          locationError
        );


        if (
          locationError.code === 1
        ) {
          setError(
            "No diste permiso para utilizar tu ubicación."
          );

        } else if (
          locationError.code === 2
        ) {
          setError(
            "No fue posible determinar tu ubicación."
          );

        } else if (
          locationError.code === 3
        ) {
          setError(
            "La solicitud de ubicación tardó demasiado."
          );

        } else {
          setError(
            "No fue posible obtener tu ubicación."
          );
        }


        setLoading(false);
      },


      // ===============================================
      // OPCIONES
      // ===============================================

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };


  // =====================================================
  // CREAR / ACTUALIZAR MAPA
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
    } = location;


    // ===============================================
    // CREAR MAPA POR PRIMERA VEZ
    // ===============================================

    if (!mapRef.current) {
      mapRef.current =
        L.map(
          mapContainerRef.current
        ).setView(
          [
            latitude,
            longitude,
          ],
          16
        );


      // =============================================
      // CAPA DEL MAPA
      // =============================================

      L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,

          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      ).addTo(
        mapRef.current
      );
    } else {
      // =============================================
      // ACTUALIZAR POSICIÓN
      // =============================================

      mapRef.current.setView(
        [
          latitude,
          longitude,
        ],
        16
      );
    }


    // ===============================================
    // ELIMINAR MARCADOR ANTERIOR
    // ===============================================

    if (markerRef.current) {
      markerRef.current.remove();
    }


    // ===============================================
    // CREAR MARCADOR
    // ===============================================

    markerRef.current =
      L.marker([
        latitude,
        longitude,
      ])
        .addTo(
          mapRef.current
        )
        .bindPopup(
          "Tu ubicación actual"
        )
        .openPopup();


    // ===============================================
    // CORREGIR TAMAÑO DEL MAPA
    // ===============================================

    window.setTimeout(() => {
      mapRef.current
        ?.invalidateSize();
    }, 100);

  }, [location]);


  // =====================================================
  // DESTRUIR MAPA
  // =====================================================

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();

        mapRef.current = null;
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
              className="text-canwash"
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
            Permite el acceso a tu
            ubicación para mostrarla
            en el mapa.
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

            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >

          {loading ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <LocateFixed
              size={18}
            />
          )}


          {loading
            ? "Obteniendo ubicación..."
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
          ANTES DE DAR PERMISO
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
              <MapPin size={30} />
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
              navegador para visualizar
              tu posición.
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
              DATOS DE UBICACIÓN
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
                `± ${Math.round(
                  location.accuracy
                )} m`
              }
            />

          </div>

        </>
      )}

    </section>
  );
}


/* =========================================================
   INFORMACIÓN
========================================================= */

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