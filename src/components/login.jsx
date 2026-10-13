import { useState } from "react";

import {
  Lock,
  Mail,
  PawPrint,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "../lib/supabase";


function Login({ onLogin, onRegister }) {
  // =====================================================
  // ESTADOS
  // =====================================================

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  // =====================================================
  // ACTUALIZAR FORMULARIO
  // =====================================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });

    setError("");
  };


  // =====================================================
  // INICIAR SESIÓN
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();


    // -------------------------------------------------
    // VALIDACIÓN
    // -------------------------------------------------

    if (
      !form.email.trim() ||
      !form.password
    ) {
      setError(
        "Ingresa tu correo y contraseña."
      );

      return;
    }


    setLoading(true);
    setError("");


    try {
      // =================================================
      // 1. AUTENTICAR CON SUPABASE
      // =================================================

      const {
        data,
        error: loginError,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              form.email
                .trim()
                .toLowerCase(),

            password:
              form.password,
          });


      // =================================================
      // 2. ERROR DE AUTENTICACIÓN
      // =================================================

      if (loginError) {
        console.error(
          "Error de Supabase:",
          loginError
        );


        if (
          loginError.message ===
          "Invalid login credentials"
        ) {
          setError(
            "Correo o contraseña incorrectos."
          );

        } else if (
          loginError.message ===
          "Email not confirmed"
        ) {
          setError(
            "Debes confirmar tu correo electrónico antes de iniciar sesión."
          );

        } else {
          setError(
            loginError.message
          );
        }

        return;
      }


      // =================================================
      // 3. VERIFICAR USUARIO
      // =================================================

      if (!data?.user) {
        setError(
          "No fue posible obtener la información del usuario."
        );

        return;
      }


      // =================================================
      // 4. CONSULTAR PERFIL EN PUBLIC.USUARIOS
      // =================================================

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("usuarios")
          .select(`
            id_usuario,
            nombre,
            rol,
            activo
          `)
          .eq(
            "id_usuario",
            data.user.id
          )
          .single();


      // =================================================
      // 5. ERROR AL OBTENER PERFIL
      // =================================================

      if (profileError) {
        console.error(
          "Error obteniendo perfil:",
          profileError
        );

        await supabase.auth.signOut();

        setError(
          "Tu cuenta existe, pero no fue posible cargar tu perfil."
        );

        return;
      }


      // =================================================
      // 6. CUENTA DESACTIVADA
      // =================================================

      if (
        profile.activo === false
      ) {
        await supabase.auth.signOut();

        setError(
          "Esta cuenta se encuentra desactivada."
        );

        return;
      }


      // =================================================
      // 7. VALIDAR ROL
      // =================================================

      const validRoles = [
        "ADMIN",
        "EMPLEADO",
        "CLIENTE",
      ];


      if (
        !validRoles.includes(
          profile.rol
        )
      ) {
        await supabase.auth.signOut();

        setError(
          "Tu cuenta no tiene un rol válido."
        );

        return;
      }


      // =================================================
      // 8. CONSTRUIR USUARIO
      // =================================================

      const userData = {
        id_usuario:
          profile.id_usuario,

        nombre:
          profile.nombre,

        email:
          data.user.email,

        rol:
          profile.rol,

        activo:
          profile.activo,
      };


      // =================================================
      // 9. INFORMAR A APP.JSX
      // =================================================

      await onLogin(userData);

    } catch (error) {
      console.error(
        "Error inesperado al iniciar sesión:",
        error
      );

      setError(
        "Ocurrió un error inesperado al iniciar sesión."
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <div className="login-page">

      {/* =================================================
          LADO IZQUIERDO
      ================================================== */}

      <section className="login-decoration">

        <PawPrint size={75} />

        <h1>
          Can Wash
        </h1>

        <p>
          ESTÉTICA CANINA Y FELINA
        </p>

      </section>


      {/* =================================================
          LOGIN
      ================================================== */}

      <section className="login-card">

        <div className="brand-icon">

          <PawPrint size={38} />

        </div>


        <h2>
          Bienvenido
        </h2>


        <p className="subtitle">
          Inicia sesión para acceder a
          tu cuenta de Can Wash.
        </p>


        <form
          onSubmit={handleSubmit}
        >

          {/* =============================================
              CORREO
          ============================================== */}

          <label htmlFor="email">
            Correo electrónico
          </label>


          <div className="input-container">

            <Mail size={20} />


            <input
              id="email"
              name="email"
              type="email"
              placeholder="correo@ejemplo.com"

              value={
                form.email
              }

              onChange={
                handleChange
              }

              autoComplete="email"

              disabled={
                loading
              }
            />

          </div>


          {/* =============================================
              CONTRASEÑA
          ============================================== */}

          <label htmlFor="password">
            Contraseña
          </label>


          <div className="input-container">

            <Lock size={20} />


            <input
              id="password"
              name="password"

              type={
                showPassword
                  ? "text"
                  : "password"
              }

              placeholder="Ingresa tu contraseña"

              value={
                form.password
              }

              onChange={
                handleChange
              }

              autoComplete="current-password"

              disabled={
                loading
              }
            />


            <button
              type="button"

              className="password-button"

              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }

              disabled={
                loading
              }

              aria-label={
                showPassword
                  ? "Ocultar contraseña"
                  : "Mostrar contraseña"
              }
            >

              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}

            </button>

          </div>


          {/* =============================================
              ERROR
          ============================================== */}

          {error && (
            <div className="login-error">

              {error}

            </div>
          )}


          {/* =============================================
              INICIAR SESIÓN
          ============================================== */}

          <button
            type="submit"

            className="primary-button"

            disabled={
              loading
            }
          >

            {loading
              ? "Iniciando sesión..."
              : "Iniciar sesión"
            }


            {!loading && (
              <LogIn size={19} />
            )}

          </button>


          {/* =============================================
              REGISTRO
          ============================================== */}

          <div className="register-link">

            <span>
              ¿No tienes una cuenta?
            </span>


            <button
              type="button"

              onClick={
                onRegister
              }

              disabled={
                loading
              }
            >
              Crear cuenta
            </button>

          </div>

        </form>

      </section>

    </div>
  );
}


export default Login;