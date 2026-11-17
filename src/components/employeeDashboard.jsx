import { useCallback, useState } from "react";
import useQuery from "../hooks/useQuery";
import { loadStaffData } from "../services/staff";
import { message, rpc } from "../services/api";
import { stateLabels } from "../lib/appointments";
import DashboardLayout from "./DashboardLayout";
import { Notice } from "./ui";
import AdminPanel from "./admin/AdminPanel";
import StaffAgenda from "./staff/StaffAgenda";
import StaffPayments from "./staff/StaffPayments";
import RouteValidationPanel from "./staff/RouteValidationPanel";
import PaymentDialog from "./staff/PaymentDialog";
import ValuationDialog from "./staff/ValuationDialog";
import ActionDialog from "./staff/ActionDialog";
import BlockDialog from "./staff/BlockDialog";
import VisitDetail from "./appointments/VisitDetail";
import CancelDialog from "./appointments/CancelDialog";
import RescheduleDialog from "./appointments/RescheduleDialog";

const titles = {
  citas: "Agenda del estilista",
  pagos: "Pagos y reembolsos",
  recorridos: "Validar recorridos",
  empleados: "Administración",
};
export default function EmployeeDashboard({
  user,
  onLogout,
  onProfile,
  initialView = "citas",
}) {
  const [view, setView] = useState(titles[initialView] ? initialView : "citas");
  const [dialog, setDialog] = useState(null);
  const [success, setSuccess] = useState("");
  const load = useCallback(() => loadStaffData(), []);
  const query = useQuery(load);
  const {
    visits = [],
    payments = [],
    blocks = [],
    stylists = [],
    business,
    legacy = [],
  } = query.data || {};
  const visit = visits.find((v) => v.id_visita === dialog?.id);
  const saved = (text) => {
    setSuccess(text);
    setDialog(null);
    query.reload();
  };
  const action = (type, id, target) => {
    setSuccess("");
    setDialog({ type, id, target });
  };
  const assigned = stylists.some(
    (s) => s.activo && s.id_usuario === user.id_usuario,
  );
  return (
    <DashboardLayout
      user={user}
      view={view}
      onChangeView={(v) => {
        setSuccess("");
        setView(v);
      }}
      onProfile={onProfile}
      onLogout={onLogout}
      onRefresh={query.reload}
      loading={query.loading}
      title={titles[view]}
    >
      <div className="space-y-5">
        <Notice tone="error">{query.error && message(query.error)}</Notice>
        <Notice tone="success">{success}</Notice>
        {query.loading && !query.data && (
          <p className="text-sm text-canwash-muted">Cargando agenda…</p>
        )}
        {query.data && user.rol === "EMPLEADO" && !assigned && (
          <Notice>
            El administrador debe asociar tu cuenta al estilista para que puedas
            ver y gestionar sus visitas. Mientras tanto puedes revisar los
            recorridos pendientes.
          </Notice>
        )}
        {view === "citas" && (
          <StaffAgenda
            visits={visits}
            blocks={blocks}
            legacy={legacy}
            zone={business?.zona_horaria}
            onAction={action}
            onBlock={(date) => setDialog({ type: "block", date })}
            onUnblock={(block) => setDialog({ type: "unblock", block })}
          />
        )}
        {view === "pagos" && (
          <StaffPayments
            payments={payments}
            visits={visits}
            onOpen={(id) => action("payment", id)}
          />
        )}
        {view === "recorridos" && <RouteValidationPanel />}
        {view === "empleados" && user.rol === "ADMIN" && (
          <AdminPanel user={user} onChanged={query.reload} />
        )}
      </div>
      {visit && dialog.type === "details" && (
        <VisitDetail visit={visit} onClose={() => setDialog(null)} />
      )}
      {visit && dialog.type === "cancel" && (
        <CancelDialog
          visit={visit}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {visit && dialog.type === "reschedule" && (
        <RescheduleDialog
          visit={visit}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {visit && dialog.type === "payment" && (
        <PaymentDialog
          visit={visit}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {visit && dialog.type === "valuation" && (
        <ValuationDialog
          visit={visit}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {visit && dialog.type === "state" && (
        <ActionDialog
          title={`${stateLabels[dialog.target]}: confirmar cambio`}
          onClose={() => setDialog(null)}
          onSaved={saved}
          action={() =>
            rpc("cambiar_estado_visita", {
              p_id_visita: visit.id_visita,
              p_estado: dialog.target,
            })
          }
        >
          Se actualizará el estado de la visita completa y sus mascotas.
        </ActionDialog>
      )}
      {dialog?.type === "block" && (
        <BlockDialog
          date={dialog.date}
          zone={business?.zona_horaria}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {dialog?.type === "unblock" && (
        <ActionDialog
          title="Liberar bloqueo"
          onClose={() => setDialog(null)}
          onSaved={saved}
          action={() =>
            rpc("liberar_bloqueo", { p_id_agenda: dialog.block.id_agenda })
          }
        >
          El horario de «{dialog.block.motivo}» volverá a ofrecerse según la
          disponibilidad de la agenda.
        </ActionDialog>
      )}
    </DashboardLayout>
  );
}
