import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/global.css";

export function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState(import.meta.env.VITE_ALTAIR_DEMO_EMAIL || "admin@altair.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">ALTAIR</p>
        <h1>Sign in</h1>
        <p className="muted">Workflow Automation Platform</p>

        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        {error && <p className="login-error" role="alert">{error}</p>}

        <button className="login-button" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="login-help">
          Development demo credentials are documented in README.md. Production passwords must be supplied through environment configuration.
        </p>
      </form>
    </main>
  );
}
