import React, { useState, useEffect } from "react";
import { 
  updateUser, 
  generateApiKey, 
  revokeApiKey, 
  fetchItems,
  getUserLocationAccess,
  type User,
  type Location,
  getPrinterConfig,
  updatePrinterConfig,
  testPrinterConnection,
  getPrinterModels,
  printTestLabel,
  type PrinterConfig,
  type PrinterModel,
} from "../lib/api";
import { useTheme } from "./ThemeContext";
import { THEME_MODES, COLOR_PALETTES, type ThemeMode, type ColorPalette } from "../lib/theme";
import { 
  getLocaleConfig, 
  saveLocaleConfig, 
  resetLocaleConfig,
  COMMON_CURRENCIES,
  COMMON_LOCALES,
  CURRENCY_POSITION_OPTIONS,
  DATE_FORMAT_OPTIONS,
  type LocaleConfig 
} from "../lib/locale";

interface UserSettingsProps {
  user: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
  embedded?: boolean;
}

type TabType = 'profile' | 'api' | 'stats' | 'appearance' | 'locale' | 'printer';

const UserSettings: React.FC<UserSettingsProps> = ({ user, onClose, onUpdate, embedded = false }) => {
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
  
  // User stats states
  const [itemCount, setItemCount] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [userLocations, setUserLocations] = useState<Location[]>([]);
  
  // Appearance settings states (Theme and Locale)
  const { config: themeConfig, setMode, setColorPalette } = useTheme();
  const [localeConfig, setLocaleConfig] = useState<LocaleConfig>(getLocaleConfig());
  const [localeSaved, setLocaleSaved] = useState(false);
  
  // Printer settings states
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
    enabled: false,
    model: "d11_h",
    connection_type: "usb",
    address: null,
    density: 3,
  });
  const [printerModels, setPrinterModels] = useState<PrinterModel[]>([]);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [printerSaved, setPrinterSaved] = useState(false);
  const [printerTestResult, setPrinterTestResult] = useState<string | null>(null);
  
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

  // Load printer configuration on mount
  useEffect(() => {
    async function loadData() {
      // Load printer models
      try {
        const models = await getPrinterModels();
        setPrinterModels(models.models);
      } catch (err) {
        console.error("Failed to load printer models:", err);
      }

      // Load printer config
      try {
        const config = await getPrinterConfig();
        setPrinterConfig(config);
      } catch (err) {
        console.error("Failed to load printer config:", err);
      }
    }
    loadData();
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

  function getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'admin': return '#dc2626';
      case 'editor': return '#f59e0b';
      case 'viewer': return '#3b82f6';
      default: return '#6b7280';
    }
  }
  
  // Locale/Theme handlers
  function handleLocaleSave() {
    saveLocaleConfig(localeConfig);
    setLocaleSaved(true);
    setTimeout(() => {
      setLocaleSaved(false);
      window.location.reload();
    }, 1000);
  }

  function handleLocaleReset() {
    resetLocaleConfig();
    const resetConfig = getLocaleConfig();
    setLocaleConfig(resetConfig);
  }

  function handleThemeModeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setMode(e.target.value as ThemeMode);
  }

  function handleColorPaletteChange(palette: ColorPalette) {
    setColorPalette(palette);
  }

  // Printer handlers
  async function handlePrinterSave() {
    try {
      setPrinterLoading(true);
      setPrinterTestResult(null);
      await updatePrinterConfig(printerConfig);
      setPrinterSaved(true);
      setTimeout(() => setPrinterSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save printer config:", err);
      setPrinterTestResult("Failed to save configuration");
    } finally {
      setPrinterLoading(false);
    }
  }

  async function handlePrinterTest() {
    try {
      setPrinterLoading(true);
      setPrinterTestResult(null);
      const result = await testPrinterConnection(printerConfig);
      setPrinterTestResult(result.success ? "✅ " + result.message : "❌ " + result.message);
    } catch (err) {
      console.error("Failed to test printer:", err);
      setPrinterTestResult("❌ Connection test failed");
    } finally {
      setPrinterLoading(false);
    }
  }

  async function handlePrintTest() {
    try {
      setPrinterLoading(true);
      setPrinterTestResult(null);
      const result = await printTestLabel();
      setPrinterTestResult(result.success ? "✅ " + result.message : "❌ " + result.message);
    } catch (err) {
      console.error("Failed to print test label:", err);
      const errorMessage = err instanceof Error ? err.message : "Print test failed";
      setPrinterTestResult("❌ " + errorMessage);
    } finally {
      setPrinterLoading(false);
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

  // Render the API Key Tab content
  const renderApiTab = () => (
    <div className="tab-content">
      {/* Personal API Key Section */}
      <div className="form-group">
        <label>🔑 Personal API Key</label>
        <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
          Use this API key to connect mobile apps or external integrations. Keep it secret!
        </small>
        
        {currentApiKey ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type={showApiKey ? "text" : "password"}
                value={currentApiKey}
                readOnly
                style={{ 
                  flex: 1, 
                  backgroundColor: "#f5f5f5", 
                  color: "#1f2937", 
                  fontFamily: "monospace" 
                }}
              />
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{ padding: "0.5rem" }}
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
                title={showApiKey ? "Hide" : "Show"}
              >
                {showApiKey ? "👁️" : "👁️‍🗨️"}
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

  // Render the Appearance Tab content (Theme only)
  const renderAppearanceTab = () => (
    <div className="tab-content">
      {/* Theme Settings */}
      <div className="form-group">
        <label>🎨 Theme</label>
        <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.75rem" }}>
          Choose your preferred appearance settings
        </small>
        
        {/* Theme Mode */}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="theme-mode" style={{ fontSize: "0.9rem", marginBottom: "0.25rem", display: "block" }}>
            Mode
          </label>
          <select
            id="theme-mode"
            value={themeConfig.mode}
            onChange={handleThemeModeChange}
            style={{ width: "100%" }}
          >
            {THEME_MODES.map(mode => (
              <option key={mode.code} value={mode.code}>{mode.name}</option>
            ))}
          </select>
        </div>
        
        {/* Color Palette */}
        <div>
          <label style={{ fontSize: "0.9rem", marginBottom: "0.5rem", display: "block" }}>
            Accent Color
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {COLOR_PALETTES.map(palette => (
              <button
                key={palette.code}
                type="button"
                onClick={() => handleColorPaletteChange(palette.code)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: palette.accent,
                  border: themeConfig.colorPalette === palette.code 
                    ? "3px solid var(--text-primary)" 
                    : "2px solid transparent",
                  cursor: "pointer",
                  transition: "transform 0.1s",
                  transform: themeConfig.colorPalette === palette.code ? "scale(1.1)" : "scale(1)"
                }}
                title={palette.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render the Locale Tab content
  const renderLocaleTab = () => (
    <div className="tab-content">
      {/* Locale Settings */}
      <div className="form-group">
        <label>🌍 International</label>
        <small style={{ color: "#666", fontSize: "0.875rem", display: "block", marginBottom: "0.75rem" }}>
          Set your preferred language and currency format
        </small>
        
        {/* Locale */}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="locale-select" style={{ fontSize: "0.9rem", marginBottom: "0.25rem", display: "block" }}>
            Language/Region
          </label>
          <select
            id="locale-select"
            value={localeConfig.locale}
            onChange={(e) => setLocaleConfig(prev => ({ ...prev, locale: e.target.value }))}
            style={{ width: "100%" }}
          >
            {COMMON_LOCALES.map(locale => (
              <option key={locale.code} value={locale.code}>{locale.name}</option>
            ))}
          </select>
        </div>

        {/* Date Format */}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="dateFormat" style={{ fontSize: "0.9rem", marginBottom: "0.25rem", display: "block" }}>
            Date Format
          </label>
          <select
            id="dateFormat"
            value={localeConfig.dateFormat}
            onChange={(e) => setLocaleConfig(prev => ({ ...prev, dateFormat: e.target.value as any }))}
            style={{ width: "100%" }}
          >
            {DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Currency */}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="currency-select" style={{ fontSize: "0.9rem", marginBottom: "0.25rem", display: "block" }}>
            Currency
          </label>
          <select
            id="currency-select"
            value={localeConfig.currency}
            onChange={(e) => setLocaleConfig(prev => ({ ...prev, currency: e.target.value }))}
            style={{ width: "100%" }}
          >
            {COMMON_CURRENCIES.map(currency => (
              <option key={currency.code} value={currency.code}>{currency.name}</option>
            ))}
          </select>
        </div>

        {/* Currency Symbol Position */}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="currencyPosition" style={{ fontSize: "0.9rem", marginBottom: "0.25rem", display: "block" }}>
            Symbol Position
          </label>
          <select
            id="currencyPosition"
            value={localeConfig.currencySymbolPosition}
            onChange={(e) => setLocaleConfig(prev => ({ ...prev, currencySymbolPosition: e.target.value as any }))}
            style={{ width: "100%" }}
          >
            {CURRENCY_POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Save/Reset Buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleLocaleSave}
            disabled={localeSaved}
            style={{ flex: 1 }}
          >
            {localeSaved ? "✓ Saved!" : "Save & Reload"}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={handleLocaleReset}
            style={{ flex: 1 }}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );

  // Render the Printer Tab content
  const renderPrinterTab = () => (
    <div className="tab-content">
      {/* Quick Start Section */}
      <div style={{
        backgroundColor: "rgba(76, 175, 80, 0.15)",
        border: "1px solid rgba(76, 175, 80, 0.5)",
        borderRadius: "8px",
        padding: "1rem",
        marginBottom: "1.5rem"
      }}>
        <h3 style={{ margin: "0 0 0.75rem 0", color: "#2e7d32", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>🚀</span> Quick Start - No Setup Required!
        </h3>
        <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem" }}>
          Print labels directly from your <strong>computer or phone</strong> without any configuration:
        </p>
        <ul style={{ margin: "0 0 1rem 0", paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
          <li><strong>USB:</strong> Plug printer into your computer → Select "USB" in print dialog → Print!</li>
          <li><strong>Bluetooth:</strong> Turn on printer → Select "Bluetooth" in print dialog → Pair & Print!</li>
        </ul>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
          <strong>Where to print:</strong> Go to any Location or Item → Click the "🖨️ Print Label" button
        </p>
      </div>

      {/* Divider */}
      <div style={{
        display: "flex",
        alignItems: "center",
        margin: "1.5rem 0",
        gap: "1rem"
      }}>
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-subtle)" }} />
        <span style={{ color: "var(--muted)", fontSize: "0.85rem", fontWeight: 500 }}>ADVANCED</span>
        <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-subtle)" }} />
      </div>

      {/* Server Configuration Section */}
      <h3 style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>🖨️</span> Server-Side Printer Configuration
      </h3>
      <div style={{
        backgroundColor: "rgba(33, 150, 243, 0.1)",
        border: "1px solid rgba(33, 150, 243, 0.3)",
        borderRadius: "6px",
        padding: "0.75rem",
        marginBottom: "1rem",
        fontSize: "0.85rem"
      }}>
        <p style={{ margin: 0 }}>
          <strong>When to use:</strong> Configure this if you have a printer connected directly to the NesVentory <strong>server</strong>
          that you want to share with all users on the network.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="printer-enabled" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            id="printer-enabled"
            type="checkbox"
            checked={printerConfig.enabled}
            onChange={(e) => setPrinterConfig(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          Enable Server Printer
        </label>
      </div>

      {printerConfig.enabled && (
        <>
          <div className="form-group">
            <label htmlFor="printer-model">Printer Model</label>
            <select
              id="printer-model"
              value={printerConfig.model}
              onChange={(e) => setPrinterConfig(prev => ({ ...prev, model: e.target.value }))}
            >
              {printerModels.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <small style={{ color: "#666", fontSize: "0.875rem" }}>
              Currently supported: D11-H. Future models coming soon.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="printer-connection">Connection Type</label>
            <select
              id="printer-connection"
              value={printerConfig.connection_type}
              onChange={(e) => setPrinterConfig(prev => ({ ...prev, connection_type: e.target.value }))}
            >
              <option value="usb">USB (Server Port)</option>
              <option value="bluetooth">Bluetooth (Server Adapter)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="printer-address">
              {printerConfig.connection_type === "bluetooth" ? "Bluetooth MAC Address" : "Serial Port (optional)"}
            </label>
            <input
              id="printer-address"
              type="text"
              value={printerConfig.address || ""}
              onChange={(e) => setPrinterConfig(prev => ({ ...prev, address: e.target.value || null }))}
              placeholder={printerConfig.connection_type === "bluetooth" ? "AA:BB:CC:DD:EE:FF" : "auto-detect or /dev/ttyACM0"}
            />
            <small style={{ color: "#666", fontSize: "0.875rem" }}>
              {printerConfig.connection_type === "bluetooth" 
                ? "Enter the Bluetooth MAC address of your printer" 
                : "Leave empty for auto-detection, or specify port like /dev/ttyACM0 (Linux) or COM3 (Windows)"}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="printer-density">Print Density (1-3)</label>
            <input
              id="printer-density"
              type="number"
              min="1"
              max="3"
              value={printerConfig.density}
              onChange={(e) => setPrinterConfig(prev => ({ ...prev, density: parseInt(e.target.value) || 3 }))}
            />
            <small style={{ color: "#666", fontSize: "0.875rem" }}>
              Higher values produce darker prints (1-3 for D11-H).
            </small>
          </div>

          {printerTestResult && (
            <div style={{ 
              padding: "0.75rem", 
              borderRadius: "4px", 
              marginBottom: "1rem",
              background: printerTestResult.startsWith("✅") ? "#d4edda" : "#f8d7da",
              color: printerTestResult.startsWith("✅") ? "#155724" : "#721c24"
            }}>
              {printerTestResult}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handlePrinterSave}
              disabled={printerLoading}
            >
              {printerSaved ? "✓ Saved!" : "Save Configuration"}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={handlePrinterTest}
              disabled={printerLoading}
            >
              {printerLoading ? "Testing..." : "Test Server Connection"}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={handlePrintTest}
              disabled={printerLoading}
              title="Prints a test label with QR code and text"
            >
              {printerLoading ? "Printing..." : "Print Test Label"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Handle tab change - clear any errors when switching tabs
  const handleTabChange = (tab: TabType) => {
    setError(null);
    setActiveTab(tab);
  };

  const content = (
    <>
      {!embedded && <h2>User Settings</h2>}
      {embedded && (
        <section className="panel">
          <div className="panel-header">
            <h2>User Settings</h2>
          </div>
        </section>
      )}
      
      {/* Tab Navigation */}
      <div className="tab-navigation" style={embedded ? { marginTop: "1rem" } : undefined}>
        <button
          type="button"
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          👤 Profile
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => handleTabChange('api')}
        >
          🔌 API Key
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => handleTabChange('stats')}
        >
          📊 Stats
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => handleTabChange('appearance')}
        >
          🎨 Appearance
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'locale' ? 'active' : ''}`}
          onClick={() => handleTabChange('locale')}
        >
          🌐 Locale & Currency
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'printer' ? 'active' : ''}`}
          onClick={() => handleTabChange('printer')}
        >
          🖨️ Printer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-vertical">
        {/* Tab Panels */}
        <div className="tab-panels">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'api' && renderApiTab()}
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'appearance' && renderAppearanceTab()}
          {activeTab === 'locale' && renderLocaleTab()}
          {activeTab === 'printer' && renderPrinterTab()}
        </div>

        {error && <p className="error-message">{error}</p>}
        
        <div className="form-actions">
          {!embedded && (
            <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
              {activeTab === 'profile' ? 'Cancel' : 'Close'}
            </button>
          )}
          {activeTab === 'profile' && (
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </button>
          )}
        </div>
      </form>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
        {content}
      </div>
    </div>
  );
};

export default UserSettings;
