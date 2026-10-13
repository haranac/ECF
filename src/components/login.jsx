import { useState } from "react";
import {
  Lock,
  Mail,
  PawPrint,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";

function Login({ onLogin, onRegister }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Actualizar campos del formulario
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    // Limpiar error cuando el usuario vuelva a escribir
    setError("");
  };

  // Inicio de sesión
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos vacíos
    if (!form.email || !form.password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Obtener usuarios registrados
      const users =
        JSON.parse(
          localStorage.getItem("canWashUsers")
        ) || [];

      // Buscar usuario
      const registeredUser = users.find(
        (user) =>
          user.email.toLowerCase() ===
            form.email.toLowerCase() &&
          user.password === form.password
      );

      // Usuario no encontrado
      if (!registeredUser) {
        setError(
          "Correo o contraseña incorrectos."
        );
        return;
      }

      // Verificar si la cuenta está activa
      if (registeredUser.activo === false) {
        setError(
          "Esta cuenta se encuentra desactivada."
        );
        return;
      }

      // Datos que guardaremos en la sesión
      // No guardamos la contraseña
      const user = {
        id_usuario: registeredUser.id_usuario,
        nombre: registeredUser.nombre,
        email: registeredUser.email,
        rol: registeredUser.rol,
      };

      // Guardar sesión temporal
      localStorage.setItem(
        "canWashUser",
        JSON.stringify(user)
      );

      // Informar a App.jsx que el login fue correcto
      onLogin(user);

    } catch (error) {
      console.error(
        "Error al iniciar sesión:",
        error
      );

      setError(
        "Ocurrió un error al iniciar sesión."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* =========================
          LADO IZQUIERDO
      ========================== */}

      <section className="login-decoration">

        <PawPrint size={75} />

        <h1>Can Wash</h1>

        <p>
          ESTÉTICA CANINA Y FELINA
        </p>

      </section>


      {/* =========================
          FORMULARIO LOGIN
      ========================== */}

      <section className="login-card">

        <div className="brand-icon">
          <PawPrint size={38} />
        </div>

        <h2>
          Bienvenido
        </h2>

        <p className="subtitle">
          Inicia sesión para acceder al panel
          administrativo de Can Wash.
        </p>


        <form onSubmit={handleSubmit}>

          {/* =====================
              CORREO
          ====================== */}

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
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />

          </div>


          {/* =====================
              CONTRASEÑA
          ====================== */}

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
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />

            <button
              type="button"
              className="password-button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
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


          {/* =====================
              MENSAJE DE ERROR
          ====================== */}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}


          {/* =====================
              BOTÓN LOGIN
          ====================== */}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >

            {loading
              ? "Iniciando sesión..."
              : "Iniciar sesión"
            }

            {!loading && (
              <LogIn size={19} />
            )}

          </button>


          {/* =====================
              CREAR CUENTA
          ====================== */}

          <div className="register-link">

            <span>
              ¿No tienes una cuenta?
            </span>

            <button
              type="button"
              onClick={onRegister}
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