import { useState } from "react";
import { rpc, message } from "../../services/api";
import { money, paymentTotals } from "../../lib/appointments";
import { Button, Modal, Notice } from "../ui";
export default function CancelDialog({ visit, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paid = paymentTotals(visit.pagos).net;
  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      await rpc("cancelar_visita", { p_id_visita: visit.id_visita });
      onSaved("Visita cancelada. El horario quedó disponible.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Cancelar visita" onClose={onClose} busy={busy}>
      <div className="space-y-5">
        <p className="text-sm leading-6 text-canwash-muted">
          Se cancelará la visita completa, incluyendo todas sus mascotas, y se
          liberará el horario.
        </p>
        <Notice tone="error">{error}</Notice>
        {paid > 0 && (
          <Notice>
            Hay {money(paid)} pagados. La cancelación no realiza devoluciones
            automáticamente; el personal debe gestionar y registrar el
            reembolso.
          </Notice>
        )}
        <div className="flex justify-end gap-3">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Conservar visita
          </Button>
          <Button tone="danger" onClick={cancel} busy={busy}>
            Confirmar cancelación
          </Button>
        </div>
      </div>
    </Modal>
  );
}
