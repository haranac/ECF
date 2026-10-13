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
  BriefcaseBusiness,
} from "lucide-react";

import { supabase } from "../lib/supabase";

function Register({ onRegister, onBack }) {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",

    // Por defecto será cliente
    rol: "CLIENTE",
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] =
    useState(false);


  // ==========================================
  // ACTUALIZAR FORMULARIO
  // ==========================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    setError("");
    setSuccess("");
  };


  // ==========================================
  // SELECCIONAR TIPO DE CUENTA
  // ==========================================

  const selectRole = (rol) => {
    setForm({
      ...form,
      rol,
    });

    setError("");
  };


  // ==========================================
  // REGISTRAR
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ------------------------------
    // CAMPOS OBLIGATORIOS
    // ------------------------------

    if (
      !form.nombre.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError(
        "Completa todos los campos."
      );

      return;
    }


    // ------------------------------
    // NOMBRE
    // ------------------------------

    if (form.nombre.trim().length < 3) {
      setError(
        "El nombre debe tener al menos 3 caracteres."
      );

      return;
    }


    // ------------------------------
    // CONTRASEÑA
    // ------------------------------

    if (form.password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }


    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }


    // ------------------------------
    // ROL
    // ------------------------------

    if (
      form.rol !== "CLIENTE" &&
      form.rol !== "EMPLEADO"
    ) {
      setError(
        "Selecciona un tipo de cuenta válido."
      );

      return;
    }


    setLoading(true);
    setError("");
    setSuccess("");


    try {
      // ==========================================
      // SUPABASE AUTH
      // ==========================================

      const {
        data,
        error: signUpError,
      } =
        await supabase.auth.signUp({
          email:
            form.email
              .trim()
              .toLowerCase(),

          password:
            form.password,

          options: {
            data: {
              nombre:
                form.nombre.trim(),

              rol:
                form.rol,
            },
          },
        });


      // ==========================================
      // ERROR
      // ==========================================

      if (signUpError) {
        console.error(
          "Error Supabase:",
          signUpError
        );

        const message =
          signUpError.message
            .toLowerCase();

        if (
          message.includes(
            "already registered"
          ) ||
          message.includes(
            "already exists"
          )
        ) {
          setError(
            "Ya existe una cuenta con este correo."
          );
        } else {
          setError(
            signUpError.message
          );
        }

        return;
      }


      if (!data.user) {
        setError(
          "No fue posible crear la cuenta."
        );

        return;
      }


      // ==========================================
      // ÉXITO
      // ==========================================

      if (form.rol === "CLIENTE") {
        setSuccess(
          "Cuenta de cliente creada correctamente. Revisa tu correo si es necesario confirmar la cuenta."
        );
      } else {
        setSuccess(
          "Cuenta de empleado creada correctamente. Revisa tu correo si es necesario confirmar la cuenta."
        );
      }


      // Limpiar formulario

      setForm({
        nombre: "",
        email: "",
        password: "",
        confirmPassword: "",
        rol: "CLIENTE",
      });


      // Volver al login

      setTimeout(() => {
        onRegister();
      }, 1800);

    } catch (error) {
      console.error(
        "Error inesperado:",
        error
      );

      setError(
        "Ocurrió un error inesperado al crear la cuenta."
      );

    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-page">

      {/* =====================================
          DECORACIÓN
      ====================================== */}

      <section className="login-decoration">

        <PawPrint size={75} />

        <h1>
          Can Wash
        </h1>

        <p>
          ESTÉTICA CANINA Y FELINA
        </p>

      </section>


      {/* =====================================
          REGISTRO
      ====================================== */}

      <section
        className="login-card register-user-card"
      >

        <button
          type="button"
          className="back-button"
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft size={18} />

          Volver
        </button>


        <div className="brand-icon">
          <UserPlus size={35} />
        </div>


        <h2>
          Crear cuenta
        </h2>


        <p className="subtitle">
          Crea una cuenta para utilizar
          los servicios de Can Wash.
        </p>


        <form onSubmit={handleSubmit}>

          {/* =================================
              TIPO DE CUENTA
          ================================== */}

          <label>
            Tipo de cuenta
          </label>


          <div className="account-type-grid">

            {/* CLIENTE */}

            <button
              type="button"
              className={
                form.rol === "CLIENTE"
                  ? "account-type-card account-type-selected"
                  : "account-type-card"
              }
              onClick={() =>
                selectRole("CLIENTE")
              }
              disabled={loading}
            >

              <div className="account-type-icon">
                <PawPrint size={25} />
              </div>


              <div>
                <strong>
                  Cliente
                </strong>

                <span>
                  Agenda y consulta
                  servicios para tus
                  mascotas.
                </span>
              </div>

            </button>


            {/* EMPLEADO */}

            <button
              type="button"
              className={
                form.rol === "EMPLEADO"
                  ? "account-type-card account-type-selected"
                  : "account-type-card"
              }
              onClick={() =>
                selectRole("EMPLEADO")
              }
              disabled={loading}
            >

              <div className="account-type-icon">
                <BriefcaseBusiness
                  size={25}
                />
              </div>


              <div>
                <strong>
                  Empleado
                </strong>

                <span>
                  Accede a tus citas y
                  actividades asignadas.
                </span>
              </div>

            </button>

          </div>


          {/* =================================
              NOMBRE
          ================================== */}

          <label htmlFor="nombre">
            Nombre completo
          </label>


          <div className="input-container">

            <User size={20} />

            <input
              id="nombre"
              name="nombre"
              type="text"
              placeholder="Ej. Juan Pérez"
              value={form.nombre}
              onChange={handleChange}
              autoComplete="name"
              disabled={loading}
            />

          </div>


          {/* =================================
              EMAIL
          ================================== */}

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
              disabled={loading}
            />

          </div>


          {/* =================================
              CONTRASEÑA
          ================================== */}

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
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={loading}
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


          {/* =================================
              CONFIRMAR CONTRASEÑA
          ================================== */}

          <label htmlFor="confirmPassword">
            Confirmar contraseña
          </label>


          <div className="input-container">

            <Lock size={20} />

            <input
              id="confirmPassword"
              name="confirmPassword"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Repite tu contraseña"
              value={
                form.confirmPassword
              }
              onChange={handleChange}
              autoComplete="new-password"
              disabled={loading}
            />

          </div>


          {/* =================================
              ERROR
          ================================== */}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}


          {/* =================================
              ÉXITO
          ================================== */}

          {success && (
            <div className="register-success">
              {success}
            </div>
          )}


          {/* =================================
              SUBMIT
          ================================== */}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >

            {loading
              ? "Creando cuenta..."
              : form.rol === "CLIENTE"
                ? "Crear cuenta de cliente"
                : "Crear cuenta de empleado"
            }


            {!loading && (
              <UserPlus size={19} />
            )}

          </button>

        </form>

      </section>

    </div>
  );
}

export default Register;