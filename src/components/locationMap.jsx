import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
  Search,
} from "lucide-react";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";

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

  const [location, setLocation] = useState(null);
  const [canWashLocation, setCanWashLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Estados para búsqueda manual por dirección
  const [manualStreet, setManualStreet] = useState("");
  const [manualColonia, setManualColonia] = useState("");
  const [manualPostalCode, setManualPostalCode] = useState("");
  const [searchingAddress, setSearchingAddress] = useState(false);

  const [loading, setLoading] = useState(false);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // REFERENCIAS LEAFLET
  // =====================================================

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const clientMarkerRef = useRef(null);
  const canWashMarkerRef = useRef(null);
  const routeLayerRef = useRef(null);

  // =====================================================
  // CARGAR UBICACIÓN GUARDADA DEL CLIENTE
  // =====================================================

  useEffect(() => {
    if (client?.latitud == null || client?.longitud == null) {
      return;
    }

    const latitude = Number(client.latitud);
    const longitude = Number(client.longitud);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    setLocation({
      latitude,
      longitude,
      accuracy: null,
    });
  }, [client?.latitud, client?.longitud]);

  // =====================================================
  // FUNCIÓN AUXILIAR NOMINATIM (REUTILIZABLE)
  // =====================================================

  const queryNominatim = async (searchParams) => {
    const params = new URLSearchParams({
      ...searchParams,
      format: "jsonv2",
      limit: "5",
      countrycodes: "mx",
      addressdetails: "1",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "es-MX,es;q=0.9",
        },
      }
    );

    if (!response.ok) {
      throw new Error("No fue posible consultar el servicio de direcciones.");
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  };

  // =====================================================
  // BUSCAR LA UBICACIÓN DE CAN WASH
  // =====================================================

  const getCanWashLocation = async () => {
    if (canWashLocation) {
      return canWashLocation;
    }

    let results = await queryNominatim({
      q: "Avenida Republica 5, Santa Ana, San Francisco de Campeche, Campeche, 24050, Mexico",
    });

    if (results.length === 0) {
      results = await queryNominatim({
        q: "Avenida Republica, Santa Ana, San Francisco de Campeche, Campeche, Mexico",
      });
    }

    if (results.length === 0) {
      results = await queryNominatim({
        street: "Avenida Republica",
        city: "San Francisco de Campeche",
        state: "Campeche",
        country: "Mexico",
        postalcode: "24050",
      });
    }

    if (results.length === 0) {
      results = await queryNominatim({
        q: "Santa Ana, San Francisco de Campeche, Campeche, Mexico",
      });
    }

    if (results.length === 0) {
      throw new Error("Nominatim no pudo localizar Avenida República en Campeche.");
    }

    const result = results[0];
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Nominatim devolvió coordenadas inválidas.");
    }

    const locationResult = {
      latitude,
      longitude,
      displayName: result.display_name || CAN_WASH_ADDRESS,
    };

    setCanWashLocation(locationResult);
    return locationResult;
  };

  // =====================================================
  // OSRM: CALCULAR RUTA, COSTO Y TIEMPO REALISTA
  // =====================================================

  const calculateRoute = async (clientLatitude, clientLongitude) => {
    try {
      setCalculatingRoute(true);

      const origin = await getCanWashLocation();
      const coordinates =
        `${origin.longitude},${origin.latitude};` +
        `${clientLongitude},${clientLatitude}`;

      const url =
        "https://router.project-osrm.org/route/v1/driving/" +
        coordinates +
        "?overview=full&geometries=geojson&steps=false";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("No fue posible consultar el servicio de rutas.");
      }

      const data = await response.json();

      if (data.code !== "Ok" || !data.routes?.length) {
        throw new Error("No se encontró una ruta entre Can Wash y tu ubicación.");
      }

      const route = data.routes[0];
      const distanceKm = route.distance / 1000;

      // Regla de negocio: $10 por km, mínimo $40
      let visitCost = Math.round(distanceKm * 10);
      if (visitCost < 40) {
        visitCost = 40;
      }

      // Tiempo realista (+5 min margen logístico/tráfico)
      const rawMinutes = route.duration / 60;
      const realisticMinutes = Math.ceil(rawMinutes + 5);

      const result = {
        distanceMeters: route.distance,
        distanceKm,
        durationSeconds: route.duration,
        durationMinutes: Math.ceil(rawMinutes),
        realisticMinutes,
        visitCost,
        geometry: route.geometry,
        origin,
      };

      setRouteInfo(result);
      return result;
    } catch (routeError) {
      console.error("Error calculando ruta:", routeError);
      setRouteInfo(null);
      throw routeError;
    } finally {
      setCalculatingRoute(false);
    }
  };

  // =====================================================
  // GUARDAR UBICACIÓN EN SUPABASE
  // =====================================================

  const saveLocation = async (latitude, longitude) => {
    if (!client?.id_cliente) {
      throw new Error("No fue posible identificar tu perfil de cliente.");
    }

    const { error: updateError } = await supabase
      .from("clientes")
      .update({
        latitud: latitude,
        longitud: longitude,
      })
      .eq("id_cliente", client.id_cliente);

    if (updateError) {
      throw updateError;
    }

    onLocationSaved?.({
      latitude,
      longitude,
    });
  };

  // =====================================================
  // PROCESAR Y GUARDAR NUEVAS COORDENADAS (COMPARTIDO)
  // =====================================================

  const applyAndSaveCoordinates = async (latitude, longitude, accuracy = null, successMsg) => {
    setLocation({
      latitude,
      longitude,
      accuracy,
    });
    setRouteInfo(null);

    await saveLocation(latitude, longitude);
    await calculateRoute(latitude, longitude);
    setSuccess(successMsg);
  };

  // =====================================================
  // BUSCAR POR DIRECCIÓN ESCRITA (GEOCODIFICACIÓN)
  // =====================================================

  const handleManualAddressSearch = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!client?.id_cliente) {
      setError("Primero guarda tu información de cliente antes de registrar tu ubicación.");
      return;
    }

    if (!manualStreet.trim() && !manualColonia.trim()) {
      setError("Ingresa al menos la calle o la colonia para buscar tu dirección.");
      return;
    }

    setSearchingAddress(true);

    try {
      // Construimos la consulta enfocada en San Francisco de Campeche
      const parts = [
        manualStreet.trim(),
        manualColonia.trim(),
        manualPostalCode.trim(),
        "San Francisco de Campeche",
        "Campeche",
        "Mexico",
      ].filter(Boolean);

      let results = await queryNominatim({
        q: parts.join(", "),
      });

      // Fallback si puso número exterior y Nominatim no lo tiene indexado
      if (results.length === 0 && manualColonia.trim()) {
        results = await queryNominatim({
          q: `${manualColonia.trim()}, San Francisco de Campeche, Campeche, Mexico`,
        });
      }

      if (results.length === 0) {
        throw new Error(
          "No encontramos esa dirección exacta en Campeche. Intenta con el nombre de tu colonia o ajusta el pin en el mapa."
        );
      }

      const bestMatch = results[0];
      const latitude = Number(bestMatch.lat);
      const longitude = Number(bestMatch.lon);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("Las coordenadas obtenidas no son válidas.");
      }

      await applyAndSaveCoordinates(
        latitude,
        longitude,
        null,
        "Dirección localizada. Si es necesario, arrastra el marcador azul en el mapa para mayor precisión."
      );
    } catch (searchErr) {
      console.error("Error buscando dirección:", searchErr);
      setError(searchErr.message || "No fue posible encontrar la dirección.");
    } finally {
      setSearchingAddress(false);
    }
  };

  // =====================================================
  // SOLICITAR UBICACIÓN GPS DEL NAVEGADOR
  // =====================================================

  const requestLocation = () => {
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicación.");
      return;
    }

    if (!client?.id_cliente) {
      setError("Primero guarda tu información de cliente antes de registrar tu ubicación.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        try {
          await applyAndSaveCoordinates(
            latitude,
            longitude,
            accuracy,
            "Tu ubicación GPS se guardó y la cotización de ruta fue calculada correctamente."
          );
        } catch (locationError) {
          console.error("Error procesando ubicación:", locationError);
          setError(locationError.message || "No fue posible procesar tu ubicación.");
        } finally {
          setLoading(false);
        }
      },
      (locationError) => {
        console.error("Error de ubicación:", locationError);

        if (locationError.code === 1) {
          setError("No diste permiso para utilizar tu ubicación.");
        } else if (locationError.code === 2) {
          setError("No fue posible determinar tu ubicación.");
        } else if (locationError.code === 3) {
          setError("La solicitud de ubicación tardó demasiado.");
        } else {
          setError("No fue posible obtener tu ubicación.");
        }

        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // =====================================================
  // CALCULAR RUTA DE UBICACIÓN YA GUARDADA
  // =====================================================

  useEffect(() => {
    if (!location || routeInfo || calculatingRoute) {
      return;
    }

    let cancelled = false;

    const loadRoute = async () => {
      try {
        await calculateRoute(location.latitude, location.longitude);
      } catch (routeError) {
        if (cancelled) return;
        console.error("No se pudo cargar la ruta guardada:", routeError);
        setError(routeError.message || "No fue posible calcular la ruta.");
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [location?.latitude, location?.longitude]);

  // =====================================================
  // CREAR MAPA Y MARCADOR ARRASTRABLE
  // =====================================================

  useEffect(() => {
    if (!location || !mapContainerRef.current) {
      return;
    }

    const { latitude, longitude } = location;

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [latitude, longitude],
        15
      );

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([latitude, longitude], 15);
    }

    if (clientMarkerRef.current) {
      clientMarkerRef.current.remove();
    }

    // Marcador arrastrable para ajuste fino
    clientMarkerRef.current = L.marker([latitude, longitude], {
      draggable: true,
    })
      .addTo(mapRef.current)
      .bindPopup("<strong>Tu domicilio</strong><br/><small>Arrástrame para ajustar</small>");

    // Evento al terminar de arrastrar el pin
    clientMarkerRef.current.on("dragend", async (event) => {
      const marker = event.target;
      const position = marker.getLatLng();
      setError("");
      setSuccess("");

      try {
        await applyAndSaveCoordinates(
          position.lat,
          position.lng,
          null,
          "Ubicación ajustada manualmente y ruta recalculada."
        );
      } catch (dragError) {
        setError(dragError.message || "No se pudo actualizar la ubicación ajustada.");
      }
    });

    window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 100);
  }, [location]);

  // =====================================================
  // DIBUJAR RUTA
  // =====================================================

  useEffect(() => {
    if (!routeInfo || !mapRef.current) {
      return;
    }

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (canWashMarkerRef.current) {
      canWashMarkerRef.current.remove();
      canWashMarkerRef.current = null;
    }

    canWashMarkerRef.current = L.marker([
      routeInfo.origin.latitude,
      routeInfo.origin.longitude,
    ])
      .addTo(mapRef.current)
      .bindPopup(
        `
          <strong>Can Wash</strong>
          <br />
          Av. República No. 5
          <br />
          Barrio de Santa Ana
        `
      );

    routeLayerRef.current = L.geoJSON(routeInfo.geometry, {
      style: {
        color: "#14847f",
        weight: 5,
        opacity: 0.85,
      },
    }).addTo(mapRef.current);

    const bounds = routeLayerRef.current.getBounds();

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, {
        padding: [40, 40],
      });
    }
  }, [routeInfo]);

  // =====================================================
  // DESTRUIR MAPA
  // =====================================================

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clientMarkerRef.current = null;
        canWashMarkerRef.current = null;
        routeLayerRef.current = null;
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
      {/* ENCABEZADO */}
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
          <div className="flex items-center gap-2">
            <MapPin size={21} className="text-canwash" />
            <h2 className="text-xl font-bold text-canwash-dark">
              Mi ubicación
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-canwash-muted">
            Ingresa tu dirección o usa tu GPS para calcular la distancia,
            el costo de visita y el tiempo estimado.
          </p>
        </div>

        <button
          type="button"
          onClick={requestLocation}
          disabled={loading || searchingAddress}
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
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <LocateFixed size={18} />
          )}
          {loading ? "Procesando..." : "Usar mi GPS actual"}
        </button>
      </div>

      {/* FORMULARIO DE DIRECCIÓN MANUAL */}
      <form
        onSubmit={handleManualAddressSearch}
        className="
          mt-6
          rounded-2xl
          border
          border-canwash-light
          bg-canwash-background/60
          p-4
        "
      >
        <span className="block text-xs font-bold uppercase tracking-wider text-canwash-dark">
          O escribe tu dirección en San Francisco de Campeche
        </span>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Calle y número (ej. Calle 10 #45)"
              value={manualStreet}
              onChange={(e) => setManualStreet(e.target.value)}
              className="
                w-full
                rounded-xl
                border
                border-canwash-light
                bg-white
                px-3.5
                py-2.5
                text-sm
                text-canwash-dark
                placeholder:text-canwash-muted/70
                focus:border-canwash
                focus:outline-none
              "
            />
          </div>

          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="Colonia o Fracc. (ej. Prado)"
              value={manualColonia}
              onChange={(e) => setManualColonia(e.target.value)}
              className="
                w-full
                rounded-xl
                border
                border-canwash-light
                bg-white
                px-3.5
                py-2.5
                text-sm
                text-canwash-dark
                placeholder:text-canwash-muted/70
                focus:border-canwash
                focus:outline-none
              "
            />
          </div>

          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="C.P. (opcional)"
              value={manualPostalCode}
              onChange={(e) => setManualPostalCode(e.target.value)}
              className="
                w-full
                rounded-xl
                border
                border-canwash-light
                bg-white
                px-3.5
                py-2.5
                text-sm
                text-canwash-dark
                placeholder:text-canwash-muted/70
                focus:border-canwash
                focus:outline-none
              "
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={searchingAddress || loading}
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-canwash
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-canwash-dark
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {searchingAddress ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {searchingAddress ? "Buscando dirección..." : "Buscar y calcular ruta"}
          </button>
        </div>
      </form>

      {/* ALERTAS */}
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
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <span>{error}</span>
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
            bg-emerald-50
            p-4
            text-sm
            font-medium
            text-emerald-700
          "
        >
          <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SIN UBICACIÓN */}
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
            <h3 className="mt-4 font-bold text-canwash-dark">
              Ubicación no disponible
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-canwash-muted">
              Escribe tu calle y colonia arriba o presiona "Usar mi GPS actual"
              para ubicar tu domicilio en el mapa.
            </p>
          </div>
        </div>
      )}

      {/* MAPA Y RESULTADOS */}
      {location && (
        <>
          <div
            ref={mapContainerRef}
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

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <LocationInformation
              label="Latitud"
              value={location.latitude.toFixed(6)}
            />
            <LocationInformation
              label="Longitud"
              value={location.longitude.toFixed(6)}
            />
            <LocationInformation
              label="Origen del dato"
              value={
                location.accuracy != null
                  ? `GPS (± ${Math.round(location.accuracy)} m)`
                  : "Dirección manual / Mapa"
              }
            />
          </div>

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
              <LoaderCircle size={19} className="animate-spin text-canwash" />
              Calculando ruta, costos y tiempo realista...
            </div>
          )}

          {routeInfo && !calculatingRoute && (
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
              <div className="flex items-center gap-3">
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
                  <Route size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-[0.15em] text-canwash-muted">
                    COTIZACIÓN DE SERVICIO A DOMICILIO
                  </span>
                  <h3 className="text-base font-bold text-canwash-dark">
                    Can Wash → Tu domicilio
                  </h3>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* DISTANCIA */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canwash-light text-canwash">
                    <Navigation size={19} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-canwash-muted">
                      Distancia
                    </span>
                    <strong className="mt-1 block text-lg text-canwash-dark">
                      {routeInfo.distanceKm.toFixed(2)} km
                    </strong>
                  </div>
                </div>

                {/* TIEMPO REALISTA */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canwash-light text-canwash">
                    <Clock size={19} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-canwash-muted">
                      Tiempo Realista
                    </span>
                    <strong className="mt-1 block text-lg text-canwash-dark">
                      {routeInfo.realisticMinutes} min
                    </strong>
                  </div>
                </div>

                {/* COSTO DE VISITA */}
                <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canwash-light text-canwash">
                    <DollarSign size={19} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase text-canwash-muted">
                      Costo de Visita
                    </span>
                    <strong className="mt-1 block text-lg text-canwash-dark">
                      ${routeInfo.visitCost} MXN
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white/70 p-4">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-canwash-muted">
                  Origen
                </span>
                <p className="mt-1 text-sm leading-6 text-canwash-dark">
                  {CAN_WASH_ADDRESS}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function LocationInformation({ label, value }) {
  return (
    <div className="rounded-xl bg-canwash-background p-4">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-canwash-muted">
        {label}
      </span>
      <strong className="mt-1 block text-sm text-canwash-dark">
        {value}
      </strong>
    </div>
  );
}

export default LocationMap;