import { useState } from "react";

import {
  AlertCircle,
  X,
} from "lucide-react";

import LandingPage from "./components/landingPage";
import Login from "./components/login";
import Register from "./components/register";

import ClientDashboard from "./components/clientDashboard";
import EmployeeDashboard from "./components/employeeDashboard";
import Profile from "./components/profile";

import LoadingScreen from "./utils/loadingScreen";
import RoleError from "./utils/roleError";

import useAuth from "./hooks/useAuth";


function App() {
  // =====================================================
  // AUTENTICACIÓN
  // =====================================================

  const {
    user,
    loading,
    authError,
    login,
    logout,
    clearAuthError,
  } = useAuth();


  // =====================================================
  // PÁGINA PÚBLICA
  //
  // landing
  // login
  // register
  // =====================================================

  const [
    publicPage,
    setPublicPage,
  ] = useState("landing");


  // =====================================================
  // VISTA PRIVADA
  //
  // dashboard
  // profile
  // =====================================================

  const [
    appView,
    setAppView,
  ] = useState("dashboard");


  // =====================================================
  // NAVEGACIÓN PÚBLICA
  // =====================================================

  const goToLanding = () => {
    clearAuthError?.();

    setPublicPage(
      "landing"
    );
  };


  const goToLogin = () => {
    clearAuthError?.();

    setPublicPage(
      "login"
    );
  };


  const goToRegister = () => {
    clearAuthError?.();

    setPublicPage(
      "register"
    );
  };


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (
    supabaseUser
  ) => {
    try {
      const success =
        await login(
          supabaseUser
        );


      if (success) {
        setAppView(
          "dashboard"
        );
      }

    } catch (error) {
      console.error(
        "Error en handleLogin:",
        error
      );
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout =
    async () => {
      try {
        const success =
          await logout();


        if (success) {
          setAppView(
            "dashboard"
          );

          setPublicPage(
            "landing"
          );
        }

      } catch (error) {
        console.error(
          "Error cerrando sesión:",
          error
        );
      }
    };


  // =====================================================
  // PERFIL
  // =====================================================

  const openProfile = () => {
    setAppView(
      "profile"
    );
  };


  const closeProfile = () => {
    setAppView(
      "dashboard"
    );
  };


  // =====================================================
  // CARGANDO SESIÓN
  // =====================================================

  if (loading) {
    return (
      <LoadingScreen />
    );
  }


  // =====================================================
  // USUARIO NO AUTENTICADO
  // =====================================================

  if (!user) {
    // ===================================================
    // LANDING
    // ===================================================

    if (
      publicPage === "landing"
    ) {
      return (
        <LandingPage
          onLogin={
            goToLogin
          }

          onRegister={
            goToRegister
          }
        />
      );
    }


    // ===================================================
    // REGISTRO
    // ===================================================

    if (
      publicPage === "register"
    ) {
      return (
        <Register
          onRegister={
            goToLogin
          }

          onBack={
            goToLanding
          }
        />
      );
    }


    // ===================================================
    // LOGIN
    // ===================================================

    return (
      <div
        className="
          relative
          min-h-screen
        "
      >

        {/* ===============================================
            ERROR GLOBAL
        ================================================ */}

        {authError && (
          <AuthError
            message={
              authError
            }

            onClose={
              clearAuthError
            }
          />
        )}


        {/* ===============================================
            LOGIN

            onBack regresa a LandingPage
        ================================================ */}

        <Login
          onLogin={
            handleLogin
          }

          onRegister={
            goToRegister
          }

          onBack={
            goToLanding
          }
        />

      </div>
    );
  }


  // =====================================================
  // PERFIL
  // =====================================================

  if (
    appView === "profile"
  ) {
    return (
      <Profile
        user={
          user
        }

        onBack={
          closeProfile
        }

        onLogout={
          handleLogout
        }
      />
    );
  }


  // =====================================================
  // CLIENTE
  // =====================================================

  if (
    user.rol === "CLIENTE"
  ) {
    return (
      <ClientDashboard
        user={
          user
        }

        onLogout={
          handleLogout
        }

        onProfile={
          openProfile
        }
      />
    );
  }


  // =====================================================
  // EMPLEADO
  // =====================================================

  if (
    user.rol === "EMPLEADO"
  ) {
    return (
      <EmployeeDashboard
        user={
          user
        }

        onLogout={
          handleLogout
        }

        onProfile={
          openProfile
        }
      />
    );
  }


  // =====================================================
  // ADMIN
  // =====================================================

  if (
    user.rol === "ADMIN"
  ) {
    return (
      <EmployeeDashboard
        user={
          user
        }

        onLogout={
          handleLogout
        }

        onProfile={
          openProfile
        }
      />
    );
  }


  // =====================================================
  // ROL NO RECONOCIDO
  // =====================================================

  return (
    <RoleError
      role={
        user.rol
      }

      onLogout={
        handleLogout
      }
    />
  );
}


/* =========================================================
   ERROR GLOBAL DE AUTENTICACIÓN
========================================================= */

function AuthError({
  message,
  onClose,
}) {
  return (
    <div
      className="
        fixed
        left-1/2
        top-4
        z-[200]

        flex
        w-[calc(100%-2rem)]
        max-w-lg

        -translate-x-1/2

        items-start
        gap-3

        rounded-2xl

        border
        border-red-200

        bg-red-50/95

        px-4
        py-3

        text-sm
        font-medium
        text-red-700

        shadow-xl
        backdrop-blur-md
      "
    >

      <AlertCircle
        size={19}
        className="
          mt-0.5
          shrink-0
        "
      />


      <span
        className="
          flex-1
          leading-5
        "
      >
        {message}
      </span>


      <button
        type="button"

        onClick={
          onClose
        }

        aria-label="Cerrar mensaje"

        className="
          grid
          h-7
          w-7
          shrink-0
          place-items-center

          rounded-lg

          text-red-500

          transition

          hover:bg-red-100
          hover:text-red-700
        "
      >
        <X
          size={16}
        />
      </button>

    </div>
  );
}


export default App;