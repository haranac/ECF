import {
  PawPrint,
} from "lucide-react";


function LoadingScreen() {
  return (
    <main
      className="
        grid
        min-h-screen
        place-items-center
        bg-canwash-background
        px-6
      "
    >

      <div className="text-center">

        <div
          className="
            mx-auto

            grid
            h-20
            w-20
            place-items-center

            rounded-3xl

            bg-canwash-light
            text-canwash-dark

            shadow-lg
            shadow-canwash/20
          "
        >
          <PawPrint size={42} />
        </div>


        <h1
          className="
            mt-6

            text-2xl
            font-bold
            text-canwash-dark
          "
        >
          Can Wash
        </h1>


        <p
          className="
            mt-2
            text-sm
            text-canwash-muted
          "
        >
          Preparando tu cuenta...
        </p>


        <div
          className="
            mx-auto
            mt-6

            h-8
            w-8

            animate-spin

            rounded-full

            border-4
            border-canwash-light
            border-t-canwash-dark
          "
        />

      </div>

    </main>
  );
}


export default LoadingScreen;