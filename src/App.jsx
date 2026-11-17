import { useState } from "react";

import {
  AlertCircle,
} from "lucide-react";

import Login from "./components/login";
import Register from "./components/register";

import ClientDashboard from "./components/clientDashboard";
import EmployeeDashboard from "./components/employeeDashboard";

import Profile from "./components/profile";

import LoadingScreen from "./utils/loadingScreen";
import RoleError from "./utils/roleError";

import useAuth from "./hooks/useAuth";


function App() {
  const [dashboardView,setDashboardView] = useState(null);
  // =====================================================
  // AUTH
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
  // PÁGINA DE AUTENTICACIÓN
  //
  // login | register
  // =====================================================

  const [
    authPage,
    setAuthPage,
  ] = useState("login");


  // =====================================================
  // PANTALLA PRINCIPAL
  //
  // dashboard | profile
  // =====================================================

  const [
    appView,
    setAppView,
  ] = useState("dashboard");


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (
    supabaseUser
  ) => {
    const success =
      await login(
        supabaseUser
      );


    if (success) {
      setDashboardView(null);
      setAppView(
        "dashboard"
      );
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout =
    async () => {
      const success =
        await logout();


      if (success) {
        setDashboardView(null);
        setAuthPage(
          "login"
        );

        setAppView(
          "dashboard"
        );
      }
    };


  // =====================================================
  // IR AL PERFIL
  // =====================================================

  const openProfile = (view) => {
    setDashboardView(typeof view === "string" ? view : null);
    setAppView(
      "profile"
    );
  };


  // =====================================================
  // VOLVER AL DASHBOARD
  // =====================================================

  const closeProfile = (view) => {
    if (typeof view === "string") setDashboardView(view);
    setAppView(
      "dashboard"
    );
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <LoadingScreen />
    );
  }


  // =====================================================
  // SIN SESIÓN
  // =====================================================

  if (!user) {
    // ===================================================
    // REGISTRO
    // ===================================================

    if (
      authPage === "register"
    ) {
      return (
        <Register
          onRegister={() => {
            clearAuthError();

            setAuthPage(
              "login"
            );
          }}

          onBack={() => {
            clearAuthError();

            setAuthPage(
              "login"
            );
          }}
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
            ERROR DE AUTH
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


        <Login
          onLogin={
            handleLogin
          }

          onRegister={() => {
            clearAuthError();

            setAuthPage(
              "register"
            );
          }}
        />

      </div>
    );
  }


  // =====================================================
  // PERFIL
  //
  // Mismo componente para:
  //
  // CLIENTE
  // EMPLEADO
  // ADMIN
  // =====================================================

  if (
    appView === "profile"
  ) {
    return (
      <Profile
        user={user}

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
        initialView={dashboardView || "inicio"}
        user={user}

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
        initialView={dashboardView || "citas"}
        user={user}

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
        initialView={dashboardView || "citas"}
        user={user}

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
  // ROL INVÁLIDO
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
   ERROR DE AUTENTICACIÓN
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
        z-[100]

        flex

        w-[calc(100%-2rem)]
        max-w-lg

        -translate-x-1/2

        items-start
        gap-3

        rounded-xl

        border
        border-red-200

        bg-red-50

        px-4
        py-3

        text-sm
        font-medium
        text-red-700

        shadow-xl
      "
    >

      <AlertCircle
        size={19}
        className="
          mt-0.5
          shrink-0
        "
      />


      <span className="flex-1">
        {message}
      </span>


      <button
        type="button"

        onClick={
          onClose
        }

        className="
          shrink-0
          text-red-500
          transition
          hover:text-red-700
        "
      >
        ×
      </button>

    </div>
  );
}


export default App;