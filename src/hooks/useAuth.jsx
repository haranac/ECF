import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";


function useAuth() {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [authError, setAuthError] =
    useState("");


  // =====================================================
  // OBTENER PERFIL
  // =====================================================

  const getUserProfile =
    useCallback(
      async (supabaseUser) => {
        if (!supabaseUser?.id) {
          throw new Error(
            "No fue posible identificar al usuario."
          );
        }


        const {
          data: profile,
          error: profileError,
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
          .maybeSingle();


        if (profileError) {
          console.error(
            "Error consultando usuarios:",
            profileError
          );

          throw new Error(
            "No fue posible consultar tu perfil."
          );
        }


        if (!profile) {
          throw new Error(
            "Tu cuenta no tiene un perfil asociado en Can Wash."
          );
        }


        if (profile.activo === false) {
          throw new Error(
            "Esta cuenta se encuentra desactivada."
          );
        }


        const role =
          profile.rol
            ?.trim()
            .toUpperCase();


        const validRoles = [
          "CLIENTE",
          "EMPLEADO",
          "ADMIN",
        ];


        if (
          !validRoles.includes(role)
        ) {
          throw new Error(
            `El rol "${profile.rol}" no es válido.`
          );
        }


        return {
          id_usuario:
            profile.id_usuario,

          nombre:
            profile.nombre,

          email:
            supabaseUser.email,

          rol:
            role,

          activo:
            profile.activo,
        };
      },
      []
    );


  // =====================================================
  // CARGAR USUARIO
  // =====================================================

  const loadUser =
    useCallback(
      async (supabaseUser) => {
        const profile =
          await getUserProfile(
            supabaseUser
          );


        setUser(profile);
        setAuthError("");


        return profile;
      },
      [getUserProfile]
    );


  // =====================================================
  // RECUPERAR SESIÓN
  // =====================================================

  useEffect(() => {
    let mounted = true;


    const initializeAuth =
      async () => {
        try {
          setLoading(true);
          setAuthError("");


          const {
            data: {
              session,
            },
            error,
          } =
            await supabase.auth
              .getSession();


          if (error) {
            throw error;
          }


          if (!session?.user) {
            if (mounted) {
              setUser(null);
            }

            return;
          }


          const profile =
            await getUserProfile(
              session.user
            );


          if (mounted) {
            setUser(profile);
          }

        } catch (error) {
          console.error(
            "Error recuperando sesión:",
            error
          );


          await supabase.auth
            .signOut();


          if (mounted) {
            setUser(null);

            setAuthError(
              error?.message ||
              "No fue posible recuperar la sesión."
            );
          }

        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };


    initializeAuth();


    // ===================================================
    // CAMBIOS DE AUTH
    // ===================================================

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (event) => {
            if (
              event === "SIGNED_OUT" &&
              mounted
            ) {
              setUser(null);
            }
          }
        );


    return () => {
      mounted = false;

      subscription.unsubscribe();
    };

  }, [getUserProfile]);


  // =====================================================
  // DESPUÉS DEL LOGIN
  // =====================================================

  const login = async (
    supabaseUser
  ) => {
    try {
      setLoading(true);
      setAuthError("");


      await loadUser(
        supabaseUser
      );


      return true;

    } catch (error) {
      console.error(
        "Error cargando usuario:",
        error
      );


      await supabase.auth
        .signOut();


      setUser(null);


      setAuthError(
        error?.message ||
        "No fue posible iniciar sesión."
      );


      return false;

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    try {
      setLoading(true);
      setAuthError("");


      const {
        error,
      } =
        await supabase.auth
          .signOut();


      if (error) {
        throw error;
      }


      setUser(null);


      return true;

    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );


      setAuthError(
        "No fue posible cerrar la sesión."
      );


      return false;

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // LIMPIAR ERROR
  // =====================================================

  const clearAuthError = () => {
    setAuthError("");
  };


  // =====================================================
  // RETURN
  // =====================================================

  return {
    user,
    loading,
    authError,

    login,
    logout,

    clearAuthError,
  };
}


export default useAuth;