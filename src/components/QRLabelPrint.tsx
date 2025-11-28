import React, { useEffect, useState, useRef, useMemo } from "react";
import QRCode from "qrcode";
import type { Location, Item } from "../lib/api";

interface QRLabelPrintProps {
  location: Location;
  items: Item[];
  onClose: () => void;
}

// Seasonal holiday icons
const HOLIDAY_ICONS: Record<string, string> = {
  none: "",
  christmas: "🎄",
  halloween: "🎃",
  easter: "🐰",
  thanksgiving: "🦃",
  valentines: "💕",
  stpatricks: "☘️",
  independence: "🎆",
  newyear: "🎉",
};

const HOLIDAY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "christmas", label: "Christmas 🎄" },
  { value: "halloween", label: "Halloween 🎃" },
  { value: "easter", label: "Easter 🐰" },
  { value: "thanksgiving", label: "Thanksgiving 🦃" },
  { value: "valentines", label: "Valentine's Day 💕" },
  { value: "stpatricks", label: "St. Patrick's Day ☘️" },
  { value: "independence", label: "Independence Day 🎆" },
  { value: "newyear", label: "New Year 🎉" },
];

// Label size presets for common label printers
const LABEL_SIZES = [
  { value: "2x1", label: '2" x 1" (Small)', width: 192, height: 96 },
  { value: "2x2", label: '2" x 2" (Square)', width: 192, height: 192 },
  { value: "4x2", label: '4" x 2" (Standard)', width: 384, height: 192 },
  { value: "4x3", label: '4" x 3" (Large)', width: 384, height: 288 },
  { value: "4x6", label: '4" x 6" (Shipping)', width: 384, height: 576 },
];

// Max items per label size
const LABEL_MAX_ITEMS: Record<string, number> = {
  "2x1": 0,
  "2x2": 3,
  "4x2": 5,
  "4x3": 8,
  "4x6": 10,
};

// HTML escape function for security
const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const QRLabelPrint: React.FC<QRLabelPrintProps> = ({
  location,
  items,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showItemList, setShowItemList] = useState(true);
  const [selectedHoliday, setSelectedHoliday] = useState("none");
  const [selectedSize, setSelectedSize] = useState("4x2");
  const [loading, setLoading] = useState(true);
  const [printError, setPrintError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Memoize label size to avoid repeated lookups
  const labelSize = useMemo(() => {
    return LABEL_SIZES.find((s) => s.value === selectedSize);
  }, [selectedSize]);

  // Generate the URL that the QR code will point to
  const getLocationUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/#/location/${location.id}`;
  };

  // Generate QR code on mount or when location changes
  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        const url = getLocationUrl();
        const dataUrl = await QRCode.toDataURL(url, {
          width: 150,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("Failed to generate QR code:", err);
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, [location.id]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setPrintError("Please allow pop-ups to print the label.");
      return;
    }

    const width = labelSize?.width || 384;
    const height = labelSize?.height || 192;
    const escapedTitle = escapeHtml(location.friendly_name || location.name);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${escapedTitle}</title>
          <style>
            @page {
              size: ${width / 96}in ${height / 96}in;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              width: ${width}px;
              height: ${height}px;
              padding: 8px;
              display: flex;
              flex-direction: column;
            }
            .label-container {
              display: flex;
              gap: 10px;
              flex: 1;
              min-height: 0;
            }
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-code {
              max-width: ${Math.min(height - 40, 120)}px;
              max-height: ${Math.min(height - 40, 120)}px;
            }
            .info-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .location-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .location-type {
              font-size: 10px;
              color: #666;
              margin-bottom: 4px;
            }
            .holiday-icon {
              font-size: 16px;
            }
            .items-list {
              font-size: 9px;
              line-height: 1.3;
              overflow: hidden;
              flex: 1;
            }
            .items-list-title {
              font-weight: bold;
              margin-bottom: 2px;
              font-size: 10px;
            }
            .item-entry {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .container-badge {
              background: #4ecdc4;
              color: white;
              padding: 1px 4px;
              border-radius: 3px;
              font-size: 8px;
              font-weight: bold;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Small delay to ensure content is rendered
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const holidayIcon = HOLIDAY_ICONS[selectedHoliday];

  // Limit items shown based on label size using lookup table
  const maxItems = LABEL_MAX_ITEMS[selectedSize] || 5;
  const displayItems = items.slice(0, maxItems);
  const hasMoreItems = items.length > maxItems;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Print QR Label</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Error Message */}
        {printError && (
          <div className="error-banner">
            {printError}
            <button 
              onClick={() => setPrintError(null)}
              style={{ marginLeft: "0.5rem", background: "none", border: "none", color: "inherit", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Options */}
        <div className="qr-options">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="labelSize">Label Size</label>
              <select
                id="labelSize"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
              >
                {LABEL_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
              <span className="help-text">
                Select your label printer paper size
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="holidayIcon">Seasonal Icon</label>
              <select
                id="holidayIcon"
                value={selectedHoliday}
                onChange={(e) => setSelectedHoliday(e.target.value)}
              >
                {HOLIDAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="help-text">
                Optional holiday decoration
              </span>
            </div>
          </div>

          {items.length > 0 && selectedSize !== "2x1" && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showItemList}
                  onChange={(e) => setShowItemList(e.target.checked)}
                />
                <span>Include item list on label</span>
              </label>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="qr-preview-section">
          <h3>Label Preview</h3>
          <div
            className="qr-label-preview"
            style={{
              width: `${labelSize?.width}px`,
              height: `${labelSize?.height}px`,
              maxWidth: "100%",
              transform: labelSize && labelSize.width > 400 ? "scale(0.8)" : "none",
              transformOrigin: "top left",
            }}
          >
            <div ref={printRef} className="label-container">
              <div className="qr-section">
                {loading ? (
                  <div className="qr-loading">Generating...</div>
                ) : (
                  <img src={qrDataUrl} alt="QR Code" className="qr-code" />
                )}
              </div>
              <div className="info-section">
                <div className="location-name">
                  {holidayIcon && <span className="holiday-icon">{holidayIcon}</span>}
                  {location.friendly_name || location.name}
                  {location.is_container && (
                    <span className="container-badge">BOX</span>
                  )}
                </div>
                {location.location_type && (
                  <div className="location-type">
                    {location.location_type.replace(/_/g, " ")}
                  </div>
                )}
                {showItemList && displayItems.length > 0 && (
                  <div className="items-list">
                    <div className="items-list-title">
                      Contents ({items.length} item{items.length !== 1 ? "s" : ""}):
                    </div>
                    {displayItems.map((item, index) => (
                      <div key={item.id} className="item-entry">
                        • {item.name}
                        {item.brand && ` (${item.brand})`}
                      </div>
                    ))}
                    {hasMoreItems && (
                      <div className="item-entry" style={{ fontStyle: "italic" }}>
                        ... and {items.length - maxItems} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info about label printing */}
        <div className="label-printer-info">
          <h4>Label Printer Tips</h4>
          <ul>
            <li>Supports Dymo, Brother, Zebra, and other thermal label printers</li>
            <li>For best results, use the same paper size in your printer settings</li>
            <li>Scanning the QR code will show items in this location</li>
            <li>Android app support planned for future development</li>
          </ul>
        </div>

        <div className="form-actions">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handlePrint}
            disabled={loading}
          >
            🖨️ Print Label
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRLabelPrint;
