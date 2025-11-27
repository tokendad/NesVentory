import React, { useState, useEffect } from "react";
import { 
  updateUser, 
  generateApiKey, 
  revokeApiKey, 
  getAIStatus, 
  updateAIScheduleSettings, 
  runAIValuation,
  type User,
  type AIStatusResponse,
  type AIValuationRunResponse
} from "../lib/api";

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
  const [copySuccess, setCopySuccess] = useState(false);
  
  // AI Schedule states
  const [aiStatus, setAIStatus] = useState<AIStatusResponse | null>(null);
  const [aiScheduleEnabled, setAIScheduleEnabled] = useState(user.ai_schedule_enabled ?? false);
  const [aiScheduleInterval, setAIScheduleInterval] = useState(user.ai_schedule_interval_days ?? 7);
  const [aiScheduleLoading, setAIScheduleLoading] = useState(false);
  const [aiValuationLoading, setAIValuationLoading] = useState(false);
  const [aiValuationResult, setAIValuationResult] = useState<AIValuationRunResponse | null>(null);
  const [aiScheduleSuccess, setAIScheduleSuccess] = useState(false);

  // Check AI status on mount
  useEffect(() => {
    async function checkAIStatus() {
      try {
        const status = await getAIStatus();
        setAIStatus(status);
      } catch {
        setAIStatus({ enabled: false });
      }
    }
    checkAIStatus();
  }, []);

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate API key";
      setError(errorMessage);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke API key";
      setError(errorMessage);
    } finally {
      setApiKeyLoading(false);
    }
  }

  async function copyApiKey() {
    if (currentApiKey) {
      try {
        await navigator.clipboard.writeText(currentApiKey);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch {
        setError("Failed to copy API key to clipboard");
      }
    }
  }

  async function handleSaveAISchedule() {
    setAIScheduleLoading(true);
    setError(null);
    setAIScheduleSuccess(false);
    try {
      const updatedUser = await updateAIScheduleSettings({
        ai_schedule_enabled: aiScheduleEnabled,
        ai_schedule_interval_days: aiScheduleInterval
      });
      onUpdate(updatedUser);
      setAIScheduleSuccess(true);
      setTimeout(() => setAIScheduleSuccess(false), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update AI schedule settings";
      setError(errorMessage);
    } finally {
      setAIScheduleLoading(false);
    }
  }

  async function handleRunNow() {
    if (!window.confirm("This will run AI valuation on all items without user-supplied values. This may take a while and use API credits. Continue?")) {
      return;
    }
    setAIValuationLoading(true);
    setError(null);
    setAIValuationResult(null);
    try {
      const result = await runAIValuation();
      setAIValuationResult(result);
      // Refresh user to get updated last_run timestamp
      const updatedUser = await updateAIScheduleSettings({
        ai_schedule_enabled: aiScheduleEnabled,
        ai_schedule_interval_days: aiScheduleInterval
      });
      onUpdate(updatedUser);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to run AI valuation";
      setError(errorMessage);
    } finally {
      setAIValuationLoading(false);
    }
  }

  function formatLastRun(dateStr: string | null | undefined): string {
    if (!dateStr) return "Never";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return "Unknown";
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
        <h2>User Settings</h2>
        <form onSubmit={handleSubmit} className="form-vertical">
          <div className="form-group">
            <label htmlFor="settings-email">Email</label>
            <input
              id="settings-email"
              type="email"
              value={user.email}
              disabled
              style={{ backgroundColor: "#f5f5f5", color: "#1f2937", cursor: "not-allowed" }}
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
                    style={{ flex: 1, backgroundColor: "#f5f5f5", color: "#1f2937", fontFamily: "monospace" }}
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
                    style={{ padding: "0.5rem", backgroundColor: copySuccess ? "#e8f5e9" : undefined }}
                  >
                    {copySuccess ? "Copied!" : "Copy"}
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

          {/* AI Valuation Schedule Section */}
          <div className="form-group" style={{ borderTop: "1px solid #e0e0e0", paddingTop: "1rem", marginTop: "1rem" }}>
            <label>🤖 AI Valuation Schedule</label>
            <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
              Automatically update estimated values for all items using AI. Items with user-supplied values will be skipped.
            </small>
            
            {!aiStatus?.enabled ? (
              <div style={{ 
                backgroundColor: "#fff3e0", 
                border: "1px solid #ffb74d", 
                borderRadius: "4px", 
                padding: "0.75rem",
                marginBottom: "0.5rem"
              }}>
                <strong style={{ color: "#e65100" }}>⚠️ AI not configured</strong>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#e65100" }}>
                  To use AI valuation, set GEMINI_API_KEY in your environment.
                </p>
              </div>
            ) : (
              <>
                {/* Rate Limit Warning */}
                <div style={{ 
                  backgroundColor: "#e3f2fd", 
                  border: "1px solid #64b5f6", 
                  borderRadius: "4px", 
                  padding: "0.75rem",
                  marginBottom: "1rem"
                }}>
                  <strong style={{ color: "#1565c0" }}>ℹ️ Rate Limit Notice</strong>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#1565c0" }}>
                    Running AI valuation uses Gemini API credits. Check your tier's rate limits at{" "}
                    <a 
                      href="https://ai.google.dev/gemini-api/docs/rate-limits" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: "#1565c0", textDecoration: "underline" }}
                    >
                      Gemini API Rate Limits
                    </a>
                  </p>
                </div>

                {/* Enable/Disable Toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <input
                    type="checkbox"
                    id="ai-schedule-enabled"
                    checked={aiScheduleEnabled}
                    onChange={(e) => setAIScheduleEnabled(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  <label htmlFor="ai-schedule-enabled" style={{ marginBottom: 0 }}>
                    Enable scheduled AI valuation
                  </label>
                </div>

                {/* Interval Selection */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <label htmlFor="ai-schedule-interval" style={{ fontSize: "0.875rem" }}>
                    Run every:
                  </label>
                  <select
                    id="ai-schedule-interval"
                    value={aiScheduleInterval}
                    onChange={(e) => setAIScheduleInterval(parseInt(e.target.value))}
                    style={{ 
                      marginLeft: "0.5rem", 
                      padding: "0.375rem", 
                      borderRadius: "4px", 
                      border: "1px solid var(--border-color)" 
                    }}
                    disabled={!aiScheduleEnabled}
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>1 week</option>
                    <option value={14}>2 weeks</option>
                    <option value={30}>1 month</option>
                  </select>
                </div>

                {/* Last Run Info */}
                <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.75rem" }}>
                  Last run: {formatLastRun(user.ai_schedule_last_run)}
                </div>

                {/* Save Schedule Button */}
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleSaveAISchedule}
                  disabled={aiScheduleLoading}
                  style={{ width: "100%", marginBottom: "0.5rem" }}
                >
                  {aiScheduleLoading ? "Saving..." : aiScheduleSuccess ? "✓ Saved!" : "Save Schedule Settings"}
                </button>

                {/* Run Now Button */}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleRunNow}
                  disabled={aiValuationLoading}
                  style={{ width: "100%" }}
                >
                  {aiValuationLoading ? "Running AI Valuation..." : "🚀 Run Now"}
                </button>

                {/* Valuation Result */}
                {aiValuationResult && (
                  <div style={{ 
                    backgroundColor: "#e8f5e9", 
                    border: "1px solid #81c784", 
                    borderRadius: "4px", 
                    padding: "0.75rem",
                    marginTop: "0.75rem"
                  }}>
                    <strong style={{ color: "#2e7d32" }}>✓ Valuation Complete</strong>
                    <ul style={{ margin: "0.5rem 0 0 1rem", fontSize: "0.875rem", color: "#2e7d32" }}>
                      <li>Items processed: {aiValuationResult.items_processed}</li>
                      <li>Items updated: {aiValuationResult.items_updated}</li>
                      <li>Items skipped (user values): {aiValuationResult.items_skipped}</li>
                    </ul>
                  </div>
                )}
              </>
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
