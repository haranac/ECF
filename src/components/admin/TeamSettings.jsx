import { useState } from "react";
import { updateUser } from "../../services/admin";
import { message, rpc } from "../../services/api";
import { Button, Field, Notice } from "../ui";

function UserRow({ user, currentId, assignedId, onSaved }) {
  const [role, setRole] = useState(user.rol);
  const [active, setActive] = useState(user.activo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked =
    user.id_usuario === currentId || user.id_usuario === assignedId;
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await updateUser(user.id_usuario, { rol: role, activo: active });
      onSaved("Permisos de la cuenta actualizados.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={save}
      className="space-y-2 border-t border-canwash-light/40 py-4"
    >
      <fieldset
        disabled={busy || locked}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-40 flex-1 pb-2">
          <p className="font-semibold text-canwash-dark">{user.nombre}</p>
          <p className="mt-1 text-xs text-canwash-muted">
            {user.id_usuario === currentId
              ? "Tu cuenta administradora"
              : user.id_usuario === assignedId
                ? "Cuenta del estilista asignado"
                : "Cuenta del negocio"}
          </p>
        </div>
        <Field label="Rol">
          <select
            className="cw-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="CLIENTE">Cliente</option>
            <option value="EMPLEADO">Empleado</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm text-canwash-dark">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Activa
        </label>
        {!locked && (
          <Button type="submit" tone="secondary" busy={busy}>
            Guardar cuenta
          </Button>
        )}
      </fieldset>
      {user.id_usuario === assignedId && (
        <p className="text-xs text-canwash-muted">
          Asigna otra cuenta al estilista antes de desactivar o cambiar el rol
          de esta cuenta.
        </p>
      )}
      <Notice tone="error">{error}</Notice>
    </form>
  );
}
export default function TeamSettings({ users, stylists, currentId, onSaved }) {
  const stylist = stylists.find((s) => s.activo);
  const [assigned, setAssigned] = useState(stylist?.id_usuario || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await rpc("asignar_cuenta_estilista", { p_id_usuario: assigned });
      onSaved("Cuenta del estilista asociada. Su agenda ya está disponible.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <form onSubmit={save} className="cw-panel space-y-4">
        <h3 className="text-lg font-bold text-canwash-dark">
          Estilista principal
        </h3>
        <p className="text-sm leading-6 text-canwash-muted">
          Actualmente hay un estilista disponible. Asocia su cuenta para que
          pueda ver y gestionar sus visitas.
        </p>
        <Notice tone="error">{error}</Notice>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Cuenta del estilista" className="min-w-48 flex-1">
            <select
              className="cw-input"
              value={assigned}
              required
              disabled={busy}
              onChange={(e) => setAssigned(e.target.value)}
            >
              <option value="">Selecciona una cuenta activa</option>
              {users
                .filter(
                  (u) => u.activo && ["EMPLEADO", "ADMIN"].includes(u.rol),
                )
                .map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.nombre} ·{" "}
                    {u.rol === "ADMIN" ? "Administrador" : "Empleado"}
                  </option>
                ))}
            </select>
          </Field>
          <Button type="submit" busy={busy}>
            Asociar cuenta
          </Button>
        </div>
      </form>
      <section className="cw-panel">
        <h3 className="text-lg font-bold text-canwash-dark">
          Cuentas y permisos
        </h3>
        <p className="mt-1 text-sm text-canwash-muted">
          La cuenta de administrador se asigna aquí; no se puede elegir durante
          el registro.
        </p>
        {users.map((u) => (
          <UserRow
            key={`${u.id_usuario}:${u.rol}:${u.activo}:${stylist?.id_usuario}`}
            user={u}
            currentId={currentId}
            assignedId={stylist?.id_usuario}
            onSaved={onSaved}
          />
        ))}
      </section>
    </div>
  );
}
