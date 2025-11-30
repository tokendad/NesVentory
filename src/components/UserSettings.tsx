import React, { useState, useEffect, useCallback } from "react";
import { 
  updateUser, 
  generateApiKey, 
  revokeApiKey, 
  getAIStatus, 
  updateAIScheduleSettings, 
  runAIValuation,
  enrichFromDataTags,
  getGoogleOAuthStatus,
  getGDriveStatus,
  connectGDrive,
  disconnectGDrive,
  createGDriveBackup,
  listGDriveBackups,
  deleteGDriveBackup,
  getAvailableUPCDatabases,
  getUPCDatabaseSettings,
  updateUPCDatabaseSettings,
  fetchItems,
  getUserLocationAccess,
  type User,
  type AIStatusResponse,
  type AIValuationRunResponse,
  type AIEnrichmentRunResponse,
  type GDriveStatus,
  type GDriveBackupResponse,
  type GDriveBackupFile,
  type AvailableUPCDatabase,
  type UPCDatabaseConfig,
  type Location
} from "../lib/api";

interface UserSettingsProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

// Type definition for Google Identity Services OAuth2 code client
interface GoogleOAuth2CodeClient {
  requestCode: () => void;
}

interface GoogleOAuth2Config {
  client_id: string;
  scope: string;
  callback: (response: { code?: string }) => void;
}

interface GoogleOAuth2 {
  initCodeClient: (config: GoogleOAuth2Config) => GoogleOAuth2CodeClient;
}

interface GoogleAccounts {
  oauth2?: GoogleOAuth2;
}

interface GoogleWindow extends Window {
  google?: {
    accounts?: GoogleAccounts;
  };
}

type TabType = 'profile' | 'api' | 'stats';

