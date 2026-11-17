// Synthetic fixtures for the local application. Never accepts a remote target.
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { dateKey } from "../../src/lib/appointments.js";

async function prepareDemo() {
  const command =
    process.platform === "win32"
      ? "node_modules\\.bin\\supabase.cmd status --output json"
      : "./node_modules/.bin/supabase status --output json";
  const status = JSON.parse(
    execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
  );
  const url = "http://127.0.0.1:54321";
  assert.equal(
    status.API_URL,
    url,
    "La demostración solo admite Supabase local.",
  );
  assert.ok(status.SERVICE_ROLE_KEY);
  const settings = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
  assert.equal(
    settings.VITE_SUPABASE_URL,
    url,
    "La aplicación debe apuntar a la base local.",
  );
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const root = createClient(url, status.SERVICE_ROLE_KEY, options);
  const check = async (promise) => {
    const r = await promise;
    if (r.error) throw new Error(r.error.message);
    return r.data;
  };
  const file = "supabase/backups/demo-access.json";
  if (existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(saved.url, url);
    assert.equal(
      saved.complete,
      true,
      "La preparación anterior quedó incompleta; revisar el archivo local antes de reintentar.",
    );
    for (const account of saved.accounts)
      await check(root.auth.admin.getUserById(account.id));
    console.log("La demostración local ya existe. Accesos: " + file);
    return;
  }
  // Do not replace a pre-existing stylist/account or change actual business data.
  const stylist = await check(
    root.from("estilistas").select("*").eq("activo", true).single(),
  );
  assert.equal(
    stylist.id_usuario,
    null,
    "El estilista ya tiene una cuenta; no se reemplaza para crear la demostración.",
  );
  const { users } = await check(
    root.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  );
  assert.ok(
    !users.some((u) => u.email?.endsWith(".demo@canwash.test")),
    "Ya hay cuentas de demostración; no se reemplazan.",
  );
  const access = {
    url,
    password: randomBytes(18).toString("base64url"),
    accounts: [],
    complete: false,
  };
  mkdirSync("supabase/backups", { recursive: true });
  const persist = () =>
    writeFileSync(file, JSON.stringify(access, null, 2) + "\n");
  const apis = {};
  persist();
  for (const [role, name, email] of [
    ["CLIENTE", "Cliente de demostración", "cliente.demo@canwash.test"],
    ["EMPLEADO", "Estilista de demostración", "estilista.demo@canwash.test"],
    ["ADMIN", "Administrador de demostración", "admin.demo@canwash.test"],
  ]) {
    const { user } = await check(
      root.auth.admin.createUser({
        email,
        password: access.password,
        email_confirm: true,
        user_metadata: { nombre: name, rol: role, canwash_demo: true },
      }),
    );
    access.accounts.push({ id: user.id, role, email });
    persist();
    if (role === "ADMIN")
      await check(
        root
          .from("usuarios")
          .update({ rol: "ADMIN" })
          .eq("id_usuario", user.id),
      );
    const api = createClient(url, settings.VITE_SUPABASE_ANON_KEY, options);
    await check(
      api.auth.signInWithPassword({ email, password: access.password }),
    );
    apis[role] = api;
  }
  await check(
    apis.ADMIN.rpc("asignar_cuenta_estilista", {
      p_id_usuario: access.accounts.find((a) => a.role === "EMPLEADO").id,
    }),
  );
  const client = await check(
    apis.CLIENTE.from("clientes")
      .insert({
        id_usuario: access.accounts[0].id,
        nombre: "Cliente de demostración",
        telefono: "0000000000",
        email: access.accounts[0].email,
        notas: "Datos sintéticos, solo para probar la aplicación local.",
      })
      .select()
      .single(),
  );
  const pets = await check(
    apis.CLIENTE.from("mascotas")
      .insert(
        [
          {
            nombre: "Luna",
            especie: "PERRO",
            raza: "Mestizo",
            peso_kg: 4,
            longitud_pelo: "CORTO",
            tipo_capa: "SIMPLE",
            estado_pelaje: "NORMAL",
          },
          {
            nombre: "Bruno",
            especie: "PERRO",
            raza: "Poodle",
            peso_kg: 10,
            longitud_pelo: "LARGO",
            tipo_capa: "SIMPLE",
            estado_pelaje: "NORMAL",
          },
          {
            nombre: "Milo",
            especie: "GATO",
            raza: "Mestizo",
            peso_kg: 4,
            longitud_pelo: "LARGO",
            tipo_capa: "SIMPLE",
            estado_pelaje: "ENREDADO",
          },
        ].map((p) => ({
          ...p,
          id_cliente: client.id_cliente,
          notas: "Mascota de demostración local.",
        })),
      )
      .select(),
  );
  const addresses = await check(
    apis.CLIENTE.from("direcciones_cliente")
      .insert(
        [
          {
            direccion: "Domicilio de demostración, zona Centro",
            colonia: "Centro (ejemplo)",
            latitud: 19.845,
            longitud: -90.53,
          },
          {
            direccion: "Segundo domicilio de demostración",
            colonia: "Santa Ana (ejemplo)",
            latitud: 19.839,
            longitud: -90.525,
          },
        ].map((a) => ({ ...a, id_cliente: client.id_cliente })),
      )
      .select(),
  );
  await check(
    apis.EMPLEADO.rpc("validar_distancia_direccion", {
      p_id_direccion: addresses[0].id_direccion,
      p_kilometros: 2.5,
    }),
  );
  const inputs = [
    [
      {
        id_mascota: pets[0].id_mascota,
        paquete: "BANO_INTEGRAL",
        extras: ["ASUNTOL"],
      },
      { id_mascota: pets[1].id_mascota, paquete: "BANO_INTEGRAL", extras: [] },
    ],
    [
      {
        id_mascota: pets[2].id_mascota,
        paquete: "BANO_DESENREDADO",
        extras: [],
      },
    ],
  ];
  const cfg = await check(
    apis.CLIENTE.from("configuracion_negocio").select("*").single(),
  );
  let day = new Date(dateKey(new Date(), cfg.zona_horaria) + "T12:00:00Z");
  access.visits = [];
  for (const [index, p_mascotas] of inputs.entries()) {
    let slots = [];
    for (let tries = 0; tries < 30 && !slots.length; tries++) {
      day.setUTCDate(day.getUTCDate() + 1);
      slots = await check(
        apis.CLIENTE.rpc("horarios_disponibles", {
          p_fecha: day.toISOString().slice(0, 10),
          p_id_direccion: addresses[0].id_direccion,
          p_mascotas,
        }),
      );
    }
    assert.ok(slots.length, "No hay un día disponible para los ejemplos.");
    const quote = await check(
      apis.CLIENTE.rpc("cotizar_visita", {
        p_id_direccion: addresses[0].id_direccion,
        p_mascotas,
      }),
    );
    const id = await check(
      apis.CLIENTE.rpc("reservar_visita", {
        p_inicio: slots[0].inicio,
        p_id_direccion: addresses[0].id_direccion,
        p_mascotas,
        p_total_esperado: quote.total,
        p_duracion_esperada: quote.duracion_minutos,
        p_solicitud: randomUUID(),
      }),
    );
    access.visits.push(id);
    persist();
    if (index === 0) {
      await check(
        apis.EMPLEADO.rpc("cambiar_estado_visita", {
          p_id_visita: id,
          p_estado: "CONFIRMADA",
        }),
      );
      await check(
        apis.EMPLEADO.rpc("registrar_pago_visita", {
          p_id_visita: id,
          p_monto: 100,
          p_tipo: "ANTICIPO",
          p_metodo: "EFECTIVO",
          p_estado: "VALIDADO",
          p_referencia: "Ejemplo local; no representa un cobro real",
        }),
      );
    }
  }
  access.complete = true;
  persist();
  console.log(
    "Demostración creada exclusivamente en la base local: tres cuentas, tres mascotas, dos domicilios y dos visitas.",
  );
  console.log("Correos y contraseña en " + file + " (excluido de Git).");
}

await prepareDemo();
