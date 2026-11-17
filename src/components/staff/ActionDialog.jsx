import { useState } from "react";
import { Button, Modal, Notice } from "../ui";
import { message } from "../../services/api";
export default function ActionDialog({
  title,
  children,
  action,
  onClose,
  onSaved,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      await action();
      onSaved("Operación guardada.");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <div className="space-y-5">
        <p className="text-sm leading-6 text-canwash-muted">{children}</p>
        <Notice tone="error">{error}</Notice>
        <div className="flex justify-end gap-3">
          <Button tone="secondary" onClick={onClose} disabled={busy}>
            Volver
          </Button>
          <Button busy={busy} onClick={run}>
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
