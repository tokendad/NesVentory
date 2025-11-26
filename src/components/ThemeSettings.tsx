import React from "react";
import { useTheme } from "./ThemeContext";
import { THEME_MODES, COLOR_PALETTES, type ThemeMode, type ColorPalette } from "../lib/theme";

interface ThemeSettingsProps {
  onClose: () => void;
}

const ThemeSettings: React.FC<ThemeSettingsProps> = ({ onClose }) => {
  const { config, setMode, setColorPalette } = useTheme();

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMode(e.target.value as ThemeMode);
  };

  const handlePaletteChange = (palette: ColorPalette) => {
    setColorPalette(palette);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Theme Settings</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="theme-mode">Theme Mode</label>
            <select
              id="theme-mode"
              value={config.mode}
              onChange={handleModeChange}
            >
              {THEME_MODES.map((mode) => (
                <option key={mode.code} value={mode.code}>
                  {mode.name}
                </option>
              ))}
            </select>
            <span className="help-text">
              Choose between Night (dark), Day (light), or follow your system settings
            </span>
          </div>

          <div className="form-group">
            <label>Color Palette</label>
            <div className="color-palette-grid">
              {COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.code}
                  type="button"
                  className={`color-palette-option ${config.colorPalette === palette.code ? 'active' : ''}`}
                  onClick={() => handlePaletteChange(palette.code)}
                  style={{
                    '--palette-color': palette.accent,
                  } as React.CSSProperties}
                >
                  <span 
                    className="color-swatch" 
                    style={{ backgroundColor: palette.accent }}
                  />
                  <span className="color-name">{palette.name}</span>
                </button>
              ))}
            </div>
            <span className="help-text">
              Choose your preferred accent color
            </span>
          </div>

          <div className="preview-section">
            <h3>Preview</h3>
            <div className="theme-preview-box">
              <div className="preview-item">
                <span className="preview-label">Current Mode:</span>
                <span className="preview-value">
                  {config.mode === 'system' ? 'System Default' : config.mode === 'dark' ? 'Night (Dark)' : 'Day (Light)'}
                </span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Accent Color:</span>
                <span 
                  className="preview-value" 
                  style={{ color: COLOR_PALETTES.find(p => p.code === config.colorPalette)?.accent }}
                >
                  {COLOR_PALETTES.find(p => p.code === config.colorPalette)?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <div style={{ marginLeft: "auto" }}>
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
