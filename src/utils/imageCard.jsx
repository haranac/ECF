import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";


function ImageCard({
  isOpen,
  onClose,
  title,
  images = [],
}) {
  const [
    currentImage,
    setCurrentImage,
  ] = useState(0);


  // =====================================================
  // IMÁGENES VÁLIDAS
  // =====================================================

  const validImages =
    images
      .filter(Boolean)
      .slice(0, 3);


  // =====================================================
  // REINICIAR AL ABRIR
  // =====================================================

  useEffect(() => {
    if (isOpen) {
      setCurrentImage(0);
    }
  }, [isOpen]);


  // =====================================================
  // BLOQUEAR SCROLL DEL FONDO
  // =====================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";


    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen]);


  // =====================================================
  // CERRAR CON ESC
  // =====================================================

  useEffect(() => {
    if (!isOpen) {
      return;
    }


    const handleKeyDown = (event) => {
      if (
        event.key === "Escape"
      ) {
        onClose?.();
      }
    };


    window.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isOpen,
    onClose,
  ]);


  // =====================================================
  // NAVEGACIÓN
  // =====================================================

  const previousImage = () => {
    setCurrentImage(
      (current) =>
        current === 0
          ? validImages.length - 1
          : current - 1
    );
  };


  const nextImage = () => {
    setCurrentImage(
      (current) =>
        current ===
        validImages.length - 1
          ? 0
          : current + 1
    );
  };


  // =====================================================
  // NO MOSTRAR
  // =====================================================

  if (!isOpen) {
    return null;
  }


  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[200]

        flex
        items-center
        justify-center

        bg-[#102d2c]/70

        p-4

        backdrop-blur-[3px]

        sm:p-6
      "

      onMouseDown={
        onClose
      }
    >

      {/* =================================================
          TARJETA
      ================================================== */}

      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}

        onMouseDown={(event) =>
          event.stopPropagation()
        }

        className="
          relative

          w-full
          max-w-4xl

          overflow-hidden

          rounded-[2rem]

          border
          border-white/40

          bg-[#fffaf2]

          p-5

          shadow-2xl

          sm:p-7
          lg:p-8
        "
      >

        {/* ===============================================
            CABECERA
        ================================================ */}

        <header
          className="
            flex
            items-start
            justify-between
            gap-5
          "
        >

          <div>

            <span
              className="
                text-[10px]
                font-bold
                tracking-[0.2em]

                text-[#14847f]
              "
            >
              CAN WASH
            </span>


            <h2
              className="
                mt-1

                font-serif

                text-2xl
                font-bold

                text-[#30231c]

                sm:text-3xl
              "
            >
              {title}
            </h2>

          </div>


          {/* CERRAR */}

          <button
            type="button"

            onClick={
              onClose
            }

            aria-label="Cerrar"

            className="
              grid
              h-11
              w-11
              shrink-0
              place-items-center

              rounded-full

              bg-[#dcefed]

              text-[#153b39]

              transition
              duration-300

              hover:rotate-90
              hover:bg-[#14847f]
              hover:text-white
            "
          >
            <X size={21} />
          </button>

        </header>


        {/* ===============================================
            SIN IMÁGENES
        ================================================ */}

        {validImages.length === 0 && (
          <div
            className="
              mt-7

              grid
              min-h-72
              place-items-center

              rounded-2xl

              bg-[#dcefed]/40

              text-sm
              text-[#687877]
            "
          >
            No hay imágenes disponibles.
          </div>
        )}


        {/* ===============================================
            IMAGEN PRINCIPAL
        ================================================ */}

        {validImages.length > 0 && (
          <>
            <div
              className="
                relative

                mt-7

                overflow-hidden

                rounded-2xl

                bg-[#dcefed]/30
              "
            >

              <img
                src={
                  validImages[
                    currentImage
                  ]
                }

                alt={`${title} ${
                  currentImage + 1
                }`}

                className="
                  h-[280px]
                  w-full

                  object-cover

                  sm:h-[380px]
                  lg:h-[450px]
                "
              />


              {/* =========================================
                  FLECHAS
              ========================================== */}

              {validImages.length > 1 && (
                <>
                  <button
                    type="button"

                    onClick={
                      previousImage
                    }

                    aria-label="Imagen anterior"

                    className="
                      absolute
                      left-3
                      top-1/2

                      grid
                      h-11
                      w-11
                      -translate-y-1/2
                      place-items-center

                      rounded-full

                      bg-[#fffaf2]/90

                      text-[#153b39]

                      shadow-lg
                      backdrop-blur-md

                      transition

                      hover:scale-105
                      hover:bg-[#14847f]
                      hover:text-white
                    "
                  >
                    <ChevronLeft
                      size={22}
                    />
                  </button>


                  <button
                    type="button"

                    onClick={
                      nextImage
                    }

                    aria-label="Imagen siguiente"

                    className="
                      absolute
                      right-3
                      top-1/2

                      grid
                      h-11
                      w-11
                      -translate-y-1/2
                      place-items-center

                      rounded-full

                      bg-[#fffaf2]/90

                      text-[#153b39]

                      shadow-lg
                      backdrop-blur-md

                      transition

                      hover:scale-105
                      hover:bg-[#14847f]
                      hover:text-white
                    "
                  >
                    <ChevronRight
                      size={22}
                    />
                  </button>
                </>
              )}


              {/* =========================================
                  CONTADOR
              ========================================== */}

              {validImages.length > 1 && (
                <div
                  className="
                    absolute
                    bottom-3
                    right-3

                    rounded-full

                    bg-[#153b39]/80

                    px-3
                    py-1.5

                    text-xs
                    font-semibold
                    text-white

                    backdrop-blur-md
                  "
                >
                  {currentImage + 1}
                  {" / "}
                  {validImages.length}
                </div>
              )}

            </div>


            {/* ===============================================
                MINIATURAS
            ================================================ */}

            {validImages.length > 1 && (
              <div
                className="
                  mt-4

                  grid
                  grid-cols-3
                  gap-3
                "
              >

                {validImages.map(
                  (
                    image,
                    index
                  ) => (
                    <button
                      key={index}

                      type="button"

                      onClick={() =>
                        setCurrentImage(
                          index
                        )
                      }

                      className={`
                        overflow-hidden

                        rounded-xl

                        border-2

                        transition
                        duration-300

                        ${
                          currentImage ===
                          index
                            ? `
                              border-[#14847f]
                              opacity-100
                            `
                            : `
                              border-transparent
                              opacity-60

                              hover:opacity-100
                            `
                        }
                      `}
                    >
                      <img
                        src={image}

                        alt={`${title} miniatura ${
                          index + 1
                        }`}

                        className="
                          h-20
                          w-full

                          object-cover

                          sm:h-24
                        "
                      />
                    </button>
                  )
                )}

              </div>
            )}
          </>
        )}

      </section>

    </div>
  );
}


export default ImageCard;