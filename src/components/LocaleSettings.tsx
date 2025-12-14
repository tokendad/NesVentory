import React, { useState } from "react";
import { 
  getLocaleConfig, 
  saveLocaleConfig, 
  resetLocaleConfig,
  COMMON_CURRENCIES,
  COMMON_LOCALES,
  type LocaleConfig 
} from "../lib/locale";

interface LocaleSettingsProps {
  onClose: () => void;
  embedded?: boolean;
}

const LocaleSettings: React.FC<LocaleSettingsProps> = ({ onClose, embedded = false }) => {
  const [config, setConfig] = useState<LocaleConfig>(getLocaleConfig());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveLocaleConfig(config);
    setSaved(true);
    setTimeout(() => {
      if (!embedded) {
        onClose();
      }
      // Reload page to apply new locale settings
      window.location.reload();
    }, 1000);
  };

  const handleReset = () => {
    resetLocaleConfig();
    const resetConfig = getLocaleConfig();
    setConfig(resetConfig);
  };

  const content = (
    <>
      {!embedded && (
        <div className="modal-header">
          <h2>Locale & Currency Settings</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
      )}

      {embedded && (
        <section className="panel">
          <div className="panel-header">
            <h3>Locale & Currency Settings</h3>
          </div>
        </section>
      )}

      {saved && (
        <div className="success-banner">
          Settings saved! Reloading to apply changes...
        </div>
      )}

      <div className="settings-form" style={embedded ? { padding: "1rem" } : undefined}>
          <div className="form-group">
            <label htmlFor="locale">Display Language & Format</label>
            <select
              id="locale"
              value={config.locale}
              onChange={(e) => setConfig({ ...config, locale: e.target.value })}
              disabled={saved}
            >
              {COMMON_LOCALES.map((locale) => (
                <option key={locale.code} value={locale.code}>
                  {locale.name}
                </option>
              ))}
            </select>
            <span className="help-text">
              Controls date and number formatting
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="currency">Currency</label>
            <select
              id="currency"
              value={config.currency}
              onChange={(e) => setConfig({ ...config, currency: e.target.value })}
              disabled={saved}
            >
              {COMMON_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.name}
                </option>
              ))}
            </select>
            <span className="help-text">
              Default currency for displaying prices
            </span>
          </div>

          <div className="preview-section">
            <h3>Preview</h3>
            <div className="preview-items">
              <div className="preview-item">
                <span className="preview-label">Date:</span>
                <span className="preview-value">
                  {new Intl.DateTimeFormat(config.locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }).format(new Date())}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Currency:</span>
                <span className="preview-value">
                  {new Intl.NumberFormat(config.locale, {
                    style: 'currency',
                    currency: config.currency,
                  }).format(1234.56)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn-outline"
            onClick={handleReset}
            disabled={saved}
          >
            Reset to Browser Default
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.75rem" }}>
            {!embedded && (
              <button className="btn-outline" onClick={onClose} disabled={saved}>
                Cancel
              </button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={saved}>
              {saved ? "Saved!" : "Save & Apply"}
            </button>
          </div>
        </div>
      </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};

export default LocaleSettings;
