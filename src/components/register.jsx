import { useState } from "react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  PawPrint,
  UserPlus,
  ArrowLeft,
} from "lucide-react";

function Register({ onRegister, onBack }) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
    rol: "EMPLEADO",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validaciones
    if (
      !form.nombre ||
      !form.email ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Completa todos los campos.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // Obtenemos usuarios registrados
    const users =
      JSON.parse(
        localStorage.getItem("canWashUsers")
      ) || [];

    // Verificamos que el correo no exista
    const emailExists = users.some(
      (user) =>
        user.email.toLowerCase() ===
        form.email.toLowerCase()
    );

    if (emailExists) {
      setError(
        "Ya existe un usuario registrado con ese correo."
      );
      return;
    }

    const newUser = {
      id_usuario: Date.now(),
      nombre: form.nombre,
      email: form.email,
      password: form.password,
      rol: form.rol,
      activo: true,
      fecha_creacion: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];

    localStorage.setItem(
      "canWashUsers",
      JSON.stringify(updatedUsers)
    );

    alert("Usuario registrado correctamente.");

    onRegister();
  };

  return (
    <div className="login-page">

      {/* PARTE IZQUIERDA */}

      <section className="login-decoration">
        <PawPrint size={75} />

        <h1>Can Wash</h1>

        <p>ESTÉTICA CANINA Y FELINA</p>
      </section>

      {/* FORMULARIO */}

      <section className="login-card register-user-card">

        <button
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <div className="brand-icon">
          <UserPlus size={35} />
        </div>

        <h2>Crear cuenta</h2>

        <p className="subtitle">
          Registra un usuario para acceder al sistema
          administrativo de Can Wash.
        </p>

        <form onSubmit={handleSubmit}>

          {/* NOMBRE */}

          <label>Nombre completo</label>

          <div className="input-container">
            <User size={20} />

            <input
              type="text"
              name="nombre"
              placeholder="Ej. Juan Pérez"
              value={form.nombre}
              onChange={handleChange}
            />
          </div>

          {/* EMAIL */}

          <label>Correo electrónico</label>

          <div className="input-container">
            <Mail size={20} />

            <input
              type="email"
              name="email"
              placeholder="empleado@canwash.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          {/* ROL */}

          <label>Rol</label>

          <select
            name="rol"
            value={form.rol}
            onChange={handleChange}
          >
            <option value="EMPLEADO">
              Empleado
            </option>

            <option value="ADMIN">
              Administrador
            </option>
          </select>

          {/* PASSWORD */}

          <label>Contraseña</label>

          <div className="input-container">
            <Lock size={20} />

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={handleChange}
            />

            <button
              type="button"
              className="password-button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>

          {/* CONFIRMAR */}

          <label>Confirmar contraseña</label>

          <div className="input-container">
            <Lock size={20} />

            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Repite la contraseña"
              value={form.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {/* ERROR */}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button"
          >
            <UserPlus size={19} />
            Crear cuenta
          </button>

        </form>
      </section>
    </div>
  );
}

export default Register;