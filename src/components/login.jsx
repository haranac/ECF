import { useState } from "react";
import {
  Lock,
  Mail,
  PawPrint,
  LogIn,
} from "lucide-react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      email === "admin@canwash.com" &&
      password === "admin123"
    ) {
      onLogin({
        name: "Administrador",
        email,
        role: "Administrador",
      });

      return;
    }

    setError("Correo o contraseña incorrectos.");
  };

  return (
    <div className="login-page">
      <div className="login-decoration">
        <PawPrint size={70} />

        <h1>Can Wash</h1>

        <p>ESTÉTICA CANINA Y FELINA</p>
      </div>

      <div className="login-card">
        <div className="brand-icon">
          <PawPrint size={38} />
        </div>

        <h2>Bienvenido</h2>

        <p className="subtitle">
          Inicia sesión para acceder al panel de administración.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Correo electrónico</label>

          <div className="input-container">
            <Mail size={20} />

            <input
              type="email"
              placeholder="admin@canwash.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>Contraseña</label>

          <div className="input-container">
            <Lock size={20} />

            <input
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="primary-button">
            Iniciar sesión
            <LogIn size={19} />
          </button>
        </form>

        <div className="demo-access">
          <strong>Acceso de prueba</strong>
          <span>admin@canwash.com</span>
          <span>admin123</span>
        </div>
      </div>
    </div>
  );
}

export default Login;