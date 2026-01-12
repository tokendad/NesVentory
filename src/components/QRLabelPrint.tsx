import React, { useEffect, useState, useRef, useMemo } from "react";
import QRCode from "qrcode";
import type { Location, Item, PrinterConfig } from "../lib/api";
import { getPrinterConfig, printLabel } from "../lib/api";
import { NiimbotClient, BluetoothTransport, SerialTransport } from "../lib/niimbot";

// Print mode options
export type PrintMode = "qr_only" | "qr_with_items" | "items_only";

export const PRINT_MODE_OPTIONS: { value: PrintMode; label: string }[] = [
  { value: "qr_only", label: "Print QR Code Only" },
  { value: "qr_with_items", label: "Print QR Code with Item List" },
  { value: "items_only", label: "Print Item List Only" },
];

export type ConnectionType = "bluetooth" | "usb" | "server";

export const CONNECTION_OPTIONS: { value: ConnectionType; label: string; icon: string }[] = [
  { value: "server", label: "Server Printer (Recommended)", icon: "🖨️" },
  { value: "usb", label: "Direct USB (Web API)", icon: "🔌" },
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

// Label size presets - Currently supported: D11-H with 12x40mm labels
// Note: 12x40mm uses 472x136 (landscape) which becomes 136x472 after +90 rotation for USB printing
const LABEL_SIZES = [
  { value: "12x40", label: '12x40mm D11-H (0.47" x 1.57")', width: 472, height: 136 },
];

// Max items per label size
const LABEL_MAX_ITEMS: Record<string, number> = {
  "12x40": 2,
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
  const [selectedSize, setSelectedSize] = useState("12x40");
  const [connectionType, setConnectionType] = useState<ConnectionType>("server");
  const [loading, setLoading] = useState(true);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch printer configuration on mount
  useEffect(() => {
    const fetchPrinterConfig = async () => {
      try {
        const config = await getPrinterConfig();
        setPrinterConfig(config);
        // If server printer is configured, default to it? 
        // Or stick to bluetooth as default for mobile-first.
        // Let's keep bluetooth default unless maybe non-mobile detected, but hard to know.
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

  const handleServerPrint = async () => {
    try {
      setIsPrinting(true);
      setPrintError(null);
      setPrintSuccess(null);

      // Don't pass label_width/label_height - let the server use the correct
      // dimensions for the configured printer model (e.g., d11_h = 136x472)
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

  // Rotate ImageData +90 degrees clockwise (for USB direct printing)
  const rotateImageData90CW = (imageData: ImageData): ImageData => {
    const { width, height } = imageData;
    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = height;  // Swapped
    rotatedCanvas.height = width;  // Swapped
    const rotatedCtx = rotatedCanvas.getContext('2d');
    if (!rotatedCtx) return imageData;

    // Create a temporary canvas with original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return imageData;
    tempCtx.putImageData(imageData, 0, 0);

    // Rotate +90 degrees (clockwise)
    rotatedCtx.translate(height, 0);
    rotatedCtx.rotate(Math.PI / 2);
    rotatedCtx.drawImage(tempCanvas, 0, 0);

    return rotatedCtx.getImageData(0, 0, height, width);
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

      // Check if this is a D11-H style label (472x136 landscape, becomes 136x472 after rotation)
      const isD11HLabel = width === 472 && height === 136;

      if (isD11HLabel && printMode !== 'items_only' && qrDataUrl) {
          // D11-H layout: QR on left (becomes top after +90 rotation), text on right (becomes bottom)
          // Matches server layout: 124x124 QR, 32px font, maximized text area
          const img = new Image();
          img.src = qrDataUrl;
          await new Promise((resolve) => { img.onload = resolve; });

          // QR: 124x124, centered vertically on left side
          const qrSize = 124;
          const qrX = 6;
          const qrY = (height - qrSize) / 2;
          ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

          // Text area: starts after QR, uses remaining width
          // After rotation, this becomes the vertical text area below QR
          const textX = qrX + qrSize + 8;  // 138px from left
          const textW = width - textX - 5;  // ~329px available

          ctx.font = 'bold 32px Arial';
          let title = location.friendly_name || location.name;
          if (location.is_container) title += " [BOX]";
          if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;

          // Center text vertically in the 136px height
          const textY = (height - 32) / 2;  // Roughly centered for 32px font
          ctx.fillText(title, textX, textY, textW);

      } else if (printMode !== 'items_only' && qrDataUrl) {
          // Standard layout for other label sizes
          const img = new Image();
          img.src = qrDataUrl;
          await new Promise((resolve) => { img.onload = resolve; });

          const qrSize = Math.min(height - 10, 120);
          const qrY = (height - qrSize) / 2;
          ctx.drawImage(img, 10, qrY, qrSize, qrSize);

          const textX = 10 + qrSize + 10;
          const textW = width - textX - 10;

          ctx.font = 'bold 24px Arial';
          let title = location.friendly_name || location.name;
          if (location.is_container) title += " [BOX]";
          if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;
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
          ctx.font = 'bold 24px Arial';
          let title = "Contents: " + (location.friendly_name || location.name);
          if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;
          ctx.fillText(title, 10, 15);

          ctx.font = '14px Arial';
          let y = 50;
          for (const item of items) {
              if (y > height - 15) break;
              let itemText = "• " + item.name;
              if (item.brand) itemText += ` (${item.brand})`;
              ctx.fillText(itemText, 10, y, width - 20);
              y += 20;
          }
      }

      return ctx.getImageData(0, 0, width, height);
  };

  const handleDirectPrint = async () => {
    try {
        setIsConnecting(true);
        setPrintError(null);
        setPrintSuccess(null);
        
        let client: NiimbotClient;

        if (connectionType === 'bluetooth') {
             if (!navigator.bluetooth) {
                 throw new Error("Web Bluetooth is not supported in this browser.");
             }
             client = new NiimbotClient(new BluetoothTransport());
        } else if (connectionType === 'usb') {
             // Basic check for Web Serial support
             if (!('serial' in navigator)) {
                 throw new Error("Web Serial API is not supported in this browser. Try Chrome/Edge.");
             }
             client = new NiimbotClient(new SerialTransport());
        } else {
            throw new Error("Invalid connection type for direct print");
        }
        
        await client.connect();
        
        const width = labelSize?.width || 384;
        const height = labelSize?.height || 192;
        
        // Generate image data
        const imageData = await drawLabelToCanvas(width, height);
        if (!imageData) throw new Error("Failed to generate label image");

        // Rotate +90 degrees clockwise for direct USB/Bluetooth printing
        const rotatedImageData = rotateImageData90CW(imageData);

        await client.printImage(rotatedImageData);
        await client.disconnect();
        
        setPrintSuccess(`Printed successfully via ${connectionType === 'bluetooth' ? 'Bluetooth' : 'USB'}!`);

    } catch (err: any) {
        console.error("Direct print failed:", err);
        setPrintError(`${connectionType === 'bluetooth' ? 'Bluetooth' : 'USB'} print failed: ` + err.message);
    } finally {
        setIsConnecting(false);
    }
  };

  const handleBrowserPrint = () => {
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
              <label>Label Size</label>
              <div style={{ padding: "0.5rem", backgroundColor: "var(--bg-secondary)", borderRadius: "4px" }}>
                12x40mm D11-H (0.47" x 1.57")
              </div>
              <span className="help-text">
                Currently supported: D11-H. Future models coming soon.
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
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
               <label htmlFor="connectionType">Connection Method</label>
               <select
                  id="connectionType"
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
               >
                  {CONNECTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                      </option>
                  ))}
               </select>
               <span className="help-text">
                   Choose how your printer is connected
               </span>
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
                </div>
            )}
          </div>
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
            <li>Currently supported: NIIMBOT D11-H. Future models coming soon.</li>
            {connectionType === 'usb' && <li>🔌 USB: Best for desktop (requires Web Serial)</li>}
            {connectionType === 'server' && <li>🖨️ Server: Prints to a printer connected to the NesVentory server</li>}
            <li>Label Size: 12x40mm (D11-H)</li>
          </ul>
        </div>

        <div className="form-actions">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          
          <button
            className="btn-primary"
            onClick={handleBrowserPrint}
            disabled={printMode !== "items_only" && loading}
            style={{ marginRight: 'auto' }}
          >
            🖨️ Browser Print
          </button>

          {connectionType === 'server' ? (
             <button
               className="btn-success"
               onClick={handleServerPrint}
               disabled={isPrinting}
               style={{ marginLeft: "0.5rem" }}
               title="Print to printer connected to server"
             >
               {isPrinting ? "⏳ Printing..." : "🖨️ Send to Server"}
             </button>
          ) : (
            <button
                className="btn-success"
                onClick={handleDirectPrint}
                disabled={isConnecting}
                style={{ marginLeft: "0.5rem", backgroundColor: "#2196F3" }}
                title={`Print directly via ${connectionType === 'bluetooth' ? 'Bluetooth' : 'USB'}`}
              >
                {isConnecting ? "⏳ Connecting..." : `${CONNECTION_OPTIONS.find(c => c.value === connectionType)?.icon} Direct Print`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRLabelPrint;
