import { useState } from "react";
import Login from "./components/login";
import Dashboard from "./components/dashboard";
import RegisterClient from "./components/registerClient";
import "./styles.css";

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (page === "register") {
    return (
      <RegisterClient
        onBack={() => setPage("dashboard")}
        onSaved={() => setPage("dashboard")}
      />
    );
  }

  return (
    <Dashboard
      user={user}
      onRegisterClient={() => setPage("register")}
      onLogout={() => setUser(null)}
    />
  );
}

export default App;