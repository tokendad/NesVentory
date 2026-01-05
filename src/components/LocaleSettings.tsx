import React, { useState } from "react";
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

  // Helper to format currency for preview
  const getPreviewCurrency = () => {
    try {
      const formatter = new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.currency,
      });
      
      const parts = formatter.formatToParts(1234.56);
      const currencyPart = parts.find(p => p.type === 'currency');
      const symbol = currencyPart ? currencyPart.value : '';
      const val = parts.filter(p => p.type !== 'currency' && p.type !== 'literal').map(p => p.value).join('');
      
      if (config.currencySymbolPosition === 'after') {
        return `${val} ${symbol}`;
      } else {
        return `${symbol}${val}`;
      }
    } catch {
      return '—';
    }
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
            <label htmlFor="dateFormat">Date Format</label>
            <select
              id="dateFormat"
              value={config.dateFormat}
              onChange={(e) => setConfig({ ...config, dateFormat: e.target.value as any })}
              disabled={saved}
            >
              {DATE_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
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
            </div>

            <div className="form-group">
              <label htmlFor="currencyPosition">Symbol Position</label>
              <select
                id="currencyPosition"
                value={config.currencySymbolPosition}
                onChange={(e) => setConfig({ ...config, currencySymbolPosition: e.target.value as any })}
                disabled={saved}
              >
                {CURRENCY_POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="preview-section">
            <h3>Preview</h3>
            <div className="preview-items">
              <div className="preview-item">
                <span className="preview-label">Date:</span>
                <span className="preview-value">
                  {new Intl.DateTimeFormat(config.locale, {
                    dateStyle: config.dateFormat
                  }).format(new Date())}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Currency:</span>
                <span className="preview-value">
                  {getPreviewCurrency()}
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
