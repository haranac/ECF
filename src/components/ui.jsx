import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";

export function Button({
  children,
  busy = false,
  tone = "primary",
  className = "",
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      className={`cw-button cw-button-${tone} ${className}`}
    >
      {busy && <LoaderCircle size={17} className="animate-spin" />} {children}
    </button>
  );
}
export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="cw-label">{label}</span>
      {children}
      {hint && (
        <span className="block text-xs leading-5 text-canwash-muted">
          {hint}
        </span>
      )}
    </label>
  );
}
export function Notice({ children, tone = "info" }) {
  if (!children) return null;
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`cw-notice ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-canwash-light bg-canwash-cream/50 text-canwash-dark"}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-canwash-light px-6 py-10 text-center">
      <p className="font-semibold text-canwash-dark">{title}</p>
      {children && (
        <div className="mx-auto mt-2 max-w-lg text-sm leading-6 text-canwash-muted">
          {children}
        </div>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}) {
  const panel = useRef(null);
  const close = useRef(onClose);
  const blocked = useRef(busy);
  useEffect(() => {
    close.current = onClose;
    blocked.current = busy;
  }, [onClose, busy]);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const key = (event) => {
      if (event.key === "Escape" && !blocked.current) close.current();
      if (event.key === "Tab") {
        const controls = [
          ...(panel.current?.querySelectorAll(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
          ) || []),
        ].filter((node) => node.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-canwash-dark/55 p-3 py-6 backdrop-blur-sm sm:p-8">
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full rounded-3xl bg-white shadow-2xl outline-none ${wide ? "max-w-4xl" : "max-w-2xl"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-canwash-light/40 px-5 py-5 sm:px-7">
          <h2 className="text-xl font-bold text-canwash-dark">{title}</h2>
          <button
            type="button"
            aria-label="Cerrar ventana"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-1 text-canwash-muted hover:bg-canwash-background disabled:opacity-40"
          >
            <X size={22} />
          </button>
        </div>
        <div className="p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}
