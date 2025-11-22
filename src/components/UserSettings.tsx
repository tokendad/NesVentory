import React, { useState, useEffect } from "react";
import { User, getCurrentUser, updateCurrentUser } from "../lib/api";
import { COMMON_LOCALES, COMMON_CURRENCIES, COMMON_TIMEZONES } from "../lib/i18n";

interface UserSettingsProps {
  onClose: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    locale: "en-US",
    timezone: "Etc/UTC",
    currency: "USD",
  });

  useEffect(() => {
    loadUserSettings();
  }, []);

  async function loadUserSettings() {
    setLoading(true);
    setError(null);
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setFormData({
        full_name: userData.full_name || "",
        locale: userData.locale || "en-US",
        timezone: userData.timezone || "Etc/UTC",
        currency: userData.currency || "USD",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load user settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedUser = await updateCurrentUser({
        full_name: formData.full_name || null,
        locale: formData.locale,
        timezone: formData.timezone,
        currency: formData.currency,
      });
      setUser(updatedUser);
      setSuccessMessage("Settings saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <section className="panel settings-panel">
          <div className="panel-header">
            <h2>User Settings</h2>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="panel-body">
            <p>Loading settings...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <section className="panel settings-panel">
        <div className="panel-header">
          <h2>User Settings</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {successMessage && <div className="success-banner">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-section">
            <h3>Profile Information</h3>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={user?.email || ""}
                disabled
                className="disabled"
              />
            </div>

            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <input
                type="text"
                id="role"
                value={user?.role || ""}
                disabled
                className="disabled"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>International Format Settings</h3>
            
            <div className="form-group">
              <label htmlFor="locale">
                Language & Region
                <span className="field-hint">Affects date and number formats</span>
              </label>
              <select
                id="locale"
                name="locale"
                value={formData.locale}
                onChange={handleInputChange}
              >
                {COMMON_LOCALES.map((locale) => (
                  <option key={locale.value} value={locale.value}>
                    {locale.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="timezone">
                Timezone
                <span className="field-hint">Used for displaying dates and times</span>
              </label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="currency">
                Currency
                <span className="field-hint">Default currency for prices</span>
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
              >
                {COMMON_CURRENCIES.map((curr) => (
                  <option key={curr.value} value={curr.value}>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default UserSettings;
