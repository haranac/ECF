function Card({
  icon,
  title,
  value,
  text,
  opacity = 90,
  children,
  className = "",
}) {
  // =====================================================
  // OPACIDAD DEL FONDO
  // =====================================================

  const opacityClasses = {
    100: "bg-white",
    90: "bg-white/90",
    80: "bg-white/80",
    70: "bg-white/70",
    60: "bg-white/60",
    50: "bg-white/50",
    40: "bg-white/40",
  };

  const background =
    opacityClasses[opacity] ||
    "bg-white/90";


  return (
    <article
      className={`
        min-w-0
        rounded-2xl

        ${background}

        border
        border-white/40

        p-5

        shadow-lg
        shadow-canwash-dark/5

        backdrop-blur-sm

        transition
        duration-200

        hover:-translate-y-0.5
        hover:shadow-xl
        hover:shadow-canwash-dark/10

        ${className}
      `}
    >

      {/* ===============================================
          TARJETA DE ESTADÍSTICA
      ================================================ */}

      {(icon || title || value !== undefined) && (
        <div
          className="
            flex
            items-center
            gap-4
          "
        >

          {/* ICONO */}

          {icon && (
            <div
              className="
                grid
                h-12
                w-12
                shrink-0
                place-items-center

                rounded-xl

                bg-canwash-cream/80
                text-canwash-dark
              "
            >
              {icon}
            </div>
          )}


          {/* INFORMACIÓN */}

          <div className="min-w-0">

            {title && (
              <span
                className="
                  block
                  text-xs
                  text-canwash-muted
                "
              >
                {title}
              </span>
            )}


            {value !== undefined && (
              <h2
                className="
                  my-1
                  text-3xl
                  font-bold
                  text-canwash-dark
                "
              >
                {value}
              </h2>
            )}


            {text && (
              <small
                className="
                  block
                  text-xs
                  text-canwash-muted
                "
              >
                {text}
              </small>
            )}

          </div>

        </div>
      )}


      {/* ===============================================
          CONTENIDO PERSONALIZADO
      ================================================ */}

      {children && (
        <div
          className={
            icon || title || value !== undefined
              ? "mt-5"
              : ""
          }
        >
          {children}
        </div>
      )}

    </article>
  );
}


export default Card;