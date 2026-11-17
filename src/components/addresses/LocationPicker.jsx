import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button, Notice } from "../ui";

const ORIGIN = [19.8399021, -90.5336569];
const pin = L.divIcon({
  className: "",
  html: '<span class="cw-map-pin"></span>',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});
export default function LocationPicker({ value, onChange }) {
  const container = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const callback = useRef(onChange);
  const initial = useRef(value);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const mounted = useRef(false);
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
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    if (value?.latitud == null || value?.longitud == null) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    const coordinates = [value.latitud, value.longitud];
    if (!marker.current) {
      const item = L.marker(coordinates, { icon: pin, draggable: true }).addTo(
        map.current,
      );
      item.on("dragend", () => {
        const p = item.getLatLng();
        callback.current?.({ latitud: p.lat, longitud: p.lng });
      });
      marker.current = item;
    } else marker.current.setLatLng(coordinates);
    map.current.panTo(coordinates);
  }, [value?.latitud, value?.longitud]);
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
    </div>
  );
}
