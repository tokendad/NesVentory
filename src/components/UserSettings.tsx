import React, { useState } from "react";
import { updateUser, generateApiKey, revokeApiKey, type User } from "../lib/api";

interface UserSettingsProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, onClose, onUpdate }) => {
  const [fullName, setFullName] = useState(user.full_name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState(user.api_key || null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const updates: { full_name?: string; password?: string } = {};
      
      // Handle null vs empty string comparison correctly
      if ((fullName || null) !== user.full_name) {
        updates.full_name = fullName;
      }
      
      if (password) {
        updates.password = password;
      }

      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      const updatedUser = await updateUser(user.id, updates);
      onUpdate(updatedUser);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateApiKey() {
    setApiKeyLoading(true);
    setError(null);
    try {
      const updatedUser = await generateApiKey();
      setCurrentApiKey(updatedUser.api_key || null);
      setShowApiKey(true);
      onUpdate(updatedUser);
    } catch (err: any) {
      setError(err.message || "Failed to generate API key");
    } finally {
      setApiKeyLoading(false);
    }
  }

  async function handleRevokeApiKey() {
    if (!window.confirm("Are you sure you want to revoke your API key? Any connected apps will lose access.")) {
      return;
    }
    setApiKeyLoading(true);
    setError(null);
    try {
      const updatedUser = await revokeApiKey();
      setCurrentApiKey(null);
      setShowApiKey(false);
      onUpdate(updatedUser);
    } catch (err: any) {
      setError(err.message || "Failed to revoke API key");
    } finally {
      setApiKeyLoading(false);
    }
  }

  function copyApiKey() {
    if (currentApiKey) {
      navigator.clipboard.writeText(currentApiKey);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "500px" }}>
        <h2>User Settings</h2>
        <form onSubmit={handleSubmit} className="form-vertical">
          <div className="form-group">
            <label htmlFor="settings-email">Email</label>
            <input
              id="settings-email"
              type="email"
              value={user.email}
              disabled
              style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
            />
            <small style={{ color: "#666", fontSize: "0.875rem" }}>Email cannot be changed</small>
          </div>
          <div className="form-group">
            <label htmlFor="settings-fullname">Full Name</label>
            <input
              id="settings-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="settings-password">New Password (leave blank to keep current)</label>
            <input
              id="settings-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {password && (
            <div className="form-group">
              <label htmlFor="settings-confirm-password">Confirm New Password</label>
              <input
                id="settings-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}
          
          {/* API Key Section */}
          <div className="form-group" style={{ borderTop: "1px solid #e0e0e0", paddingTop: "1rem", marginTop: "1rem" }}>
            <label>API Key (for NesVentory Android App)</label>
            <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
              Generate an API key to connect the NesVentory Android companion app.
            </small>
            {currentApiKey ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={currentApiKey}
                    readOnly
                    style={{ flex: 1, backgroundColor: "#f5f5f5", fontFamily: "monospace" }}
                  />
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{ padding: "0.5rem" }}
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={copyApiKey}
                    style={{ padding: "0.5rem" }}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleGenerateApiKey}
                    disabled={apiKeyLoading}
                    style={{ flex: 1 }}
                  >
                    {apiKeyLoading ? "Generating..." : "Regenerate Key"}
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleRevokeApiKey}
                    disabled={apiKeyLoading}
                    style={{ flex: 1, color: "#d32f2f", borderColor: "#d32f2f" }}
                  >
                    {apiKeyLoading ? "Revoking..." : "Revoke Key"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn-outline"
                onClick={handleGenerateApiKey}
                disabled={apiKeyLoading}
                style={{ width: "100%" }}
              >
                {apiKeyLoading ? "Generating..." : "Generate API Key"}
              </button>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserSettings;
