# Can Wash

Sistema de mascotas y visitas de estética canina y felina. React, Vite,
Tailwind, Leaflet/OpenStreetMap y Supabase.

## Iniciar en local

Con Docker Desktop abierto, desde la carpeta del proyecto:

```powershell
npm.cmd install
npx.cmd supabase start
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Abrir [la aplicación](http://127.0.0.1:5173/) y
[Studio local](http://127.0.0.1:54323/). Usar Vite para procesar React;
Live Server no sustituye este paso.

`.env.local`, excluido de Git, debe indicar
`VITE_SUPABASE_URL=http://127.0.0.1:54321` y la `VITE_SUPABASE_ANON_KEY` local
obtenida con `npx.cmd supabase status`. Nunca usar `service_role` en el frontend.
El `.env` original se conserva; `.env.local` tiene prioridad. Reiniciar Vite
al cambiar estas variables.

Las migraciones 000000 a 000009 ya se aplicaron en la instancia local de este
equipo. Las nuevas se aplican con `npx.cmd supabase migration up`.
La vinculación remota no sincroniza bases automáticamente. Consultar
[LOCAL_SETUP.txt](supabase/LOCAL_SETUP.txt) antes de preparar un despliegue remoto.

## Recorrido por rol

- **Cliente:** completar perfil y mascotas; guardar domicilio con punto en el
  mapa; esperar la validación del recorrido; elegir mascotas, servicios,
  domicilio y horario; revisar cotización y confirmar. Mis citas permite ver
  pagos e historial, cancelar o reprogramar la visita completa.
- **Empleado:** validar kilómetros por calles en Recorridos; gestionar agenda,
  bloqueos y estados de atención; valorar mascotas y registrar la aceptación
  del importe; registrar, validar o rechazar pagos y reembolsos.
- **Administrador:** herramientas operativas más tarifas, descuentos, horarios,
  cierres, reglas de tiempo, origen y cuentas en Administración. Asociar la
  cuenta del estilista principal para que pueda gestionar sus visitas.

El administrador se asigna manualmente; el registro público no concede ese rol.

## Reglas y límites actuales

Cada visita agrupa mascotas, un traslado, descuento, total y pagos. La base
calcula importes y tiempos y comprueba de nuevo el horario al confirmar.
Reintentar la misma solicitud no crea otra reserva.

Configuración inicial: un estilista; 08:00 a 16:00 salvo miércoles; margen de
60 minutos e inicios cada 15. La duración incluye baño, extras y visita antes
del descuento, a $100 por hora. El descuento afecta solo al baño y a la visita.
Las reservas conservan sus precios y duración aunque cambie el catálogo.
Las valoraciones que aumenten el tiempo también deben caber en la agenda.
Los rangos de peso son provisionales. Más detalles en
[APPOINTMENTS.txt](supabase/APPOINTMENTS.txt).

El kilometraje todavía requiere validación manual del personal. OpenStreetMap
muestra el punto, pero no calcula una ruta por calles. Cambiar domicilio u
origen exige validar de nuevo. Los pagos son registros del negocio; no ejecutan
operaciones bancarias.

Las citas antiguas se conservan para consulta y conciliación. Una cita heredada
sin duración bloquea la oferta automática de su día hasta revisarse.

## Verificación y demostración

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run db:test
```

Las pruebas de integración usan exclusivamente Supabase local y eliminan sus
datos temporales. Cubren permisos, tarifas, descuentos, reservas simultáneas,
reprogramación, horarios, valoraciones, bloqueos y pagos. Las pruebas de fechas
cubren el día local frente a UTC y la conversión de la hora del negocio.

Para crear voluntariamente una demostración persistente en una instancia local
sin estilista asignado: `npm.cmd run db:demo`. Crea tres cuentas y datos ficticios;
la contraseña aleatoria queda en `supabase/backups/demo-access.json`, fuera de
Git. Al repetir el comando reutiliza la demostración y no reemplaza cuentas.
El programa rechaza cualquier destino distinto de la URL local indicada arriba.

## Organización

Los componentes se separan en `pets`, `addresses`, `appointments`, `staff` y
`admin`. `src/services` reúne el acceso a Supabase y `src/lib/appointments.js`
centraliza fechas e importes. Las reglas de reserva permanecen en las funciones
de la base. Los cambios se guardaron por etapas en `codex/sistema-citas`.
