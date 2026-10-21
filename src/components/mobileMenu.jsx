import { Menu, X } from "lucide-react";

function MobileMenu({
  isOpen,
  onToggle,
  onClose,
}) {
  return (
    <>
      <button
        type="button"
        className="mobile-menu-button"
        onClick={onToggle}
        aria-label={
          isOpen
            ? "Cerrar menú"
            : "Abrir menú"
        }
      >
        {isOpen ? (
          <X size={25} />
        ) : (
          <Menu size={25} />
        )}
      </button>

      {isOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={onClose}
        />
      )}
    </>
  );
}

export default MobileMenu;