const UserSettings: React.FC<UserSettingsProps> = ({ user, onClose, onUpdate }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  // Profile tab states
  const [fullName, setFullName] = useState(user.full_name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // API Key states
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState(user.api_key || null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // AI Schedule states
  const [aiStatus, setAIStatus] = useState<AIStatusResponse | null>(null);
  const [aiStatusLoading, setAIStatusLoading] = useState(true);
  const [aiScheduleEnabled, setAIScheduleEnabled] = useState(user.ai_schedule_enabled ?? false);
  const [aiScheduleInterval, setAIScheduleInterval] = useState(user.ai_schedule_interval_days ?? 7);
  const [aiScheduleLoading, setAIScheduleLoading] = useState(false);
  const [aiValuationLoading, setAIValuationLoading] = useState(false);
  const [aiValuationResult, setAIValuationResult] = useState<AIValuationRunResponse | null>(null);
  const [aiScheduleSuccess, setAIScheduleSuccess] = useState(false);
  
  // AI Enrichment states
  const [aiEnrichmentLoading, setAIEnrichmentLoading] = useState(false);
  const [aiEnrichmentResult, setAIEnrichmentResult] = useState<AIEnrichmentRunResponse | null>(null);

  // Google Drive Backup states
  const [gdriveStatus, setGdriveStatus] = useState<GDriveStatus | null>(null);
  const [gdriveStatusLoading, setGdriveStatusLoading] = useState(true);
  const [gdriveConnecting, setGdriveConnecting] = useState(false);
  const [gdriveBackupLoading, setGdriveBackupLoading] = useState(false);
  const [gdriveBackupResult, setGdriveBackupResult] = useState<GDriveBackupResponse | null>(null);
  const [gdriveBackups, setGdriveBackups] = useState<GDriveBackupFile[]>([]);
  const [gdriveBackupsLoading, setGdriveBackupsLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  
  // UPC Database states
  const [availableUpcDatabases, setAvailableUpcDatabases] = useState<AvailableUPCDatabase[]>([]);
  const [upcDatabases, setUpcDatabases] = useState<UPCDatabaseConfig[]>([]);
  const [upcDatabasesLoading, setUpcDatabasesLoading] = useState(true);
  const [upcDatabasesSaving, setUpcDatabasesSaving] = useState(false);
  const [upcSaveSuccess, setUpcSaveSuccess] = useState(false);
  const [editingUpcDb, setEditingUpcDb] = useState<string | null>(null);
  const [editingApiKey, setEditingApiKey] = useState("");
  
  // User stats states
  const [itemCount, setItemCount] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [userLocations, setUserLocations] = useState<Location[]>([]);

  // Check AI status on mount
  useEffect(() => {
    async function checkAIStatus() {
      try {
        const status = await getAIStatus();
        setAIStatus(status);
      } catch {
        setAIStatus({ enabled: false });
      } finally {
        setAIStatusLoading(false);
      }
    }
    checkAIStatus();
  }, []);

  // Check Google Drive status on mount
  useEffect(() => {
    async function checkGDriveStatus() {
      try {
        // Get Google OAuth status (for client ID)
        const oauthStatus = await getGoogleOAuthStatus();
        if (oauthStatus.client_id) {
          setGoogleClientId(oauthStatus.client_id);
        }
        
        // Get Google Drive connection status
        const status = await getGDriveStatus();
        setGdriveStatus(status);
        
        // If connected, fetch backups list
        if (status.connected) {
          fetchGDriveBackups();
        }
      } catch {
        setGdriveStatus({ enabled: false, connected: false, last_backup: null });
      } finally {
        setGdriveStatusLoading(false);
      }
    }
    checkGDriveStatus();
  }, []);
  
  // Load UPC database settings on mount
  useEffect(() => {
    async function loadUpcDatabases() {
      try {
        const [available, settings] = await Promise.all([
          getAvailableUPCDatabases(),
          getUPCDatabaseSettings()
        ]);
        setAvailableUpcDatabases(available.databases);
        setUpcDatabases(settings.upc_databases || []);
      } catch {
        // Silently fail - UPC databases are optional
      } finally {
        setUpcDatabasesLoading(false);
      }
    }
    loadUpcDatabases();
  }, []);
  
  // Load user stats on mount
  useEffect(() => {
    async function loadUserStats() {
      try {
        const [items, locations] = await Promise.all([
          fetchItems(),
          getUserLocationAccess(user.id)
        ]);
        setItemCount(items.length);
        setUserLocations(locations);
      } catch {
        // Silently fail - stats are optional
      } finally {
        setStatsLoading(false);
      }
    }
    loadUserStats();
  }, [user.id]);

  // Callback for Google Drive OAuth
  const handleGDriveCallback = useCallback(async (response: { code?: string }) => {
    if (!response.code) {
      setError("Google Drive authorization failed");
      setGdriveConnecting(false);
      return;
    }
    
    try {
      const status = await connectGDrive(response.code);
      setGdriveStatus(status);
      setGdriveBackupResult(null);
      // Fetch backups after connecting
      if (status.connected) {
        fetchGDriveBackups();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect Google Drive";
      setError(errorMessage);
    } finally {
      setGdriveConnecting(false);
    }
  }, []);

  async function fetchGDriveBackups() {
    setGdriveBackupsLoading(true);
    try {
      const result = await listGDriveBackups();
      setGdriveBackups(result.backups);
    } catch {
      setGdriveBackups([]);
    } finally {
      setGdriveBackupsLoading(false);
    }
  }

  async function handleConnectGDrive() {
    if (!googleClientId) {
      setError("Google OAuth is not configured");
      return;
    }
    
    setGdriveConnecting(true);
    setError(null);
    
    // Use Google Identity Services to get authorization code
    const googleWindow = window as GoogleWindow;
    const google = googleWindow.google;
    
    if (!google?.accounts?.oauth2) {
      // Load the Google Identity Services script if not loaded
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initiateGDriveOAuth();
      };
      script.onerror = () => {
        setError("Failed to load Google Sign-In");
        setGdriveConnecting(false);
      };
      document.body.appendChild(script);
    } else {
      initiateGDriveOAuth();
    }
  }

  function initiateGDriveOAuth() {
    const googleWindow = window as GoogleWindow;
    const google = googleWindow.google;
    
    if (!google?.accounts?.oauth2 || !googleClientId) {
      setError("Google Sign-In not ready");
      setGdriveConnecting(false);
      return;
    }
    
    const client = google.accounts.oauth2.initCodeClient({
      client_id: googleClientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: handleGDriveCallback,
    });
    
    client.requestCode();
  }

  async function handleDisconnectGDrive() {
    if (!window.confirm("Are you sure you want to disconnect Google Drive? Your backups will remain in Google Drive but you won't be able to create new ones.")) {
      return;
    }
    
    setGdriveConnecting(true);
    setError(null);
    
    try {
      const status = await disconnectGDrive();
      setGdriveStatus(status);
      setGdriveBackups([]);
      setGdriveBackupResult(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to disconnect Google Drive";
      setError(errorMessage);
    } finally {
      setGdriveConnecting(false);
    }
  }

  async function handleCreateBackup() {
    setGdriveBackupLoading(true);
    setError(null);
    setGdriveBackupResult(null);
    
    try {
      const result = await createGDriveBackup();
      setGdriveBackupResult(result);
      // Refresh backups list
      fetchGDriveBackups();
      // Update status to refresh last_backup
      const status = await getGDriveStatus();
      setGdriveStatus(status);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create backup";
      setError(errorMessage);
    } finally {
      setGdriveBackupLoading(false);
    }
  }

  async function handleDeleteBackup(backupId: string, backupName: string) {
    if (!window.confirm(`Are you sure you want to delete backup "${backupName}"? This cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteGDriveBackup(backupId);
      // Refresh backups list
      fetchGDriveBackups();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete backup";
      setError(errorMessage);
    }
  }

  function formatBackupDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  }

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
    if (!window.confirm("This will run AI valuation on all items without user-supplied values. This may take a while and use API credits. Large inventories on the free tier may take significant time due to rate limiting. Continue?")) {
      return;
    }
    setAIValuationLoading(true);
    setError(null);
    setAIValuationResult(null);
    try {
      const result = await runAIValuation();
      setAIValuationResult(result);
      // Update user with the new last_run timestamp from the response
      if (result.ai_schedule_last_run) {
        onUpdate({
          ...user,
          ai_schedule_last_run: result.ai_schedule_last_run
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to run AI valuation";
      setError(errorMessage);
    } finally {
      setAIValuationLoading(false);
    }
  }

  async function handleEnrichFromDataTags() {
    if (!window.confirm("This will scan all items with data tag photos and use AI to fill in missing details (brand, model, serial, value). This may take a while and use API credits. Large inventories on the free tier may take significant time due to rate limiting. Continue?")) {
      return;
    }
    setAIEnrichmentLoading(true);
    setError(null);
    setAIEnrichmentResult(null);
    try {
      const result = await enrichFromDataTags();
      setAIEnrichmentResult(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to run AI enrichment";
      setError(errorMessage);
    } finally {
      setAIEnrichmentLoading(false);
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

  // UPC Database handlers
  async function handleSaveUpcDatabases() {
    setUpcDatabasesSaving(true);
    setError(null);
    setUpcSaveSuccess(false);
    try {
      const updatedUser = await updateUPCDatabaseSettings(upcDatabases);
      onUpdate(updatedUser);
      setUpcSaveSuccess(true);
      setTimeout(() => setUpcSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save UPC database settings";
      setError(errorMessage);
    } finally {
      setUpcDatabasesSaving(false);
    }
  }

  function handleUpcDatabaseToggle(dbId: string, enabled: boolean) {
    setUpcDatabases(prev => 
      prev.map(db => db.id === dbId ? { ...db, enabled } : db)
    );
  }

  function handleUpcDatabaseApiKeyEdit(dbId: string) {
    const db = upcDatabases.find(d => d.id === dbId);
    setEditingUpcDb(dbId);
    setEditingApiKey(db?.api_key || "");
  }

  function handleUpcDatabaseApiKeySave() {
    if (editingUpcDb) {
      setUpcDatabases(prev => 
        prev.map(db => db.id === editingUpcDb ? { ...db, api_key: editingApiKey || null } : db)
      );
      setEditingUpcDb(null);
      setEditingApiKey("");
    }
  }

  function handleUpcDatabaseApiKeyCancel() {
    setEditingUpcDb(null);
    setEditingApiKey("");
  }

  function moveUpcDatabaseUp(index: number) {
    if (index > 0) {
      const newDatabases = [...upcDatabases];
      [newDatabases[index - 1], newDatabases[index]] = [newDatabases[index], newDatabases[index - 1]];
      setUpcDatabases(newDatabases);
    }
  }

  function moveUpcDatabaseDown(index: number) {
    if (index < upcDatabases.length - 1) {
      const newDatabases = [...upcDatabases];
      [newDatabases[index], newDatabases[index + 1]] = [newDatabases[index + 1], newDatabases[index]];
      setUpcDatabases(newDatabases);
    }
  }

  function getUpcDatabaseInfo(dbId: string): AvailableUPCDatabase | undefined {
    return availableUpcDatabases.find(db => db.id === dbId);
  }

  function getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'admin': return '#dc2626';
      case 'editor': return '#f59e0b';
      case 'viewer': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  // Render the Profile Tab content
  const renderProfileTab = () => (
    <div className="tab-content">
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
    </div>
  );

  // Render the API Tab content
  const renderApiTab = () => (
    <div className="tab-content">
      {/* API Key Section */}
      <div className="form-group" style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid #e0e0e0" }}>
        <label>🔑 API Key (for NesVentory Android App)</label>
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

      {/* UPC Database Configuration */}
      <div className="form-group" style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid #e0e0e0" }}>
        <label>📊 UPC Database Priority</label>
        <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
          Configure the order and API keys for UPC product lookup databases. Higher items are tried first.
        </small>
        
        {upcDatabasesLoading ? (
          <div style={{ 
            backgroundColor: "#e3f2fd", 
            border: "1px solid #64b5f6", 
            borderRadius: "4px", 
            padding: "0.75rem",
            marginBottom: "0.5rem"
          }}>
            <strong style={{ color: "#1565c0" }}>⏳ Loading UPC database configuration...</strong>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {upcDatabases.map((db, index) => {
                const dbInfo = getUpcDatabaseInfo(db.id);
                return (
                  <div key={db.id} style={{
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--border-subtle)",
                    background: db.enabled ? "var(--bg-elevated)" : "var(--bg-elevated-softer)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <button
                          type="button"
                          onClick={() => moveUpcDatabaseUp(index)}
                          disabled={index === 0}
                          style={{ 
                            background: "transparent", 
                            border: "none", 
                            cursor: index === 0 ? "not-allowed" : "pointer",
                            opacity: index === 0 ? 0.3 : 1,
                            padding: "0.125rem",
                            fontSize: "0.75rem"
                          }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveUpcDatabaseDown(index)}
                          disabled={index === upcDatabases.length - 1}
                          style={{ 
                            background: "transparent", 
                            border: "none", 
                            cursor: index === upcDatabases.length - 1 ? "not-allowed" : "pointer",
                            opacity: index === upcDatabases.length - 1 ? 0.3 : 1,
                            padding: "0.125rem",
                            fontSize: "0.75rem"
                          }}
                        >
                          ▼
                        </button>
                      </div>
                      <input
                        type="checkbox"
                        checked={db.enabled}
                        onChange={(e) => handleUpcDatabaseToggle(db.id, e.target.checked)}
                        style={{ width: "auto" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                          {dbInfo?.name || db.id}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          {dbInfo?.description}
                        </div>
                      </div>
                      {dbInfo?.requires_api_key && (
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => handleUpcDatabaseApiKeyEdit(db.id)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          {db.api_key ? "✓ API Key" : "Set API Key"}
                        </button>
                      )}
                    </div>
                    
                    {/* API Key Edit Dialog */}
                    {editingUpcDb === db.id && (
                      <div style={{ 
                        marginTop: "0.75rem", 
                        paddingTop: "0.75rem", 
                        borderTop: "1px solid var(--border-subtle)" 
                      }}>
                        <label style={{ fontSize: "0.8rem", marginBottom: "0.25rem", display: "block" }}>
                          API Key for {dbInfo?.name}
                        </label>
                        <input
                          type="text"
                          value={editingApiKey}
                          onChange={(e) => setEditingApiKey(e.target.value)}
                          placeholder="Enter API key..."
                          style={{ width: "100%", marginBottom: "0.5rem" }}
                        />
                        {dbInfo?.api_key_url && (
                          <small style={{ display: "block", marginBottom: "0.5rem", color: "var(--muted)" }}>
                            Get an API key at:{" "}
                            <a 
                              href={dbInfo.api_key_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ color: "var(--accent)" }}
                            >
                              {dbInfo.api_key_url}
                            </a>
                          </small>
                        )}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleUpcDatabaseApiKeySave}
                            style={{ flex: 1, padding: "0.35rem" }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={handleUpcDatabaseApiKeyCancel}
                            style={{ flex: 1, padding: "0.35rem" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveUpcDatabases}
              disabled={upcDatabasesSaving}
              style={{ width: "100%" }}
            >
              {upcDatabasesSaving ? "Saving..." : upcSaveSuccess ? "✓ Saved!" : "Save UPC Database Settings"}
            </button>
          </>
        )}
      </div>

      {/* Google Drive Backup Section */}
      <div className="form-group" style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid #e0e0e0" }}>
        <label>☁️ Google Drive Backup</label>
        <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
          Backup your inventory data to Google Drive for safekeeping.
        </small>
        
        {gdriveStatusLoading ? (
          <div style={{ 
            backgroundColor: "#e3f2fd", 
            border: "1px solid #64b5f6", 
            borderRadius: "4px", 
            padding: "0.75rem",
            marginBottom: "0.5rem"
          }}>
            <strong style={{ color: "#1565c0" }}>⏳ Checking Google Drive configuration...</strong>
          </div>
        ) : !gdriveStatus?.enabled ? (
          <div style={{ 
            backgroundColor: "#fff3e0", 
            border: "1px solid #ffb74d", 
            borderRadius: "4px", 
            padding: "0.75rem",
            marginBottom: "0.5rem"
          }}>
            <strong style={{ color: "#e65100" }}>⚠️ Google Drive backup not configured</strong>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#e65100" }}>
              To enable Google Drive backup, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment.
            </p>
          </div>
        ) : !gdriveStatus?.connected ? (
          <>
            <div style={{ 
              backgroundColor: "#e3f2fd", 
              border: "1px solid #64b5f6", 
              borderRadius: "4px", 
              padding: "0.75rem",
              marginBottom: "0.75rem"
            }}>
              <strong style={{ color: "#1565c0" }}>ℹ️ Connect Google Drive</strong>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#1565c0" }}>
                Connect your Google Drive to enable automatic backups. Only NesVentory backup files will be created;
                we won't access any other files in your Drive.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConnectGDrive}
              disabled={gdriveConnecting}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {gdriveConnecting ? "Connecting..." : "Connect Google Drive"}
            </button>
          </>
        ) : (
          <>
            {/* Connected Status */}
            <div style={{ 
              backgroundColor: "#e8f5e9", 
              border: "1px solid #81c784", 
              borderRadius: "4px", 
              padding: "0.75rem",
              marginBottom: "0.75rem"
            }}>
              <strong style={{ color: "#2e7d32" }}>✓ Google Drive Connected</strong>
              {gdriveStatus.last_backup && (
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#2e7d32" }}>
                  Last backup: {formatBackupDate(gdriveStatus.last_backup)}
                </p>
              )}
            </div>

            {/* Backup Now Button */}
            <button
              type="button"
              className="btn-primary"
              onClick={handleCreateBackup}
              disabled={gdriveBackupLoading}
              style={{ width: "100%", marginBottom: "0.5rem" }}
            >
              {gdriveBackupLoading ? "Creating Backup..." : "📤 Backup Now"}
            </button>

            {/* Backup Result */}
            {gdriveBackupResult && (
              <div style={{ 
                backgroundColor: gdriveBackupResult.success ? "#e8f5e9" : "#ffebee", 
                border: `1px solid ${gdriveBackupResult.success ? "#81c784" : "#ef5350"}`, 
                borderRadius: "4px", 
                padding: "0.75rem",
                marginBottom: "0.75rem"
              }}>
                <strong style={{ color: gdriveBackupResult.success ? "#2e7d32" : "#c62828" }}>
                  {gdriveBackupResult.success ? "✓ Backup Created" : "✗ Backup Failed"}
                </strong>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: gdriveBackupResult.success ? "#2e7d32" : "#c62828" }}>
                  {gdriveBackupResult.message}
                </p>
              </div>
            )}

            {/* Backups List */}
            <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.875rem", marginBottom: 0 }}>📁 Saved Backups</label>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={fetchGDriveBackups}
                  disabled={gdriveBackupsLoading}
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                >
                  {gdriveBackupsLoading ? "..." : "↻ Refresh"}
                </button>
              </div>
              
              {gdriveBackupsLoading ? (
                <p style={{ fontSize: "0.875rem", color: "#666" }}>Loading backups...</p>
              ) : gdriveBackups.length === 0 ? (
                <p style={{ fontSize: "0.875rem", color: "#666" }}>No backups found. Create your first backup above.</p>
              ) : (
                <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {gdriveBackups.map((backup) => (
                    <div 
                      key={backup.id} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between",
                        padding: "0.5rem",
                        borderBottom: "1px solid #e0e0e0",
                        fontSize: "0.875rem"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{backup.name}</div>
                        <div style={{ color: "#666", fontSize: "0.75rem" }}>
                          {formatBackupDate(backup.created_time)}
                          {backup.size && !isNaN(Number(backup.size)) && ` • ${(Number(backup.size) / 1024).toFixed(1)} KB`}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => handleDeleteBackup(backup.id, backup.name)}
                        style={{ 
                          padding: "0.25rem 0.5rem", 
                          fontSize: "0.75rem",
                          color: "#d32f2f",
                          borderColor: "#d32f2f"
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disconnect Button */}
            <button
              type="button"
              className="btn-outline"
              onClick={handleDisconnectGDrive}
              disabled={gdriveConnecting}
              style={{ 
                width: "100%", 
                marginTop: "0.75rem",
                color: "#d32f2f", 
                borderColor: "#d32f2f" 
              }}
            >
              {gdriveConnecting ? "Disconnecting..." : "Disconnect Google Drive"}
            </button>
          </>
        )}
      </div>

      {/* AI Valuation Schedule Section */}
      <div className="form-group">
        <label>🤖 AI Valuation Schedule</label>
        <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
          Automatically update estimated values for all items using AI. Items with user-supplied values will be skipped.
        </small>
        
        {aiStatusLoading ? (
          <div style={{ 
            backgroundColor: "#e3f2fd", 
            border: "1px solid #64b5f6", 
            borderRadius: "4px", 
            padding: "0.75rem",
            marginBottom: "0.5rem"
          }}>
            <strong style={{ color: "#1565c0" }}>⏳ Checking AI configuration...</strong>
          </div>
        ) : !aiStatus?.enabled ? (
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
              disabled={aiValuationLoading || aiEnrichmentLoading}
              style={{ width: "100%" }}
            >
              {aiValuationLoading ? "Running AI Valuation..." : "🚀 Run Valuation Now"}
            </button>

            {/* Valuation Result */}
            {aiValuationResult && (
              <div style={{ 
                backgroundColor: aiValuationResult.message.includes("rate limit") ? "#fff3e0" : "#e8f5e9", 
                border: `1px solid ${aiValuationResult.message.includes("rate limit") ? "#ffb74d" : "#81c784"}`, 
                borderRadius: "4px", 
                padding: "0.75rem",
                marginTop: "0.75rem"
              }}>
                <strong style={{ color: aiValuationResult.message.includes("rate limit") ? "#e65100" : "#2e7d32" }}>
                  {aiValuationResult.message.includes("rate limit") ? "⚠️ Valuation Partial" : "✓ Valuation Complete"}
                </strong>
                <ul style={{ margin: "0.5rem 0 0 1rem", fontSize: "0.875rem", color: aiValuationResult.message.includes("rate limit") ? "#e65100" : "#2e7d32" }}>
                  <li>Items processed: {aiValuationResult.items_processed}</li>
                  <li>Items updated: {aiValuationResult.items_updated}</li>
                  <li>Items skipped (user values): {aiValuationResult.items_skipped}</li>
                </ul>
                {aiValuationResult.message.includes("rate limit") && (
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#e65100" }}>
                    Rate limit reached. Please wait and retry later.
                  </p>
                )}
              </div>
            )}

            {/* Enrich from Data Tags Section */}
            <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "1rem", marginTop: "1rem" }}>
              <label>📷 Enrich from Data Tags</label>
              <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
                Scan items with data tag photos to extract brand, model, serial number, and estimated value.
                Useful for filling in missing details after imports.
              </small>
              
              {/* Processing Time Warning */}
              <div style={{ 
                backgroundColor: "#fff3e0", 
                border: "1px solid #ffb74d", 
                borderRadius: "4px", 
                padding: "0.5rem",
                marginBottom: "0.75rem",
                fontSize: "0.8rem"
              }}>
                <strong style={{ color: "#e65100" }}>⏱️ Processing Time Notice</strong>
                <p style={{ margin: "0.25rem 0 0 0", color: "#e65100" }}>
                  Large inventories on the free tier may take significant time to process due to rate limiting 
                  (~4 seconds per item). Consider running during off-peak hours.
                </p>
              </div>

              <button
                type="button"
                className="btn-outline"
                onClick={handleEnrichFromDataTags}
                disabled={aiValuationLoading || aiEnrichmentLoading}
                style={{ width: "100%" }}
              >
                {aiEnrichmentLoading ? "Enriching Items..." : "📷 Enrich from Data Tags"}
              </button>

              {/* Enrichment Result */}
              {aiEnrichmentResult && (
                <div style={{ 
                  backgroundColor: aiEnrichmentResult.quota_exceeded ? "#fff3e0" : "#e8f5e9", 
                  border: `1px solid ${aiEnrichmentResult.quota_exceeded ? "#ffb74d" : "#81c784"}`, 
                  borderRadius: "4px", 
                  padding: "0.75rem",
                  marginTop: "0.75rem"
                }}>
                  <strong style={{ color: aiEnrichmentResult.quota_exceeded ? "#e65100" : "#2e7d32" }}>
                    {aiEnrichmentResult.quota_exceeded ? "⚠️ Enrichment Partial" : "✓ Enrichment Complete"}
                  </strong>
                  <ul style={{ margin: "0.5rem 0 0 1rem", fontSize: "0.875rem", color: aiEnrichmentResult.quota_exceeded ? "#e65100" : "#2e7d32" }}>
                    <li>Items with data tags: {aiEnrichmentResult.items_with_data_tags}</li>
                    <li>Items processed: {aiEnrichmentResult.items_processed}</li>
                    <li>Items updated: {aiEnrichmentResult.items_updated}</li>
                    <li>Items skipped (complete): {aiEnrichmentResult.items_skipped}</li>
                  </ul>
                  {aiEnrichmentResult.quota_exceeded && (
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#e65100" }}>
                      Rate limit reached. Please wait and retry later.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Render the Stats Tab content
  const renderStatsTab = () => (
    <div className="tab-content">
      {statsLoading ? (
        <div style={{ 
          backgroundColor: "#e3f2fd", 
          border: "1px solid #64b5f6", 
          borderRadius: "4px", 
          padding: "0.75rem",
          marginBottom: "0.5rem"
        }}>
          <strong style={{ color: "#1565c0" }}>⏳ Loading user statistics...</strong>
        </div>
      ) : (
        <>
          {/* Items Added */}
          <div className="form-group" style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid #e0e0e0" }}>
            <label>📦 Items Added</label>
            <div style={{ 
              fontSize: "2rem", 
              fontWeight: 600, 
              color: "var(--accent)",
              padding: "0.5rem 0"
            }}>
              {itemCount}
            </div>
            <small style={{ color: "#666", fontSize: "0.875rem" }}>
              Total items in your inventory
            </small>
          </div>

          {/* Security Settings / Role */}
          <div className="form-group" style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid #e0e0e0" }}>
            <label>🔐 Security Settings</label>
            <div style={{ marginTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 500 }}>Current Role:</span>
                <span style={{ 
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  backgroundColor: getRoleBadgeColor(user.role),
                  color: "white",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "capitalize"
                }}>
                  {user.role}
                </span>
              </div>
              <small style={{ color: "#666", fontSize: "0.875rem", display: "block" }}>
                {user.role === 'admin' && "Full access: Can manage users, locations, and all items."}
                {user.role === 'editor' && "Edit access: Can add and modify items and locations."}
                {user.role === 'viewer' && "View only: Can view items and locations but cannot make changes."}
              </small>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 500 }}>Approval Status:</span>
                <span style={{ 
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  backgroundColor: user.is_approved ? "#16a34a" : "#f59e0b",
                  color: "white",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}>
                  {user.is_approved ? "Approved" : "Pending Approval"}
                </span>
              </div>
              {!user.is_approved && (
                <small style={{ color: "#f59e0b", fontSize: "0.875rem" }}>
                  Your account is pending admin approval. Some features may be restricted.
                </small>
              )}
            </div>
          </div>

          {/* Home/Location Access */}
          <div className="form-group">
            <label>🏠 Location Access</label>
            <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
              Locations you have permission to access
            </small>
            {userLocations.length === 0 ? (
              <div style={{ 
                backgroundColor: "#e8f5e9", 
                border: "1px solid #81c784", 
                borderRadius: "4px", 
                padding: "0.75rem"
              }}>
                <strong style={{ color: "#2e7d32" }}>✓ Full Access</strong>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#2e7d32" }}>
                  You have access to all locations in the system.
                </p>
              </div>
            ) : (
              <div style={{ 
                border: "1px solid var(--border-subtle)", 
                borderRadius: "0.5rem",
                maxHeight: "200px",
                overflowY: "auto"
              }}>
                {userLocations.map((location) => (
                  <div 
                    key={String(location.id)} 
                    style={{ 
                      padding: "0.5rem 0.75rem",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}
                  >
                    <span>🏠</span>
                    <span style={{ fontWeight: 500 }}>{location.name}</span>
                    {location.is_primary_location && (
                      <span style={{ 
                        fontSize: "0.7rem", 
                        backgroundColor: "#4ecdc4",
                        color: "white",
                        padding: "0.1rem 0.3rem",
                        borderRadius: "4px"
                      }}>
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="form-group" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e0e0e0" }}>
            <label>📅 Account Information</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Account Created:</span>
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Last Updated:</span>
                <span>{new Date(user.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
        <h2>User Settings</h2>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            🔌 API & Services
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Stats
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-vertical">
          {/* Tab Panels */}
          <div className="tab-panels">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'api' && renderApiTab()}
            {activeTab === 'stats' && renderStatsTab()}
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
