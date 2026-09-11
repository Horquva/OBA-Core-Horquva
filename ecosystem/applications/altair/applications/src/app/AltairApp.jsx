import React, { useState } from "react";
import { AltairProvider } from "../context/AltairContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { Sidebar } from "../components/layout/Sidebar";
import { TopBar } from "../components/layout/TopBar";
import { EmptyState } from "../components/ui/EmptyState";
import { LoginView } from "../features/auth/LoginView";
import { VIEWS } from "../navigation/routes";
import "../styles/global.css";

function ProtectedApp() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState({ view: "overview", id: null, filters: null });

  if (loading) {
    return <main className="login-shell"><div className="login-card">Checking session…</div></main>;
  }

  if (!user) return <LoginView />;

  function navigate(view, id = null, filters = null) {
    setRoute({ view, id, filters });
    window.scrollTo?.({ top: 0, behavior: "instant" });
  }

  const ViewComponent = VIEWS[route.view] || (() => <EmptyState title="Not found" body="This screen doesn't exist." />);

  return (
    <AltairProvider>
      <div className="altair-root">
        <Sidebar route={route} navigate={navigate} />
        <div className="main-col">
          <TopBar route={route} navigate={navigate} />
          <main className="main-content">
            <ViewComponent id={route.id} navigate={navigate} filters={route.filters} initialFilters={route.filters} />
          </main>
        </div>
      </div>
    </AltairProvider>
  );
}

export function AltairApp() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}

export default AltairApp;
