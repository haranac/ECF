import {
  Menu,
  X,
} from "lucide-react";


function MobileMenu({
  isOpen,
  onToggle,
  onClose,
}) {
  return (
    <>
      {/* =================================================
          OVERLAY
          Solo aparece en móvil cuando el menú está abierto
      ================================================== */}

      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"

          onClick={onClose}

          className="
            fixed
            inset-0
            z-40
            bg-canwash-dark/40
            backdrop-blur-[2px]

            md:hidden
          "
        />
      )}


      {/* =================================================
          BOTÓN FLOTANTE
          Solo aparece en móvil
      ================================================== */}

      <button
        type="button"

        onClick={onToggle}

        aria-label={
          isOpen
            ? "Cerrar menú"
            : "Abrir menú"
        }

        aria-expanded={isOpen}

        className="
          fixed
          bottom-5
          right-5
          z-[60]

          grid
          h-14
          w-14
          place-items-center

          rounded-full
          border
          border-white/10

          bg-canwash-dark
          text-white

          shadow-xl
          shadow-canwash-dark/30

          transition
          duration-200

          hover:-translate-y-0.5
          hover:bg-canwash

          active:translate-y-0
          active:scale-95

          focus:outline-none
          focus-visible:ring-4
          focus-visible:ring-canwash/30

          md:hidden
        "
      >

        {isOpen ? (
          <X size={25} />
        ) : (
          <Menu size={25} />
        )}

      </button>
    </>
  );
}


export default MobileMenu;