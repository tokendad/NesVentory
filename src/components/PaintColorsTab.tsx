import React, { useState, useCallback, useRef } from "react";
import type { Location, PaintEntry as BasePaintEntry, PaintLabelInfo } from "../lib/api";
import { updateLocation, parsePaintLabel } from "../lib/api";

// ─── Extended type (adds photo_id which the backend supports as a free field) ─

export interface PaintEntry extends BasePaintEntry {
  photo_id?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SURFACES = ["Walls", "Ceiling", "Trim", "Exterior", "Accent", "Other"] as const;
const FINISHES = ["Flat", "Matte", "Eggshell", "Satin", "Semi-Gloss", "Gloss", "High-Gloss"] as const;
const SIZES    = ["Sample", "Quart", "1 Gallon", "2 Gallons", "5 Gallons"] as const;

const SURFACE_ORDER = ["Walls", "Ceiling", "Trim", "Exterior", "Accent", "Other"];

const SURFACE_ICONS: Record<string, string> = {
  Walls:    "🧱",
  Ceiling:  "🪟",
  Trim:     "🪵",
  Exterior: "🏠",
  Accent:   "🎨",
  Other:    "🔲",
};

const EMPTY_ENTRY: Omit<PaintEntry, "id"> = {
  surface:      "Walls",
  brand:        "",
  product_line: "",
  color_name:   "",
  color_code:   "",
  base_code:    "",
  finish:       "Eggshell",
  vendor:       "",
  size:         "1 Gallon",
  date_mixed:   "",
  tint_formula: "",
  barcode:      "",
  hex_color:    "#ffffff",
  photo_id:     "",
  notes:        "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true when the hex color is light enough to require dark text. */
function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return true;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

/** Validates a 6-digit hex color string. */
function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/** Format YYYY-MM-DD to a readable string. */
function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

// ─── ColorSwatch ──────────────────────────────────────────────────────────────

interface SwatchProps {
  hex:       string;
  size?:     number;
  className?: string;
  style?:    React.CSSProperties;
}

const ColorSwatch: React.FC<SwatchProps> = ({ hex, size = 52, className = "", style }) => {
  const valid = isValidHex(hex);
  return (
    <div
      className={`paint-swatch${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={valid ? `Color swatch: ${hex}` : "No color set"}
      style={{
        width:  size,
        height: size,
        backgroundColor: valid ? hex : "transparent",
        backgroundImage: valid
          ? undefined
          : "repeating-conic-gradient(var(--border-subtle) 0% 25%, var(--bg-elevated-softer) 0% 50%)",
        backgroundSize: valid ? undefined : "12px 12px",
        ...style,
      }}
    >
      {!valid && <span style={{ fontSize: "1rem", lineHeight: 1 }}>?</span>}
    </div>
  );
};

// ─── PaintEntryCard ───────────────────────────────────────────────────────────

interface PaintEntryCardProps {
  entry:    PaintEntry;
  onEdit:   (entry: PaintEntry) => void;
  onDelete: (id: string) => void;
}

const PaintEntryCard: React.FC<PaintEntryCardProps> = ({ entry, onEdit, onDelete }) => {
  const validHex    = isValidHex(entry.hex_color ?? "");
  const borderColor = validHex ? entry.hex_color! : "var(--border-panel)";

  return (
    <article
      className="paint-entry-card"
      style={{ borderLeftColor: borderColor }}
      aria-label={`${entry.surface}: ${entry.color_name ?? "Unnamed color"}`}
    >
      {/* Left swatch */}
      <ColorSwatch hex={entry.hex_color ?? ""} size={52} className="paint-entry-swatch" />

      {/* Main content */}
      <div className="paint-entry-body">
        {/* Row 1: surface badge + color name + hex chip */}
        <div className="paint-entry-top">
          <span className="paint-surface-badge">
            {SURFACE_ICONS[entry.surface] ?? "🎨"} {entry.surface}
          </span>
          <span className="paint-entry-name">
            {entry.color_name || <em style={{ color: "var(--muted)" }}>Unnamed</em>}
            {entry.color_code && (
              <span className="paint-entry-code"> {entry.color_code}</span>
            )}
          </span>
          {validHex && (
            <span
              className="paint-hex-chip"
              style={{
                backgroundColor: entry.hex_color!,
                color: isLightColor(entry.hex_color!) ? "#1e293b" : "#f8fafc",
              }}
              title={entry.hex_color!}
            >
              {entry.hex_color!.toUpperCase()}
            </span>
          )}
        </div>

        {/* Row 2: brand / product / finish / size */}
        {(entry.brand || entry.product_line || entry.finish) && (
          <div className="paint-entry-meta">
            {entry.brand        && <span>{entry.brand}</span>}
            {entry.product_line && <span className="paint-meta-sep">{entry.product_line}</span>}
            {entry.finish       && <span className="paint-finish-badge">{entry.finish}</span>}
            {entry.size         && <span className="paint-meta-sep muted">{entry.size}</span>}
          </div>
        )}

        {/* Row 3: vendor + date */}
        {(entry.vendor || entry.date_mixed) && (
          <div className="paint-entry-sub">
            {entry.vendor     && <span>📍 {entry.vendor}</span>}
            {entry.date_mixed && (
              <span title={entry.date_mixed}>
                🗓 Mixed {formatDate(entry.date_mixed)}
              </span>
            )}
          </div>
        )}

        {/* Row 4: base_code + barcode (tertiary) */}
        {(entry.base_code || entry.barcode) && (
          <div className="paint-entry-sub paint-entry-codes">
            {entry.base_code && (
              <span>
                <span className="paint-entry-code-label">Base</span>
                {entry.base_code}
              </span>
            )}
            {entry.barcode && (
              <span>
                <span className="paint-entry-code-label">Barcode</span>
                {entry.barcode}
              </span>
            )}
          </div>
        )}

        {/* Row 5: notes */}
        {entry.notes && <p className="paint-entry-notes">{entry.notes}</p>}
      </div>

      {/* Action buttons */}
      <div className="paint-entry-actions">
        <button
          className="btn-icon"
          onClick={() => onEdit(entry)}
          title="Edit paint entry"
          aria-label={`Edit ${entry.surface} paint entry`}
        >
          ✎
        </button>
        <button
          className="btn-icon btn-danger"
          onClick={() => onDelete(entry.id)}
          title="Delete paint entry"
          aria-label={`Delete ${entry.surface} paint entry`}
        >
          ✕
        </button>
      </div>
    </article>
  );
};

// ─── PaintEntryForm ───────────────────────────────────────────────────────────

interface PaintEntryFormProps {
  initial:   Partial<PaintEntry>;
  isEditing: boolean;
  onSave:    (entry: Omit<PaintEntry, "id">) => void;
  onCancel:  () => void;
  isSaving:  boolean;
  onAiParse: () => void;
  aiParsing: boolean;
}

const PaintEntryForm: React.FC<PaintEntryFormProps> = ({
  initial,
  isEditing,
  onSave,
  onCancel,
  isSaving,
  onAiParse,
  aiParsing,
}) => {
  const [form, setForm] = useState<Omit<PaintEntry, "id">>({
    ...EMPTY_ENTRY,
    ...initial,
  });
  const [hexError, setHexError] = useState(false);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  // Allow parent to push AI-parsed fields in
  const applyExternal = useCallback(
    (updates: Partial<Omit<PaintEntry, "id">>) =>
      setForm((prev) => ({ ...prev, ...updates })),
    []
  );

  // Expose to parent via ref isn't ideal in React; instead, PaintColorsTab
  // re-mounts with new `initial` when AI data arrives (see parent logic).

  const set = useCallback(
    <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
      setForm((prev) => ({ ...prev, [key]: val })),
    []
  );

  const handleHexText = (raw: string) => {
    const val = raw.startsWith("#") ? raw : `#${raw}`;
    set("hex_color", val);
    setHexError(val.length > 1 && !isValidHex(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hexError) return;
    onSave(form);
  };

  const validHex = isValidHex(form.hex_color ?? "");

  return (
    <form
      className="paint-entry-form"
      onSubmit={handleSubmit}
      aria-label={isEditing ? "Edit paint entry" : "Add new paint entry"}
      noValidate
    >
      {/* ── Form header ─────────────────────────────────────────────── */}
      <div className="paint-form-header">
        <h4>{isEditing ? "✏️ Edit Paint Entry" : "🎨 New Paint Entry"}</h4>
        <button
          type="button"
          className="btn-ai-parse"
          onClick={onAiParse}
          disabled={aiParsing || isSaving}
          title="Upload a photo of a paint can label and let AI fill in the fields"
        >
          {aiParsing ? (
            <>⏳ Parsing…</>
          ) : (
            <>
              📷 Parse Label Photo
              <span className="btn-ai-badge">AI</span>
            </>
          )}
        </button>
      </div>

      {/* ── Section 1: Color Identity ────────────────────────────────── */}
      <div className="paint-form-section">
        <h5 className="paint-form-section-title">Color Identity</h5>

        <div className="form-row paint-form-row-3">
          <div className="form-group">
            <label htmlFor="pf-surface">Surface *</label>
            <select
              id="pf-surface"
              value={form.surface}
              onChange={(e) => set("surface", e.target.value)}
              required
              disabled={isSaving}
            >
              {SURFACES.map((s) => (
                <option key={s} value={s}>{SURFACE_ICONS[s]} {s}</option>
              ))}
            </select>
          </div>

          <div className="form-group paint-form-col-span-2">
            <label htmlFor="pf-color-name">Color Name *</label>
            <input
              id="pf-color-name"
              type="text"
              value={form.color_name ?? ""}
              onChange={(e) => set("color_name", e.target.value)}
              placeholder="e.g., Antique White"
              required
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="form-row paint-form-row-3">
          {/* Hex color with inline picker */}
          <div className="form-group">
            <label htmlFor="pf-hex">Hex Color</label>
            <div className="paint-hex-input-group">
              {/* Native color input — triggered by the swatch button */}
              <input
                ref={colorPickerRef}
                type="color"
                value={validHex ? (form.hex_color ?? "#ffffff") : "#ffffff"}
                onChange={(e) => {
                  set("hex_color", e.target.value);
                  setHexError(false);
                }}
                disabled={isSaving}
                aria-label="Pick hex color visually"
                className="paint-native-color-input"
              />
              <div
                className="paint-hex-swatch-btn"
                style={validHex ? { backgroundColor: form.hex_color!, backgroundImage: "none" } : {}}
                onClick={() => colorPickerRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && colorPickerRef.current?.click()}
                aria-label="Open color picker"
                title="Click to pick a color"
              >
                {!validHex && "?"}
              </div>
              <input
                id="pf-hex"
                type="text"
                value={form.hex_color ?? ""}
                onChange={(e) => handleHexText(e.target.value)}
                placeholder="#F5F0E8"
                maxLength={7}
                disabled={isSaving}
                className={hexError ? "input-error" : ""}
                aria-describedby={hexError ? "pf-hex-error" : undefined}
                style={{ fontFamily: "monospace" }}
              />
            </div>
            {hexError && (
              <span id="pf-hex-error" className="form-error-text" role="alert">
                Must be a valid 6-digit hex, e.g. #F5F0E8
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="pf-color-code">Color Code</label>
            <input
              id="pf-color-code"
              type="text"
              value={form.color_code ?? ""}
              onChange={(e) => set("color_code", e.target.value)}
              placeholder="e.g., 7002-20"
              disabled={isSaving}
              style={{ fontFamily: "monospace" }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pf-base-code">Base Code</label>
            <input
              id="pf-base-code"
              type="text"
              value={form.base_code ?? ""}
              onChange={(e) => set("base_code", e.target.value)}
              placeholder="e.g., Ultra White/Base A"
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Product Details ────────────────────────────────── */}
      <div className="paint-form-section">
        <h5 className="paint-form-section-title">Product Details</h5>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="pf-brand">Brand</label>
            <input
              id="pf-brand"
              type="text"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="e.g., Valspar, Glidden, Behr"
              disabled={isSaving}
            />
          </div>
          <div className="form-group">
            <label htmlFor="pf-product-line">Product Line</label>
            <input
              id="pf-product-line"
              type="text"
              value={form.product_line ?? ""}
              onChange={(e) => set("product_line", e.target.value)}
              placeholder="e.g., Interior Signature"
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="form-row paint-form-row-3">
          <div className="form-group">
            <label htmlFor="pf-finish">Finish</label>
            <select
              id="pf-finish"
              value={form.finish ?? ""}
              onChange={(e) => set("finish", e.target.value)}
              disabled={isSaving}
            >
              <option value="">— Select —</option>
              {FINISHES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="pf-size">Size</label>
            <select
              id="pf-size"
              value={form.size ?? ""}
              onChange={(e) => set("size", e.target.value)}
              disabled={isSaving}
            >
              <option value="">— Select —</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="pf-date-mixed">Date Mixed</label>
            <input
              id="pf-date-mixed"
              type="date"
              value={form.date_mixed ?? ""}
              onChange={(e) => set("date_mixed", e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      {/* ── Section 3: Purchase & Lab ─────────────────────────────────── */}
      <div className="paint-form-section">
        <h5 className="paint-form-section-title">Purchase &amp; Lab</h5>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="pf-vendor">Vendor / Store</label>
            <input
              id="pf-vendor"
              type="text"
              value={form.vendor ?? ""}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="e.g., Lowe's #1206"
              disabled={isSaving}
            />
          </div>
          <div className="form-group">
            <label htmlFor="pf-barcode">Barcode</label>
            <input
              id="pf-barcode"
              type="text"
              value={form.barcode ?? ""}
              onChange={(e) => set("barcode", e.target.value)}
              placeholder="e.g., 1206-A-20210308181051"
              disabled={isSaving}
              style={{ fontFamily: "monospace" }}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="pf-tint-formula">
            Tint Formula
            <span className="paint-label-hint">
              Colorant codes &amp; amounts from the paint can sticker
            </span>
          </label>
          <textarea
            id="pf-tint-formula"
            value={form.tint_formula ?? ""}
            onChange={(e) => set("tint_formula", e.target.value)}
            placeholder="e.g., Y1 105-10, R2 111-8, B3 115-2"
            rows={2}
            disabled={isSaving}
            style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
          />
          <span className="help-text">
            Copy exactly from the sticker on the can — useful if you need a colour rematch later.
          </span>
        </div>
      </div>

      {/* ── Section 4: Notes ─────────────────────────────────────────── */}
      <div className="paint-form-section">
        <h5 className="paint-form-section-title">Notes</h5>
        <div className="form-group">
          <label htmlFor="pf-notes">Notes</label>
          <textarea
            id="pf-notes"
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Any additional notes about this colour or application…"
            rows={2}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="form-actions paint-form-actions">
        <button
          type="button"
          className="btn-outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={isSaving || hexError}
        >
          {isSaving ? "Saving…" : isEditing ? "Update Entry" : "Add Entry"}
        </button>
      </div>
    </form>
  );
};

// ─── PaintColorsTab ───────────────────────────────────────────────────────────

interface PaintColorsTabProps {
  location: Location;
  onUpdate: () => void;
}

const PaintColorsTab: React.FC<PaintColorsTabProps> = ({ location, onUpdate }) => {
  const [entries, setEntries]           = useState<PaintEntry[]>(
    (location.paint_info as PaintEntry[] | undefined) ?? []
  );
  const [showForm, setShowForm]         = useState(false);
  const [editingEntry, setEditingEntry] = useState<PaintEntry | null>(null);
  const [aiInitial, setAiInitial]       = useState<Partial<PaintEntry>>({});
  const [saving, setSaving]             = useState(false);
  const [aiParsing, setAiParsing]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [aiError, setAiError]           = useState<string | null>(null);

  // Hidden file input for AI label photo upload
  const aiFileRef = useRef<HTMLInputElement>(null);

  // ── Persistence ─────────────────────────────────────────────────────

  const persist = async (next: PaintEntry[]) => {
    setSaving(true);
    setError(null);
    try {
      await updateLocation(location.id.toString(), { paint_info: next });
      setEntries(next);
      onUpdate();
    } catch (err: any) {
      setError(err.message ?? "Failed to save paint colors");
    } finally {
      setSaving(false);
    }
  };

  // ── AI parse flow ────────────────────────────────────────────────────

  /**
   * Triggered when user clicks "Parse Label Photo".
   * Opens a file picker; on selection, uploads to the AI endpoint
   * and pre-fills the form with whatever fields were extracted.
   */
  const handleAiParseClick = () => {
    setAiError(null);
    aiFileRef.current?.click();
  };

  const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be selected again if needed
    e.target.value = "";

    setAiParsing(true);
    setAiError(null);
    try {
      const info: PaintLabelInfo = await parsePaintLabel(file);
      // Map PaintLabelInfo → PaintEntry partial (strip nulls)
      const partial: Partial<PaintEntry> = {};
      if (info.brand)        partial.brand        = info.brand;
      if (info.product_line) partial.product_line = info.product_line;
      if (info.color_name)   partial.color_name   = info.color_name;
      if (info.color_code)   partial.color_code   = info.color_code;
      if (info.base_code)    partial.base_code    = info.base_code;
      if (info.finish)       partial.finish       = info.finish;
      if (info.vendor)       partial.vendor       = info.vendor;
      if (info.size)         partial.size         = info.size;
      if (info.date_mixed)   partial.date_mixed   = info.date_mixed;
      if (info.tint_formula) partial.tint_formula = info.tint_formula;
      if (info.barcode)      partial.barcode      = info.barcode;

      // Merge AI data into current editing state
      if (editingEntry) {
        setEditingEntry((prev) => ({ ...prev!, ...partial }));
      } else {
        setAiInitial(partial);
        setShowForm(true);
      }
    } catch (err: any) {
      setAiError(err.message ?? "AI parsing failed — please fill in fields manually.");
    } finally {
      setAiParsing(false);
    }
  };

  // ── Card handlers ────────────────────────────────────────────────────

  const handleAdd = () => {
    setAiInitial({});
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleEdit = (entry: PaintEntry) => {
    setEditingEntry(entry);
    setAiInitial({});
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("paint-entry-form-anchor")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
  };

  const handleDelete = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    const label  = target ? `${target.surface}: ${target.color_name ?? "this entry"}` : "this entry";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    await persist(entries.filter((e) => e.id !== id));
  };

  const handleSave = async (data: Omit<PaintEntry, "id">) => {
    let next: PaintEntry[];
    if (editingEntry) {
      next = entries.map((e) =>
        e.id === editingEntry.id ? { ...data, id: editingEntry.id } : e
      );
    } else {
      next = [...entries, { ...data, id: crypto.randomUUID() }];
    }
    await persist(next);
    if (!error) {
      setShowForm(false);
      setEditingEntry(null);
      setAiInitial({});
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEntry(null);
    setAiInitial({});
    setError(null);
    setAiError(null);
  };

  // ── Surface grouping ─────────────────────────────────────────────────

  const grouped: { surface: string; entries: PaintEntry[] }[] = (() => {
    const map = new Map<string, PaintEntry[]>();
    for (const e of entries) {
      if (!map.has(e.surface)) map.set(e.surface, []);
      map.get(e.surface)!.push(e);
    }
    return SURFACE_ORDER
      .filter((s) => map.has(s))
      .map((s) => ({
        surface: s,
        entries: map.get(s)!.sort((a, b) =>
          (a.color_name ?? "").localeCompare(b.color_name ?? "")
        ),
      }))
      .concat(
        Array.from(map.entries())
          .filter(([s]) => !SURFACE_ORDER.includes(s))
          .map(([s, e]) => ({ surface: s, entries: e }))
      );
  })();

  const useGroupHeaders = grouped.length > 1;

  // The form key forces a full remount when AI data arrives
  const formKey = editingEntry
    ? `edit-${editingEntry.id}`
    : `add-${JSON.stringify(aiInitial)}`;

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="paint-colors-tab">
      {/* Hidden AI file input */}
      <input
        ref={aiFileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleAiFileChange}
        aria-hidden="true"
      />

      {/* Tab header */}
      <div className="paint-tab-header">
        <div className="paint-tab-title">
          <h3>Paint Colors</h3>
          <span className="paint-entry-count" aria-label={`${entries.length} paint entries`}>
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {!showForm && (
          <button
            className="btn-primary"
            onClick={handleAdd}
            aria-label="Add a new paint color entry"
          >
            + Add Paint
          </button>
        )}
      </div>

      {/* Error banners */}
      {error && (
        <div className="error-banner" role="alert">{error}</div>
      )}
      {aiError && (
        <div className="error-banner" role="alert">
          ⚠️ {aiError}
        </div>
      )}

      {/* Inline Add / Edit form */}
      {showForm && (
        <div id="paint-entry-form-anchor">
          <PaintEntryForm
            key={formKey}
            initial={editingEntry ?? aiInitial}
            isEditing={editingEntry !== null}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={saving}
            onAiParse={handleAiParseClick}
            aiParsing={aiParsing}
          />
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !showForm && (
        <div className="paint-empty-state">
          <div className="paint-empty-icon" aria-hidden="true">🎨</div>
          <p className="paint-empty-title">No paint colors recorded yet</p>
          <p className="paint-empty-sub">
            Track wall colors, trim, ceilings and more so you always know
            exactly what to buy for touch-ups.
          </p>
          <button className="btn-primary" onClick={handleAdd}>
            + Add First Color
          </button>
        </div>
      )}

      {/* Entry list */}
      {entries.length > 0 && (
        <div className="paint-entry-list">
          {grouped.map(({ surface, entries: group }) => (
            <div key={surface} className="paint-surface-group">
              {useGroupHeaders && (
                <div className="paint-surface-group-header">
                  <span>{SURFACE_ICONS[surface] ?? "🎨"} {surface}</span>
                  <span className="paint-group-count">{group.length}</span>
                </div>
              )}
              {group.map((entry) => (
                <PaintEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaintColorsTab;
