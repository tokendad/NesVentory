import React, { useState } from "react";
import { login } from "../lib/api";

interface LoginFormProps {
  onSuccess: (token: string, email: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await login(email, password);
      localStorage.setItem("NesVentory_token", resp.access_token);
      localStorage.setItem("NesVentory_user_email", email);
      onSuccess(resp.access_token, email);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <span className="logo-dot large" />
          <h1>NesVentory</h1>
          <p className="muted">Sign in to your home inventory</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <div className="error-banner">{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="login-footer">
          API: <code>{import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"}</code>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
