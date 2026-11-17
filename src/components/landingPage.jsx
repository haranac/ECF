import { useEffect, useState } from "react";

import {
  ArrowRight,
  Bath,
  CalendarDays,
  Heart,
  Menu,
  PawPrint,
  Scissors,
  ShieldCheck,
  X,
} from "lucide-react";

import ImageCard from "../utils/imageCard";

import landscape from "../assets/canwash-landscape.png";
import catImage from "../assets/canwash-cat.png";
import dogImage from "../assets/canwash-dog.png";

function LandingPage({ onLogin, onRegister }) {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showBenefits, setShowBenefits] = useState(true);

  // null | "cat" | "dog"
  const [selectedPet, setSelectedPet] = useState(null);

  // =====================================================
  // OCULTAR BENEFICIOS AL HACER SCROLL
  // =====================================================

  useEffect(() => {
    const handleScroll = () => {
      setShowBenefits(window.scrollY < 80);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // =====================================================
  // CERRAR MENÚ
  // =====================================================

  const closeMenu = () => {
    setMobileMenuOpen(false);
  };

  // =====================================================
  // SCROLL SUAVE
  // =====================================================

  const scrollTo = (section) => {
    closeMenu();

    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // =====================================================
  // ABRIR TARJETA DE MASCOTA
  // =====================================================

  const openCatCard = () => {
    setSelectedPet("cat");
  };

  const openDogCard = () => {
    setSelectedPet("dog");
  };

  const closePetCard = () => {
    setSelectedPet(null);
  };

  // =====================================================
  // DATOS DEL MODAL
  // =====================================================

  const modalTitle =
    selectedPet === "cat"
      ? "Estética felina"
      : selectedPet === "dog"
        ? "Estética canina"
        : "";

  const modalImages =
    selectedPet === "cat"
      ? [catImage, catImage, catImage]
      : selectedPet === "dog"
        ? [dogImage, dogImage, dogImage]
        : [];

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <div
      className="
        min-h-screen
        overflow-x-hidden
        bg-[#fffaf2]
        text-[#30231c]
      "
    >
      {/* =================================================
          HERO
      ================================================== */}

      <section
        id="inicio"
        className="
          relative
          min-h-[900px]
          overflow-hidden
          bg-[#fffaf2]

          lg:min-h-screen
        "
      >
        {/* ===============================================
            HEADER
        ================================================ */}

        <header
          className="
            relative
            z-50

            mx-auto

            flex
            h-24
            w-full
            max-w-[1500px]

            items-center
            justify-between

            px-5

            sm:px-8
            lg:px-12
          "
        >
          {/* LOGO */}

          <button
            type="button"
            onClick={() => scrollTo("inicio")}
            className="
              group
              flex
              items-center
              gap-3
              text-left
            "
          >
            <div
              className="
                grid
                h-12
                w-12
                place-items-center

                text-[#14847f]

                transition
                duration-300

                group-hover:scale-110
              "
            >
              <PawPrint size={43} strokeWidth={1.8} />
            </div>

            <div>
              <strong
                className="
                  block

                  font-serif
                  text-2xl
                  font-bold
                  leading-none
                  tracking-tight

                  text-[#102d2c]

                  sm:text-3xl
                "
              >
                Can Wash
              </strong>

              <span
                className="
                  mt-1
                  block

                  text-[8px]
                  font-bold
                  tracking-[0.2em]

                  text-[#102d2c]

                  sm:text-[9px]
                "
              >
                ESTÉTICA CANINA Y FELINA
              </span>
            </div>
          </button>

          {/* =============================================
              NAVEGACIÓN DESKTOP
          ============================================== */}

          <nav
            className="
              hidden
              items-center
              gap-8

              text-sm
              font-semibold

              lg:flex
            "
          >
            <NavButton onClick={() => scrollTo("inicio")}>Inicio</NavButton>

            <NavButton onClick={() => scrollTo("servicios")}>
              Servicios
            </NavButton>

            <NavButton onClick={() => scrollTo("nosotros")}>Nosotros</NavButton>

            <NavButton onClick={() => scrollTo("contacto")}>Contacto</NavButton>
          </nav>

          {/* =============================================
              LOGIN / REGISTRO
          ============================================== */}

          <div
            className="
              hidden
              items-center
              gap-5

              lg:flex
            "
          >
            <button
              type="button"
              onClick={onLogin}
              className="
                px-3
                py-2

                text-sm
                font-semibold

                text-[#30231c]

                transition
                duration-300

                hover:text-[#14847f]
              "
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={onRegister}
              className="
                flex
                items-center
                gap-3

                rounded-full

                bg-[#14847f]

                px-6
                py-3

                text-sm
                font-semibold
                text-white

                shadow-lg
                shadow-[#14847f]/20

                transition
                duration-300

                hover:-translate-y-0.5
                hover:bg-[#106f6b]
                hover:shadow-xl
              "
            >
              Registrarse
              <ArrowRight size={19} />
            </button>

            <button
              type="button"
              onClick={onRegister}
              aria-label="Registrarse"
              className="
                grid
                h-12
                w-12
                place-items-center

                rounded-full

                bg-[#14847f]
                text-white

                shadow-md

                transition
                duration-300

                hover:scale-105
                hover:bg-[#106f6b]
              "
            >
              <PawPrint size={24} />
            </button>
          </div>

          {/* =============================================
              BOTÓN MENÚ MÓVIL
          ============================================== */}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label="Abrir menú"
            className="
              grid
              h-11
              w-11
              place-items-center

              rounded-xl

              bg-[#14847f]

              text-white

              shadow-md

              lg:hidden
            "
          >
            {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </header>

        {/* ===============================================
            MENÚ MÓVIL
        ================================================ */}

        {mobileMenuOpen && (
          <div
            className="
              absolute
              left-4
              right-4
              top-20
              z-40

              rounded-2xl

              border
              border-[#bcd9d6]

              bg-[#fffaf2]/95

              p-5

              shadow-2xl

              backdrop-blur-xl

              lg:hidden
            "
          >
            <nav
              className="
                flex
                flex-col
                gap-1
              "
            >
              <MobileNavButton onClick={() => scrollTo("inicio")}>
                Inicio
              </MobileNavButton>

              <MobileNavButton onClick={() => scrollTo("servicios")}>
                Servicios
              </MobileNavButton>

              <MobileNavButton onClick={() => scrollTo("nosotros")}>
                Nosotros
              </MobileNavButton>

              <MobileNavButton onClick={() => scrollTo("contacto")}>
                Contacto
              </MobileNavButton>
            </nav>

            <div
              className="
                mt-4

                grid
                grid-cols-1
                gap-2

                border-t
                border-[#bcd9d6]

                pt-4
              "
            >
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onLogin();
                }}
                className="
                  rounded-xl

                  px-4
                  py-3

                  text-sm
                  font-semibold

                  text-[#30231c]

                  transition

                  hover:bg-[#dcefed]
                "
              >
                Iniciar sesión
              </button>

              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onRegister();
                }}
                className="
                  flex
                  items-center
                  justify-center
                  gap-2

                  rounded-xl

                  bg-[#14847f]

                  px-4
                  py-3

                  text-sm
                  font-semibold
                  text-white
                "
              >
                Registrarse
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ===============================================
            TEXTO PRINCIPAL
        ================================================ */}

        <div
          className="
            relative
            z-20

            mx-auto

            flex
            max-w-[1400px]
            flex-col
            items-center

            px-5
            pt-10

            text-center

            sm:px-8
            sm:pt-14

            lg:pt-12
          "
        >
          <h1
            className="
              max-w-5xl

              font-serif

              text-5xl
              font-medium
              leading-[0.95]
              tracking-[-0.04em]

              text-[#30231c]

              sm:text-6xl
              md:text-7xl
              lg:text-[90px]
            "
          >
            Estética profesional
            <span
              className="
                block
                text-[#14847f]
              "
            >
              para tu mejor amigo
            </span>
          </h1>

          <p
  className="
    mt-6
    max-w-2xl

    text-base
    font-medium
    leading-7

    text-[#687877]

    [text-shadow:_-0.5px_-0.5px_0_#fff,_0.5px_-0.5px_0_#fff,_-0.5px_0.5px_0_#fff,_0.5px_0.5px_0_#fff]

    sm:text-lg
  "
>
  Baños, cortes y cuidado
  especializado para perros
  y gatos.
</p>

          <button
            type="button"
            onClick={onRegister}
            className="
              mt-8

              flex
              items-center
              gap-4

              rounded-full

              bg-[#14847f]

              px-8
              py-4

              text-base
              font-semibold
              text-white

              shadow-lg
              shadow-[#14847f]/25

              transition
              duration-300

              hover:-translate-y-1
              hover:bg-[#106f6b]
              hover:shadow-xl
            "
          >
            Agendar cita
            <ArrowRight size={21} />
          </button>
        </div>

        {/* ===============================================
            PAISAJE
        ================================================ */}

        <div
          className="
            pointer-events-none

            absolute

            bottom-24
            left-0
            right-0

            z-0

            h-[55%]

            overflow-hidden

            sm:h-[58%]
            lg:h-[62%]
          "
        >
          <img
            src={landscape}
            alt=""
            aria-hidden="true"
            draggable="false"
            className="
              h-full
              w-full

              select-none

              object-cover
              object-bottom
            "
          />
        </div>

        {/* ===============================================
            PERRO Y GATO
        ================================================ */}

        <div
          className="
            absolute

            bottom-[115px]
            right-[2%]

            z-20

            flex
            items-end

            sm:bottom-[118px]
            sm:right-[4%]

            md:right-[5%]

            lg:bottom-[125px]
            lg:right-[6%]

            xl:right-[7%]

            2xl:right-[8%]
          "
        >
          {/* =============================================
              GATO

              Ahora abre ImageCard.
          ============================================== */}

          <PetButton
            image={catImage}
            alt="Gato de Can Wash"
            label="Ver estética felina"
            onClick={openCatCard}
            className="
              z-20

              w-24

              sm:w-28
              md:w-32
              lg:w-36
              xl:w-40
            "
          />

          {/* =============================================
              PERRO

              Ahora abre ImageCard.
          ============================================== */}

          <PetButton
            image={dogImage}
            alt="Perro de Can Wash"
            label="Ver estética canina"
            onClick={openDogCard}
            className="
              z-10

              -translate-x-[18px]
              translate-y-[12px]

              w-28

              sm:-translate-x-[22px]
              sm:translate-y-[12px]
              sm:w-32

              md:-translate-x-[26px]
              md:translate-y-[16px]
              md:w-36

              lg:-translate-x-[34px]
              lg:translate-y-[16px]
              lg:w-40

              xl:-translate-x-[55px]
              xl:translate-y-[25px]
              xl:w-44
            "
          />
        </div>

        {/* ===============================================
            BENEFICIOS
        ================================================ */}

        <div
          className={`
            absolute

            bottom-0
            left-0
            right-0

            z-30

            border-t
            border-white/50

            bg-[#cce8e3]/90

            backdrop-blur-md

            transition-all
            duration-500
            ease-out

            ${
              showBenefits
                ? `
                  translate-y-0
                  opacity-100
                `
                : `
                  pointer-events-none
                  translate-y-full
                  opacity-0
                `
            }
          `}
        >
          <div
            className="
              mx-auto

              grid
              max-w-[1400px]

              grid-cols-2

              divide-x
              divide-[#14847f]/20

              px-4
              py-4

              lg:grid-cols-4
              lg:px-8
            "
          >
            <Feature
              icon={<CalendarDays />}
              title="Agenda en línea"
              text="Reserva tu cita fácilmente"
            />

            <Feature
              icon={<PawPrint />}
              title="Cuidado profesional"
              text="Personal capacitado"
            />

            <Feature
              icon={<ShieldCheck />}
              title="Ambiente seguro"
              text="Higiene y bienestar"
            />

            <Feature
              icon={<Heart />}
              title="Perros y gatos"
              text="Atención especializada"
            />
          </div>
        </div>
      </section>

      {/* =================================================
          SERVICIOS
      ================================================== */}

      <section
        id="servicios"
        className="
          px-5
          py-24

          sm:px-8
          lg:px-12
        "
      >
        <div
          className="
            mx-auto
            max-w-7xl
          "
        >
          <SectionHeader
            label="NUESTROS SERVICIOS"
            title="Todo lo que necesita tu mascota"
            text="Servicios pensados para mantener a perros y gatos limpios, cómodos y saludables."
          />

          <div
            className="
              mt-12

              grid
              grid-cols-1
              gap-5

              md:grid-cols-3
            "
          >
            <ServiceCard
              icon={<Bath />}
              title="Baño"
              text="Limpieza profesional utilizando productos adecuados para cada mascota."
            />

            <ServiceCard
              icon={<Scissors />}
              title="Estética"
              text="Corte, cepillado y arreglo para mantener a tu mascota cómoda y con excelente apariencia."
            />

            <ServiceCard
              icon={<Heart />}
              title="Cuidado"
              text="Atención enfocada en la comodidad, higiene y bienestar de perros y gatos."
            />
          </div>
        </div>
      </section>

      {/* =================================================
          NOSOTROS
      ================================================== */}

      <section
        id="nosotros"
        className="
          bg-[#dcefed]/35

          px-5
          py-24

          sm:px-8
          lg:px-12
        "
      >
        <div
          className="
            mx-auto

            grid
            max-w-7xl
            gap-12

            lg:grid-cols-2
            lg:items-center
          "
        >
          <div>
            <span
              className="
                text-xs
                font-bold
                tracking-[0.2em]

                text-[#14847f]
              "
            >
              SOBRE CAN WASH
            </span>

            <h2
              className="
                mt-4

                font-serif

                text-4xl
                leading-tight

                text-[#30231c]

                sm:text-5xl
              "
            >
              Cuidamos a quienes forman parte de tu familia.
            </h2>

            <p
              className="
                mt-6

                max-w-xl

                text-base
                leading-8

                text-[#687877]
              "
            >
              Can Wash ofrece servicios de estética canina y felina con atención
              enfocada en la higiene, comodidad y bienestar de cada mascota.
            </p>

            <button
              type="button"
              onClick={onRegister}
              className="
                mt-7

                inline-flex
                items-center
                gap-3

                rounded-full

                bg-[#14847f]

                px-6
                py-3.5

                text-sm
                font-semibold
                text-white

                transition
                duration-300

                hover:-translate-y-0.5
                hover:bg-[#106f6b]
              "
            >
              Crear cuenta
              <ArrowRight size={18} />
            </button>
          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-4
            "
          >
            <InfoBox icon={<PawPrint />} title="Atención" />

            <InfoBox icon={<Bath />} title="Higiene" />

            <InfoBox icon={<Scissors />} title="Estética" />

            <InfoBox icon={<Heart />} title="Bienestar" />
          </div>
        </div>
      </section>

      {/* =================================================
          CONTACTO
      ================================================== */}

      <section
        id="contacto"
        className="
          px-5
          py-24

          sm:px-8
          lg:px-12
        "
      >
        <div
          className="
            relative

            mx-auto
            max-w-7xl

            overflow-hidden

            rounded-[2rem]

            bg-[#153b39]

            px-6
            py-16

            text-center
            text-white

            sm:px-10
          "
        >
          <PawPrint
            size={45}
            className="
              mx-auto
              text-[#8bc8c2]
            "
          />

          <h2
            className="
              mx-auto
              mt-5
              max-w-2xl

              font-serif

              text-4xl
              leading-tight

              sm:text-5xl
            "
          >
            Dale a tu mascota el cuidado que merece.
          </h2>

          <p
            className="
              mx-auto
              mt-4
              max-w-xl

              text-sm
              leading-7

              text-white/70
            "
          >
            Crea tu cuenta, registra a tu mascota y administra sus servicios
            desde Can Wash.
          </p>

          <button
            type="button"
            onClick={onRegister}
            className="
              mx-auto
              mt-7

              flex
              items-center
              gap-3

              rounded-full

              bg-[#14847f]

              px-7
              py-4

              font-semibold
              text-white

              shadow-lg

              transition
              duration-300

              hover:-translate-y-1
              hover:bg-[#1b918b]
            "
          >
            Crear cuenta
            <ArrowRight size={20} />
          </button>

          <PawPrint
            size={180}
            className="
              pointer-events-none

              absolute
              -bottom-16
              -right-10

              rotate-[-15deg]

              text-white/5
            "
          />
        </div>
      </section>

      {/* =================================================
          FOOTER
      ================================================== */}

      <footer
        className="
          border-t
          border-[#dcefed]

          px-5
          py-8

          sm:px-8
        "
      >
        <div
          className="
            mx-auto

            flex
            max-w-7xl
            flex-col
            gap-4

            text-sm
            text-[#687877]

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div
            className="
              flex
              items-center
              gap-2

              font-semibold
              text-[#153b39]
            "
          >
            <PawPrint
              size={22}
              className="
                text-[#14847f]
              "
            />
            Can Wash
          </div>

          <span>Estética canina y felina</span>

          <button
            type="button"
            onClick={onLogin}
            className="
              font-semibold

              text-[#153b39]

              transition

              hover:text-[#14847f]
            "
          >
            Iniciar sesión
          </button>
        </div>
      </footer>

      {/* =================================================
          IMAGE CARD

          CAT:
          catImage x3

          DOG:
          dogImage x3
      ================================================== */}

      <ImageCard
        isOpen={selectedPet !== null}
        onClose={closePetCard}
        title={modalTitle}
        images={modalImages}
      />
    </div>
  );
}

/* =========================================================
   PERRO / GATO INTERACTIVO
========================================================= */

function PetButton({ image, alt, label, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`
        group
        relative

        cursor-pointer

        border-0
        bg-transparent

        p-0

        outline-none

        ${className}
      `}
    >
      <img
        src={image}
        alt={alt}
        draggable="false"
        className="
          h-auto
          w-full

          select-none

          transition-all
          duration-300
          ease-out

          group-hover:-translate-y-1
          group-hover:scale-[1.04]
          group-hover:brightness-105

          group-hover:drop-shadow-[0_0_9px_rgba(20,132,127,0.65)]

          group-focus-visible:-translate-y-1
          group-focus-visible:scale-[1.04]
          group-focus-visible:drop-shadow-[0_0_9px_rgba(20,132,127,0.75)]
        "
      />
    </button>
  );
}

/* =========================================================
   NAV DESKTOP
========================================================= */

function NavButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        relative

        py-2

        text-[#30231c]

        transition

        after:absolute
        after:bottom-0
        after:left-1/2

        after:h-px
        after:w-0

        after:-translate-x-1/2

        after:bg-[#14847f]

        after:transition-all
        after:duration-300

        hover:text-[#14847f]

        hover:after:w-full
      "
    >
      {children}
    </button>
  );
}

/* =========================================================
   NAV MÓVIL
========================================================= */

function MobileNavButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        w-full

        rounded-xl

        px-4
        py-3

        text-left

        text-sm
        font-semibold

        text-[#30231c]

        transition

        hover:bg-[#dcefed]
      "
    >
      {children}
    </button>
  );
}

/* =========================================================
   BENEFICIO
========================================================= */

function Feature({ icon, title, text }) {
  return (
    <div
      className="
        flex
        min-w-0
        items-center
        gap-3

        px-3
        py-2

        sm:px-4
      "
    >
      <div
        className="
          shrink-0
          text-[#14847f]
        "
      >
        {icon}
      </div>

      <div className="min-w-0">
        <strong
          className="
            block

            text-xs
            text-[#153b39]

            sm:text-sm
          "
        >
          {title}
        </strong>

        <span
          className="
            hidden

            text-xs
            text-[#687877]

            sm:block
          "
        >
          {text}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   ENCABEZADO
========================================================= */

function SectionHeader({ label, title, text }) {
  return (
    <div
      className="
        mx-auto
        max-w-3xl

        text-center
      "
    >
      <span
        className="
          text-xs
          font-bold
          tracking-[0.2em]

          text-[#14847f]
        "
      >
        {label}
      </span>

      <h2
        className="
          mt-4

          font-serif

          text-4xl
          leading-tight

          text-[#30231c]

          sm:text-5xl
        "
      >
        {title}
      </h2>

      <p
        className="
          mx-auto
          mt-4
          max-w-2xl

          text-sm
          leading-7

          text-[#687877]

          sm:text-base
        "
      >
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   SERVICIO
========================================================= */

function ServiceCard({ icon, title, text }) {
  return (
    <article
      className="
        group

        rounded-3xl

        border
        border-[#cce8e3]

        bg-white/70

        p-7

        backdrop-blur-sm

        transition
        duration-300

        hover:-translate-y-1
        hover:border-[#14847f]/30

        hover:shadow-xl
        hover:shadow-[#153b39]/5
      "
    >
      <div
        className="
          grid
          h-14
          w-14
          place-items-center

          rounded-2xl

          bg-[#dcefed]

          text-[#153b39]

          transition
          duration-300

          group-hover:bg-[#14847f]
          group-hover:text-white
        "
      >
        {icon}
      </div>

      <h3
        className="
          mt-6

          text-xl
          font-bold

          text-[#153b39]
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-3

          text-sm
          leading-7

          text-[#687877]
        "
      >
        {text}
      </p>
    </article>
  );
}

/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({ icon, title }) {
  return (
    <div
      className="
        group

        rounded-3xl

        bg-white/60

        p-7

        text-center

        shadow-lg
        shadow-[#153b39]/5

        transition
        duration-300

        hover:-translate-y-1
        hover:bg-white/90
      "
    >
      <div
        className="
          mx-auto

          grid
          h-14
          w-14
          place-items-center

          rounded-2xl

          bg-[#dcefed]

          text-[#14847f]

          transition
          duration-300

          group-hover:bg-[#14847f]
          group-hover:text-white
        "
      >
        {icon}
      </div>

      <strong
        className="
          mt-4
          block

          text-sm

          text-[#153b39]
        "
      >
        {title}
      </strong>
    </div>
  );
}

export default LandingPage;
