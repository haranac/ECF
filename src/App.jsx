import { useState } from "react";

import Login from "./components/login";
import Register from "./components/register";
import Dashboard from "./components/dashboard";
import RegisterClient from "./components/registerClient";

import "./styles.css";

function App() {

  const [user, setUser] = useState(() => {
    const savedUser =
      localStorage.getItem("canWashUser");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const [page, setPage] = useState("login");

  const handleLogin = (userData) => {
    localStorage.setItem(
      "canWashUser",
      JSON.stringify(userData)
    );

    setUser(userData);
    setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("canWashUser");

    setUser(null);
    setPage("login");
  };

  /* ----------------
     USUARIO NO LOGUEADO
  ---------------- */

  if (!user) {

    if (page === "registerUser") {
      return (
        <Register
          onRegister={() => setPage("login")}
          onBack={() => setPage("login")}
        />
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        onRegister={() =>
          setPage("registerUser")
        }
      />
    );
  }

  /* ----------------
     REGISTRAR CLIENTE
  ---------------- */

  if (page === "registerClient") {
    return (
      <RegisterClient
        onBack={() =>
          setPage("dashboard")
        }
        onSaved={() =>
          setPage("dashboard")
        }
      />
    );
  }

  /* ----------------
     DASHBOARD
  ---------------- */

  return (
    <Dashboard
      user={user}
      onRegisterClient={() =>
        setPage("registerClient")
      }
      onLogout={handleLogout}
    />
  );
}

export default App;