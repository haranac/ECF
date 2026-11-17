import { useState } from "react";
import { PawPrint, RefreshCw, UserRound } from "lucide-react";
import Sidebar from "../utils/sidebar";
import MobileMenu from "../utils/mobileMenu";
import { Button } from "./ui";
import { dateLabel } from "../lib/appointments";

export default function DashboardLayout({
  user,
  view,
  onChangeView,
  onProfile,
  onLogout,
  onRefresh,
  loading,
  title,
  children,
}) {
  const [menu, setMenu] = useState(false);
  const navigate = (next) => {
    setMenu(false);
    onChangeView(next);
  };
  const profile = () => {
    setMenu(false);
    onProfile(view);
  };
  return (
    <div className="min-h-screen bg-canwash-background">
      <Sidebar
        user={user}
        view={view}
        isOpen={menu}
        onChangeView={navigate}
        onProfile={profile}
        onLogout={() => {
          setMenu(false);
          onLogout();
        }}
      />
      <MobileMenu
        isOpen={menu}
        onToggle={() => setMenu((m) => !m)}
        onClose={() => setMenu(false)}
      />
      <main className="mx-auto min-h-screen max-w-[1700px] px-4 pb-24 sm:px-6 md:ml-20 md:px-7 lg:ml-64 lg:px-9">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-canwash-light/50 py-5">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-canwash-muted">
              <PawPrint size={14} />
              Can Wash · cuidado a domicilio
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-canwash-dark">
              {title}
            </h1>
            <p className="mt-1 text-xs capitalize text-canwash-muted">
              {dateLabel(new Date())}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                tone="ghost"
                onClick={onRefresh}
                disabled={loading}
                aria-label="Actualizar información"
              >
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
              </Button>
            )}
            <Button tone="secondary" onClick={profile}>
              <UserRound size={17} />
              <span className="max-w-36 truncate">
                {user.nombre || "Mi perfil"}
              </span>
            </Button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
