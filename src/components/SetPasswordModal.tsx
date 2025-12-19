import React, { useState } from "react";
import { setPassword, validatePassword } from "../lib/api";

interface SetPasswordModalProps {
  onSuccess: () => void;
}

const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setValidationError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    setLoading(true);
    try {
      await setPassword(newPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  }

  // Calculate password strength
  function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: "", color: "" };
    
    let score = 0;
    
    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character types
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 2) return { score, label: "Weak", color: "#dc3545" };
    if (score <= 4) return { score, label: "Fair", color: "#ffc107" };
    if (score <= 5) return { score, label: "Good", color: "#28a745" };
    return { score, label: "Strong", color: "#28a745" };
  }

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "500px" }}>
        <h2>Set Your Password</h2>
        <p style={{ marginBottom: "1.5rem", color: "var(--muted)" }}>
          You must set a password to continue. This password will be used for future logins.
        </p>
        <form onSubmit={handleSubmit} className="form-vertical">
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setValidationError(null);
              }}
              required
              autoComplete="new-password"
              minLength={8}
            />
            {newPassword && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ 
                  height: "4px", 
                  backgroundColor: "#e0e0e0", 
                  borderRadius: "2px",
                  overflow: "hidden"
                }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${(strength.score / 6) * 100}%`, 
                    backgroundColor: strength.color,
                    transition: "all 0.3s ease"
                  }} />
                </div>
                <small style={{ color: strength.color, fontSize: "0.875rem", display: "block", marginTop: "0.25rem" }}>
                  {strength.label}
                </small>
              </div>
            )}
            {validationError && (
              <small style={{ color: "var(--error, #dc3545)", fontSize: "0.875rem", display: "block", marginTop: "0.25rem" }}>
                {validationError}
              </small>
            )}
            <small style={{ color: "var(--muted)", fontSize: "0.875rem", display: "block", marginTop: "0.25rem" }}>
              Must be at least 8 characters with 1 number
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
              }}
              required
              autoComplete="new-password"
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Setting Password..." : "Set Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordModal;
