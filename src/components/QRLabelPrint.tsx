import React, { useEffect, useState, useRef, useMemo } from "react";
import QRCode from "qrcode";
import type { Location, Item, PrinterConfig } from "../lib/api";
import { getPrinterConfig, printLabel } from "../lib/api";
import { NiimbotClient } from "../lib/niimbot";

// Print mode options
export type PrintMode = "qr_only" | "qr_with_items" | "items_only";

export const PRINT_MODE_OPTIONS: { value: PrintMode; label: string }[] = [
  { value: "qr_only", label: "Print QR Code Only" },
  { value: "qr_with_items", label: "Print QR Code with Item List" },
  { value: "items_only", label: "Print Item List Only" },
];

interface QRLabelPrintProps {
  location: Location;
  items: Item[];
  onClose: () => void;
  initialPrintMode?: PrintMode;
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
  initialPrintMode,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [printMode, setPrintMode] = useState<PrintMode>(initialPrintMode || "qr_with_items");
  const [selectedHoliday, setSelectedHoliday] = useState("none");
  const [selectedSize, setSelectedSize] = useState("4x2");
  const [loading, setLoading] = useState(true);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isBluetoothConnecting, setIsBluetoothConnecting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch printer configuration on mount
  useEffect(() => {
    const fetchPrinterConfig = async () => {
      try {
        const config = await getPrinterConfig();
        setPrinterConfig(config);
      } catch (err) {
        console.error("Failed to fetch printer config:", err);
      }
    };
    fetchPrinterConfig();
  }, []);

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

  const handleNiimbotPrint = async () => {
    try {
      setIsPrinting(true);
      setPrintError(null);
      setPrintSuccess(null);

      const result = await printLabel({
        location_id: location.id.toString(),
        location_name: location.friendly_name || location.name,
        is_container: location.is_container || false,
      });

      if (result.success) {
        setPrintSuccess(result.message);
      } else {
        setPrintError(result.message);
      }
    } catch (err) {
      console.error("Failed to print to NIIMBOT:", err);
      setPrintError("Failed to print label. Please check your printer connection.");
    } finally {
      setIsPrinting(false);
    }
  };

  const drawLabelToCanvas = async (width: number, height: number): Promise<ImageData | null> => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'black';
      ctx.textBaseline = 'top';

      // Load QR Image
      if (printMode !== 'items_only' && qrDataUrl) {
          const img = new Image();
          img.src = qrDataUrl;
          await new Promise((resolve) => { img.onload = resolve; });
          
          // Draw QR
          // Size: fit height minus margins
          const qrSize = Math.min(height - 10, 120);
          const qrY = (height - qrSize) / 2;
          ctx.drawImage(img, 10, qrY, qrSize, qrSize);
          
          // Draw Text
          const textX = 10 + qrSize + 10;
          const textW = width - textX - 10;
          
          ctx.font = 'bold 24px Arial';
          let title = location.friendly_name || location.name;
          if (location.is_container) title += " [BOX]";
          if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;
          
          // Simple wrap or truncate? Truncate for now
          ctx.fillText(title, textX, 15, textW);
          
          ctx.font = '16px Arial';
          ctx.fillStyle = '#666';
          const typeText = location.location_type?.replace(/_/g, " ") || "";
          ctx.fillText(typeText, textX, 45, textW);
          
          if (printMode !== 'qr_only' && items.length > 0) {
               ctx.fillStyle = 'black';
               ctx.font = 'bold 14px Arial';
               ctx.fillText(`Contents (${items.length}):`, textX, 70, textW);
               
               ctx.font = '12px Arial';
               let y = 90;
               for (const item of displayItems) {
                   if (y > height - 15) break;
                   let itemText = "• " + item.name;
                   ctx.fillText(itemText, textX, y, textW);
                   y += 15;
               }
          }

      } else if (printMode === 'items_only') {
          // Just list
           ctx.font = 'bold 24px Arial';
           let title = "Contents: " + (location.friendly_name || location.name);
           if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;
           ctx.fillText(title, 10, 15);
           
           ctx.font = '14px Arial';
           let y = 50;
           for (const item of items) { // Show more items since no QR
               if (y > height - 15) break;
               let itemText = "• " + item.name;
               if (item.brand) itemText += ` (${item.brand})`;
               ctx.fillText(itemText, 10, y, width - 20);
               y += 20;
           }
      }

      return ctx.getImageData(0, 0, width, height);
  };

  const handleBluetoothPrint = async () => {
    try {
        setIsBluetoothConnecting(true);
        setPrintError(null);
        setPrintSuccess(null);
        
        const client = new NiimbotClient();
        await client.connect();
        
        const width = labelSize?.width || 384;
        const height = labelSize?.height || 192;
        
        // Generate image data
        const imageData = await drawLabelToCanvas(width, height);
        if (!imageData) throw new Error("Failed to generate label image");
        
        await client.printImage(imageData);
        await client.disconnect();
        
        setPrintSuccess("Printed successfully via Bluetooth!");

    } catch (err: any) {
        console.error("Bluetooth print failed:", err);
        setPrintError("Bluetooth print failed: " + err.message);
    } finally {
        setIsBluetoothConnecting(false);
    }
  };

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
          <h2>Print Label</h2>
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

        {/* Success Message */}
        {printSuccess && (
          <div className="success-banner" style={{ background: "#4caf50", color: "white", padding: "1rem", borderRadius: "4px", marginBottom: "1rem" }}>
            {printSuccess}
            <button 
              onClick={() => setPrintSuccess(null)}
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
              <label htmlFor="printMode">Print Mode</label>
              <select
                id="printMode"
                value={printMode}
                onChange={(e) => setPrintMode(e.target.value as PrintMode)}
              >
                {PRINT_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="help-text">
                Choose what to include on the label
              </span>
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
              {printMode !== "items_only" && (
                <div className="qr-section">
                  {loading ? (
                    <div className="qr-loading">Generating...</div>
                  ) : (
                    <img src={qrDataUrl} alt="QR Code" className="qr-code" />
                  )}
                </div>
              )}
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
                {printMode !== "qr_only" && displayItems.length > 0 && (
                  <div className="items-list">
                    <div className="items-list-title">
                      Contents ({items.length} item{items.length !== 1 ? "s" : ""}):
                    </div>
                    {displayItems.map((item) => (
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
            {printerConfig?.enabled && (
              <li>✅ NIIMBOT printer configured ({printerConfig.model.toUpperCase()})</li>
            )}
            <li>For best results, use the same paper size in your printer settings</li>
            <li>Scanning the QR code will show items in this location</li>
            {!printerConfig?.enabled && (
              <li>Configure NIIMBOT printer in User Settings for direct printing</li>
            )}
          </ul>
        </div>

        <div className="form-actions">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          
          <button
              className="btn-success"
              onClick={handleBluetoothPrint}
              disabled={isBluetoothConnecting}
              style={{ marginLeft: "0.5rem", backgroundColor: "#2196F3" }}
              title="Print directly from phone"
            >
              {isBluetoothConnecting ? "⏳ Connecting..." : "📱 Bluetooth Print"}
          </button>

          {printerConfig?.enabled && (
            <button
              className="btn-success"
              onClick={handleNiimbotPrint}
              disabled={isPrinting}
              style={{ marginLeft: "0.5rem" }}
            >
              {isPrinting ? "⏳ Printing..." : "🖨️ Print to NIIMBOT"}
            </button>
          )}
          <button
            className="btn-primary"
            onClick={handlePrint}
            disabled={printMode !== "items_only" && loading}
          >
            🖨️ Browser Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRLabelPrint;
