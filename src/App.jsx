import { useEffect, useState } from "react";

import Login from "./components/login";
import Register from "./components/register";

import EmployeeDashboard from "./components/employeeDashboard";
import ClientDashboard from "./components/clientDashboard";

import RegisterClient from "./components/registerClient";

import { supabase } from "./lib/supabase";

import "./styles.css";


function App() {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [user, setUser] = useState(null);

  const [page, setPage] = useState("login");

  const [loading, setLoading] = useState(true);

  const [authError, setAuthError] = useState("");


  // =====================================================
  // OBTENER PERFIL DESDE PUBLIC.USUARIOS
  // =====================================================

  const getUserProfile = async (supabaseUser) => {
    if (!supabaseUser) {
      return null;
    }

    try {
      const {
        data: profile,
        error,
      } = await supabase
        .from("usuarios")
        .select(`
          id_usuario,
          nombre,
          rol,
          activo
        `)
        .eq(
          "id_usuario",
          supabaseUser.id
        )
        .single();


      if (error) {
        console.error(
          "Error obteniendo perfil:",
          error
        );

        throw error;
      }


      // Usuario desactivado
      if (profile.activo === false) {
        await supabase.auth.signOut();

        throw new Error(
          "Esta cuenta se encuentra desactivada."
        );
      }


      // Construimos el usuario que utilizará React
      return {
        id_usuario:
          profile.id_usuario,

        nombre:
          profile.nombre,

        email:
          supabaseUser.email,

        rol:
          profile.rol,

        activo:
          profile.activo,
      };

    } catch (error) {
      console.error(
        "Error cargando usuario:",
        error
      );

      throw error;
    }
  };


  // =====================================================
  // CARGAR SESIÓN INICIAL
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        setLoading(true);
        setAuthError("");


        // Obtener sesión actual
        const {
          data: {
            session,
          },
          error,
        } =
          await supabase.auth.getSession();


        if (error) {
          throw error;
        }


        // No existe sesión
        if (!session?.user) {
          if (mounted) {
            setUser(null);
            setPage("login");
          }

          return;
        }


        // Buscar perfil en public.usuarios
        const profile =
          await getUserProfile(
            session.user
          );


        if (mounted) {
          setUser(profile);
          setPage("dashboard");
        }

      } catch (error) {
        console.error(
          "Error recuperando sesión:",
          error
        );


        if (mounted) {
          setUser(null);

          setPage("login");

          setAuthError(
            error.message ||
            "No fue posible recuperar la sesión."
          );
        }

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };


    loadSession();


    // =================================================
    // ESCUCHAR CAMBIOS DE SUPABASE AUTH
    // =================================================

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
          // ---------------------------------------------
          // CERRAR SESIÓN
          // ---------------------------------------------

          if (event === "SIGNED_OUT") {
            if (mounted) {
              setUser(null);
              setPage("login");
              setLoading(false);
            }

            return;
          }


          // ---------------------------------------------
          // SESIÓN ACTIVA
          // ---------------------------------------------

          if (session?.user) {
            try {
              const profile =
                await getUserProfile(
                  session.user
                );


              if (mounted) {
                setUser(profile);

                setPage(
                  "dashboard"
                );

                setAuthError("");
              }

            } catch (error) {
              console.error(
                "Error actualizando sesión:",
                error
              );


              if (mounted) {
                setUser(null);

                setPage("login");

                setAuthError(
                  error.message ||
                  "No fue posible cargar el usuario."
                );
              }
            }
          }
        }
      );


    // =================================================
    // CLEANUP
    // =================================================

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };

  }, []);


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async () => {
    try {
      setLoading(true);
      setAuthError("");


      // Obtenemos el usuario autenticado directamente
      // desde Supabase.

      const {
        data: {
          user: supabaseUser,
        },
        error,
      } =
        await supabase.auth.getUser();


      if (error) {
        throw error;
      }


      if (!supabaseUser) {
        throw new Error(
          "No fue posible obtener el usuario."
        );
      }


      // Obtener perfil y rol real
      const profile =
        await getUserProfile(
          supabaseUser
        );


      setUser(profile);

      setPage("dashboard");

    } catch (error) {
      console.error(
        "Error después del login:",
        error
      );


      setAuthError(
        error.message ||
        "No fue posible iniciar sesión."
      );


      setUser(null);

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      const { error } =
        await supabase.auth.signOut();


      if (error) {
        throw error;
      }


      setUser(null);

      setPage("login");

    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );
    }
  };


  // =====================================================
  // PANTALLA DE CARGA
  // =====================================================

  if (loading) {
    return (
      <div className="employee-loading">

        <div
          style={{
            fontSize: "45px",
          }}
        >
          🐾
        </div>


        <h2>
          Cargando Can Wash...
        </h2>


        <p>
          Preparando tu cuenta.
        </p>

      </div>
    );
  }


  // =====================================================
  // USUARIO NO AUTENTICADO
  // =====================================================

  if (!user) {

    // -------------------------------------------------
    // REGISTRO
    // -------------------------------------------------

    if (page === "registerUser") {
      return (
        <Register
          onRegister={() =>
            setPage("login")
          }

          onBack={() =>
            setPage("login")
          }
        />
      );
    }


    // -------------------------------------------------
    // LOGIN
    // -------------------------------------------------

    return (
      <>
        {authError && (
          <div
            style={{
              position: "fixed",
              top: "15px",
              left: "50%",
              transform:
                "translateX(-50%)",
              zIndex: 9999,
              padding:
                "12px 18px",
              borderRadius: "10px",
              background:
                "#f8e5e5",
              color:
                "#b75c5c",
              fontSize: "13px",
            }}
          >
            {authError}
          </div>
        )}


        <Login
          onLogin={
            handleLogin
          }

          onRegister={() =>
            setPage(
              "registerUser"
            )
          }
        />
      </>
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
        user={user}

        onLogout={
          handleLogout
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
        user={user}

        onLogout={
          handleLogout
        }
      />
    );
  }


  // =====================================================
  // ADMINISTRADOR
  // =====================================================

  if (
    user.rol === "ADMIN"
  ) {

    // -------------------------------------------------
    // ADMIN - REGISTRAR CLIENTE
    // -------------------------------------------------

    if (
      page === "registerClient"
    ) {
      return (
        <RegisterClient
          onBack={() =>
            setPage(
              "dashboard"
            )
          }

          onSaved={() =>
            setPage(
              "dashboard"
            )
          }
        />
      );
    }


    // -------------------------------------------------
    // ADMIN DASHBOARD
    // -------------------------------------------------

    return (
      <Dashboard
        user={user}

        onRegisterClient={() =>
          setPage(
            "registerClient"
          )
        }

        onLogout={
          handleLogout
        }
      />
    );
  }


  // =====================================================
  // ROL DESCONOCIDO
  // =====================================================

  return (
    <div className="employee-loading">

      <div
        style={{
          fontSize: "45px",
        }}
      >
        ⚠️
      </div>


      <h2>
        Rol no reconocido
      </h2>


      <p>
        Tu cuenta tiene un rol que
        Can Wash no reconoce:
        {" "}
        <strong>
          {user.rol}
        </strong>
      </p>


      <button
        className="primary-button"
        style={{
          maxWidth: "250px",
        }}
        onClick={
          handleLogout
        }
      >
        Cerrar sesión
      </button>

    </div>
  );
}


export default App;