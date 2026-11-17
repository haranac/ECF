import { useEffect, useRef, useState } from "react";
import {
  Clock,
  LocateFixed,
  MapPin,
  Navigation,
  Route,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button, Notice } from "../ui";

const ORIGIN = [19.8399021, -90.5336569];
const ORIGIN_ADDRESS =
  "Av. República No. 5 privada del Heroico Colegio Militar, Barrio de Sta Ana, 24050 San Francisco de Campeche, Campeche, México";
const PRICE_PER_KM = 10;
const MINIMUM_VISIT_COST = 40;

const pin = L.divIcon({
  className: "",
  html: '<span class="cw-map-pin"></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

function calculateVisitCost(distanceKm) {
  const distanceCost = Number(distanceKm) * PRICE_PER_KM;

  return Number(
    Math.max(MINIMUM_VISIT_COST, distanceCost).toFixed(2),
  );
}

async function searchOriginWithNominatim() {
  const attempts = [
    { q: "Avenida Republica 5, Santa Ana, San Francisco de Campeche, Campeche, 24050, Mexico" },
    { q: "Avenida Republica, Santa Ana, San Francisco de Campeche, Campeche, Mexico" },
    { q: "Santa Ana, San Francisco de Campeche, Campeche, Mexico" },
  ];

  for (const search of attempts) {
    const params = new URLSearchParams({
      ...search,
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
      },
    );
    if (!response.ok) continue;
    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) continue;
    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return {
        latitude,
        longitude,
        displayName: results[0].display_name || ORIGIN_ADDRESS,
      };
    }
  }
  throw new Error("Nominatim no pudo localizar Can Wash.");
}

export default function LocationPicker({ value, onChange }) {
  const container = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const routeLayer = useRef(null);
  const callback = useRef(onChange);
  const initial = useRef(value);
  const originCache = useRef(null);
  const mounted = useRef(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [route, setRoute] = useState(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);

  useEffect(() => {
    mounted.current = true;
    const point = initial.current
      ? [initial.current.latitud, initial.current.longitud]
      : ORIGIN;
    const instance = L.map(container.current).setView(point, 15);
    map.current = instance;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    instance.on("click", (event) =>
      callback.current?.({
        latitud: event.latlng.lat,
        longitud: event.latlng.lng,
      }),
    );
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);
    return () => {
      mounted.current = false;
      resize.disconnect();
      instance.remove();
      map.current = null;
      marker.current = null;
      routeLayer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (value?.latitud == null || value?.longitud == null) {
      marker.current?.remove();
      marker.current = null;
      setRoute(null);
      routeLayer.current?.remove();
      routeLayer.current = null;
      return;
    }
    const coordinates = [Number(value.latitud), Number(value.longitud)];
    if (!marker.current) {
      const item = L.marker(coordinates, { icon: pin, draggable: true }).addTo(
        map.current,
      );
      item.on("dragend", () => {
        const point = item.getLatLng();
        callback.current?.({ latitud: point.lat, longitud: point.lng });
      });
      marker.current = item;
    } else {
      marker.current.setLatLng(coordinates);
    }
    map.current.panTo(coordinates);
  }, [value?.latitud, value?.longitud]);

  useEffect(() => {
    if (value?.latitud == null || value?.longitud == null) return undefined;
    let cancelled = false;
    const loadRoute = async () => {
      setCalculatingRoute(true);
      setError("");
      try {
        const origin =
          originCache.current || (await searchOriginWithNominatim());
        originCache.current = origin;
        const coordinates =
          `${origin.longitude},${origin.latitude};` +
          `${Number(value.longitud)},${Number(value.latitud)}`;
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
        );
        const data = await response.json();
        if (!response.ok || data.code !== "Ok" || !data.routes?.length) {
          throw new Error("OSRM no encontró una ruta hasta el domicilio.");
        }
        const selectedRoute = data.routes[0];
        const distanceKm = selectedRoute.distance / 1000;
        const result = {
          distanceKm,
          durationMinutes: Math.ceil(selectedRoute.duration / 60),
          visitCost: calculateVisitCost(distanceKm),
          geometry: selectedRoute.geometry,
          origin,
        };
        if (!cancelled && mounted.current) setRoute(result);
      } catch (routeError) {
        if (!cancelled && mounted.current) {
          setRoute(null);
          setError(
            routeError.message || "No fue posible calcular la ruta por calles.",
          );
        }
      } finally {
        if (!cancelled && mounted.current) setCalculatingRoute(false);
      }
    };
    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [value?.latitud, value?.longitud]);

  const displayedVisitCost = route
    ? Math.max(MINIMUM_VISIT_COST, Number(route.visitCost) || 0)
    : 0;

  useEffect(() => {
    if (!map.current || !route?.geometry) return;
    routeLayer.current?.remove();
    routeLayer.current = L.geoJSON(route.geometry, {
      style: { color: "#17384a", weight: 5, opacity: 0.85 },
    }).addTo(map.current);
    const bounds = routeLayer.current.getBounds();
    if (bounds.isValid()) map.current.fitBounds(bounds, { padding: [30, 30] });
  }, [route]);

  const locate = () => {
    if (!navigator.geolocation) {
      setError(
        "Tu navegador no permite obtener la ubicación. Marca el domicilio en el mapa.",
      );
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mounted.current) return;
        callback.current?.({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        });
        setLocating(false);
      },
      () => {
        if (!mounted.current) return;
        setError(
          "No pudimos obtener tu ubicación. Puedes seleccionar el domicilio directamente en el mapa.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-canwash-muted">
          <MapPin size={17} /> Toca el mapa o arrastra el marcador hasta el
          domicilio.
        </p>
        <Button tone="secondary" busy={locating} onClick={locate}>
          <LocateFixed size={17} /> Usar mi ubicación
        </Button>
      </div>
      <Notice tone="error">{error}</Notice>
      <div
        ref={container}
        role="region"
        aria-label="Mapa para seleccionar el domicilio"
        className="relative isolate z-0 h-72 w-full overflow-hidden rounded-2xl border border-canwash-light sm:h-80"
      />
      <p className="text-xs text-canwash-muted">
        {value?.latitud != null
          ? "Punto seleccionado. Confirma la calle y las referencias antes de guardar."
          : "El mapa inicia cerca del punto de salida. Selecciona tu domicilio para continuar."}
      </p>
      {calculatingRoute && (
        <div className="flex items-center gap-2 rounded-xl bg-canwash-background p-3 text-sm text-canwash-muted">
          <Route size={17} className="animate-pulse" />
          Calculando ruta desde Can Wash con OSRM...
        </div>
      )}
      {route && !calculatingRoute && (
        <div className="rounded-xl border border-canwash-light bg-canwash-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-canwash-dark">
            <Navigation size={17} /> Ruta de servicio
          </div>
          <div className="mt-3 grid gap-2 text-sm text-canwash-muted sm:grid-cols-3">
            <span>{route.distanceKm.toFixed(2)} km</span>
            <span className="flex items-center gap-1">
              <Clock size={15} /> {route.durationMinutes} min aprox.
            </span>
            <strong className="text-canwash-dark">
              ${displayedVisitCost.toFixed(2)} MXN de traslado
            </strong>
          </div>
          <p className="mt-2 text-xs text-canwash-muted">
            Origen: {ORIGIN_ADDRESS}. Costo mínimo de traslado: $40 MXN.
            Después de 4 km se calcula a $10 MXN por kilómetro.
          </p>
        </div>
      )}
    </div>
  );
}
