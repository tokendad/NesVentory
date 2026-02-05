import React, { useEffect, useState, useRef, useMemo } from "react";
import QRCode from "qrcode";
import type { Location, Item, PrinterConfig, SystemPrinter } from "../lib/api";
import {
  getPrinterConfig,
  printLabel,
  checkSystemPrintersAvailable,
  getSystemPrinters,
  printToSystemPrinter,
  printItemToSystemPrinter,
  detectRfidProfile,
  type RfidDetectionResult,
  type RfidProfile,
} from "../lib/api";
import {
  NiimbotClient,
  BluetoothTransport,
  SerialTransport,
  NIIMBOT_MODELS,
  getModelSpec,
  getDefaultModel,
  type NiimbotModelSpec,
} from "../lib/niimbot";

// Print mode options
export type PrintMode = "qr_only" | "qr_with_items" | "items_only";

export const PRINT_MODE_OPTIONS: { value: PrintMode; label: string }[] = [
  { value: "qr_only", label: "Print QR Code Only" },
  { value: "qr_with_items", label: "Print QR Code with Item List" },
  { value: "items_only", label: "Print Item List Only" },
];

export type ConnectionType = "bluetooth" | "usb" | "server" | "system";

export const CONNECTION_OPTIONS: { value: ConnectionType; label: string; icon: string }[] = [
  { value: "server", label: "Server NIIMBOT (Recommended)", icon: "🖨️" },
  { value: "system", label: "System Printer (CUPS)", icon: "🖥️" },
  { value: "bluetooth", label: "Bluetooth (Mobile/Laptop)", icon: "📱" },
  { value: "usb", label: "Direct USB (Web API)", icon: "🔌" },
];

// Props can be for either a location or an item
interface QRLabelPrintPropsBase {
  onClose: () => void;
  initialPrintMode?: PrintMode;
}

interface QRLabelPrintPropsLocation extends QRLabelPrintPropsBase {
  location: Location;
  items: Item[];
  item?: never;
}

interface QRLabelPrintPropsItem extends QRLabelPrintPropsBase {
  item: Item;
  location?: never;
  items?: never;
}

type QRLabelPrintProps = QRLabelPrintPropsLocation | QRLabelPrintPropsItem;

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

// localStorage keys for print preferences
const PRINT_PREFS_KEY = "nesventory_print_preferences";

interface PrintPreferences {
  connectionType: ConnectionType;
  printMode: PrintMode;
  holiday: string;
  printerModel: string;  // NIIMBOT model for direct printing
}

const loadPrintPreferences = (): Partial<PrintPreferences> => {
  try {
    const saved = localStorage.getItem(PRINT_PREFS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load print preferences:", e);
  }
  return {};
};

const savePrintPreferences = (prefs: Partial<PrintPreferences>) => {
  try {
    const current = loadPrintPreferences();
    localStorage.setItem(PRINT_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch (e) {
    console.error("Failed to save print preferences:", e);
  }
};

const QRLabelPrint: React.FC<QRLabelPrintProps> = (props) => {
  const { onClose, initialPrintMode } = props;

  // Determine if we're printing for a location or an item
  const isItemMode = 'item' in props && props.item !== undefined;
  const location = isItemMode ? undefined : (props as QRLabelPrintPropsLocation).location;
  const items = isItemMode ? [] : (props as QRLabelPrintPropsLocation).items;
  const item = isItemMode ? (props as QRLabelPrintPropsItem).item : undefined;
  // Load saved preferences
  const savedPrefs = useMemo(() => loadPrintPreferences(), []);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [printMode, setPrintMode] = useState<PrintMode>(initialPrintMode || savedPrefs.printMode || "qr_with_items");
  const [selectedHoliday, setSelectedHoliday] = useState(savedPrefs.holiday || "none");
  const [selectedSize] = useState("12x40");
  const [connectionType, setConnectionType] = useState<ConnectionType>(savedPrefs.connectionType || "server");

  // NIIMBOT printer model selection for direct printing (Bluetooth/USB)
  const [selectedPrinterModel, setSelectedPrinterModel] = useState<string>(
    savedPrefs.printerModel || getDefaultModel().model
  );
  const [loading, setLoading] = useState(true);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // System printer state
  const [systemPrintersAvailable, setSystemPrintersAvailable] = useState<boolean | null>(null);
  const [systemPrinters, setSystemPrinters] = useState<SystemPrinter[]>([]);
  const [selectedSystemPrinter, setSelectedSystemPrinter] = useState<string>("");
  const [loadingSystemPrinters, setLoadingSystemPrinters] = useState(false);

  // RFID detection state
  const [detectedProfile, setDetectedProfile] = useState<RfidProfile | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [manualOverride, setManualOverride] = useState(false);
  const [overrideWarningDismissed, setOverrideWarningDismissed] = useState(false);

  // Browser capability detection
  const browserCapabilities = useMemo(() => {
    const hasWebBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    const hasWebSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
    return { hasWebBluetooth, hasWebSerial };
  }, []);

  // Set default connection type based on browser capabilities (only if no saved preference)
  useEffect(() => {
    // Only auto-select if user hasn't set a preference before
    if (savedPrefs.connectionType) return;

    if (!browserCapabilities.hasWebBluetooth && !browserCapabilities.hasWebSerial) {
      // Neither API available - default to server
      setConnectionType("server");
    } else if (browserCapabilities.hasWebSerial && !browserCapabilities.hasWebBluetooth) {
      // Only USB available (desktop Chrome without BT)
      setConnectionType("usb");
    } else if (browserCapabilities.hasWebBluetooth && !browserCapabilities.hasWebSerial) {
      // Only Bluetooth available (mobile)
      setConnectionType("bluetooth");
    }
    // If both available, keep default "server"
  }, [browserCapabilities, savedPrefs.connectionType]);

  // Save preferences when they change
  useEffect(() => {
    savePrintPreferences({ connectionType });
  }, [connectionType]);

  useEffect(() => {
    savePrintPreferences({ printMode });
  }, [printMode]);

  useEffect(() => {
    savePrintPreferences({ holiday: selectedHoliday });
  }, [selectedHoliday]);

  useEffect(() => {
    savePrintPreferences({ printerModel: selectedPrinterModel });
  }, [selectedPrinterModel]);

  // Get current model spec for direct printing
  const currentModelSpec = useMemo(() => {
    return getModelSpec(selectedPrinterModel) || getDefaultModel();
  }, [selectedPrinterModel]);

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

  // Check system printer availability and fetch printers when "system" is selected
  useEffect(() => {
    if (connectionType !== "system") return;

    const fetchSystemPrinters = async () => {
      setLoadingSystemPrinters(true);
      try {
        const availability = await checkSystemPrintersAvailable();
        setSystemPrintersAvailable(availability.available);

        if (availability.available) {
          const printers = await getSystemPrinters();
          setSystemPrinters(printers);
          // Auto-select default printer or first one
          const defaultPrinter = printers.find(p => p.is_default);
          if (defaultPrinter) {
            setSelectedSystemPrinter(defaultPrinter.name);
          } else if (printers.length > 0) {
            setSelectedSystemPrinter(printers[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch system printers:", err);
        setSystemPrintersAvailable(false);
      } finally {
        setLoadingSystemPrinters(false);
      }
    };

    fetchSystemPrinters();
  }, [connectionType]);

  // Memoize label size to avoid repeated lookups
  const labelSize = useMemo(() => {
    return LABEL_SIZES.find((s) => s.value === selectedSize);
  }, [selectedSize]);

  // Generate the URL that the QR code will point to
  const getTargetUrl = () => {
    const baseUrl = window.location.origin;
    if (isItemMode && item) {
      return `${baseUrl}/#/item/${item.id}`;
    }
    return `${baseUrl}/#/location/${location!.id}`;
  };

  // Get the display name for the label
  const getLabelName = () => {
    if (isItemMode && item) {
      return item.name;
    }
    return location!.friendly_name || location!.name;
  };

  // Get subtitle info (brand/model for items, location type for locations)
  const getLabelSubtitle = () => {
    if (isItemMode && item) {
      const parts = [];
      if (item.brand) parts.push(item.brand);
      if (item.model_number) parts.push(item.model_number);
      return parts.join(" - ");
    }
    return location!.location_type?.replace(/_/g, " ") || "";
  };

  // Generate QR code on mount or when location/item changes
  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        const url = getTargetUrl();
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
  }, [isItemMode ? item?.id : location?.id]);

  // Handle RFID detection
  const handleDetectRfid = async () => {
    try {
      setIsDetecting(true);
      setDetectionError(null);
      setDetectedProfile(null);
      setManualOverride(false);
      setOverrideWarningDismissed(false);

      const result: RfidDetectionResult = await detectRfidProfile();

      if (!result.success) {
        setDetectionError(result.error || "RFID detection failed");
        return;
      }

      if (result.detected_profile) {
        setDetectedProfile(result.detected_profile);
        setDetectionConfidence(result.confidence || 0);
        // Auto-select the detected printer model
        setSelectedPrinterModel(result.detected_profile.model);
      } else {
        setDetectionError("Could not match RFID label to any known profile. Please select a profile manually.");
      }
    } catch (err: any) {
      console.error("RFID detection error:", err);
      setDetectionError(`Error communicating with printer: ${err.message || "Unknown error"}`);
    } finally {
      setIsDetecting(false);
    }
  };

  // Handle profile override toggle
  const handleToggleOverride = () => {
    if (!overrideWarningDismissed) {
      // First click shows warning, second click enables override
      setOverrideWarningDismissed(true);
      return;
    }
    setManualOverride(!manualOverride);
  };

  const handleServerPrint = async () => {
    try {
      setIsPrinting(true);
      setPrintError(null);
      setPrintSuccess(null);

      if (isItemMode) {
        // Item printing via server not yet supported - use direct printing
        setPrintError("Server printing for items is not yet supported. Please use USB or Bluetooth direct printing.");
        return;
      }

      // RFID detection disabled - using fixed model specs instead
      const result = await printLabel({
        location_id: location!.id.toString(),
        location_name: location!.friendly_name || location!.name,
        is_container: location!.is_container || false,
        // label_width_mm and label_height_mm removed - using model specs
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

  // Handle printing to system printer (CUPS)
  const handleSystemPrint = async () => {
    try {
      setIsPrinting(true);
      setPrintError(null);
      setPrintSuccess(null);

      if (!selectedSystemPrinter) {
        setPrintError("Please select a system printer.");
        return;
      }

      let result;
      if (isItemMode && item) {
        result = await printItemToSystemPrinter(selectedSystemPrinter, item.id.toString());
      } else if (location) {
        result = await printToSystemPrinter(selectedSystemPrinter, location.id.toString());
      } else {
        setPrintError("No location or item specified.");
        return;
      }

      if (result.success) {
        setPrintSuccess(result.message);
      } else {
        setPrintError(result.message);
      }
    } catch (err) {
      console.error("Failed to print to system printer:", err);
      setPrintError("Failed to print label. Please check CUPS is running and the printer is available.");
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

  // Calculate responsive QR size based on label dimensions
  const calculateResponsiveQRSize = (labelWidth: number, labelHeight: number, printheadPixels: number): number => {
      // QR should take ~35-40% of the smallest dimension
      const minDimension = Math.min(labelWidth, labelHeight);
      const maxQr = Math.floor(minDimension * 0.35);

      // QR code minimum 50px, bounded by dimensions
      const qrSize = Math.max(50, Math.min(maxQr, minDimension - 10));

      // Round to nearest multiple of 10 for cleaner sizing
      return Math.floor(qrSize / 10) * 10;
  };

  // Calculate responsive font size based on DPI and available space
  const calculateResponsiveFontSize = (labelHeight: number, dpi: number, labelWidth: number): number => {
      const qrSize = calculateResponsiveQRSize(labelWidth, labelHeight, Math.min(labelWidth, labelHeight));
      const availableHeight = labelHeight - qrSize - 10;

      // Font should be ~20% of available height
      let baseFont = Math.max(8, Math.floor(availableHeight * 0.2));

      // Adjust for DPI: normalize to 203 DPI baseline
      const dpiFactor = dpi / 203.0;

      // Apply DPI factor with reasonable range (0.6 to 1.5)
      const dpiAdjusted = baseFont * Math.min(Math.max(dpiFactor, 0.6), 1.5);

      // Ensure minimum readability
      return Math.max(8, Math.floor(dpiAdjusted));
  };

  // Draw label to canvas using model-specific dimensions
  // For "left" direction printers: width = label length, height = printheadPixels (rotated later)
  // For "top" direction printers: width = printheadPixels, height = label length
  const drawLabelForModel = async (modelSpec: NiimbotModelSpec): Promise<ImageData | null> => {
      const { printheadPixels, dpi, printDirection } = modelSpec;

      // Calculate label dimensions based on DPI and common 40mm label length
      // 40mm at 203 DPI = ~320px, at 300 DPI = ~472px
      const labelLengthMm = 40;
      const labelLengthPx = Math.round((labelLengthMm / 25.4) * dpi);

      // For "left" direction: canvas width = label length, height = printhead width
      // Image will be rotated +90° before printing
      // For "top" direction: canvas width = printhead width, height = label length
      // No rotation needed
      let canvasWidth: number;
      let canvasHeight: number;

      if (printDirection === 'left') {
          canvasWidth = labelLengthPx;
          canvasHeight = printheadPixels;
      } else {
          canvasWidth = printheadPixels;
          canvasHeight = labelLengthPx;
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = 'black';
      ctx.textBaseline = 'top';

      // Get the label title
      const labelTitle = getLabelName();

      // Calculate responsive sizes
      const qrSize = calculateResponsiveQRSize(canvasWidth, canvasHeight, printheadPixels);
      const fontSize = calculateResponsiveFontSize(canvasHeight, dpi, canvasWidth);
      const padding = Math.round(4 * (printheadPixels / 96)); // Scale padding with printhead

      if (printMode !== 'items_only' && qrDataUrl) {
          const img = new Image();
          img.src = qrDataUrl;
          await new Promise((resolve) => { img.onload = resolve; });

          if (printDirection === 'left') {
              // Horizontal layout: QR on left, text on right
              // After +90° rotation: QR on top, text below
              const qrX = padding;
              const qrY = Math.round((canvasHeight - qrSize) / 2);
              ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

              const textX = qrX + qrSize + padding * 2;
              const textW = canvasWidth - textX - padding;

              ctx.font = `bold ${fontSize}px Arial`;
              let title = labelTitle;
              if (!isItemMode && location?.is_container) title += " [BOX]";
              if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;

              // Center text vertically
              const textY = Math.round((canvasHeight - fontSize) / 2);
              ctx.fillText(title, textX, textY, textW);
          } else {
              // Vertical layout for "top" direction printers (B1, B21, etc.)
              // QR on top, text below - no rotation needed
              const qrX = Math.round((canvasWidth - qrSize) / 2);
              const qrY = padding;
              ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

              const textY = qrY + qrSize + padding * 2;
              const textW = canvasWidth - padding * 2;

              ctx.font = `bold ${fontSize}px Arial`;
              let title = labelTitle;
              if (!isItemMode && location?.is_container) title += " [BOX]";
              if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;

              // Center text horizontally
              const metrics = ctx.measureText(title);
              const textX = Math.max(padding, Math.round((canvasWidth - metrics.width) / 2));
              ctx.fillText(title, textX, textY, textW);
          }
      } else if (printMode === 'items_only' && !isItemMode) {
          ctx.font = `bold ${fontSize}px Arial`;
          let title = "Contents: " + labelTitle;
          if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;
          ctx.fillText(title, padding, padding);

          ctx.font = `${Math.round(fontSize * 0.8)}px Arial`;
          let y = padding + fontSize + padding;
          for (const listItem of items) {
              if (y > canvasHeight - fontSize) break;
              let itemText = "• " + listItem.name;
              if (listItem.brand) itemText += ` (${listItem.brand})`;
              ctx.fillText(itemText, padding, y, canvasWidth - padding * 2);
              y += Math.round(fontSize * 1.2);
          }
      }

      return ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  };

  // Legacy function for browser print preview (uses fixed dimensions)
  const drawLabelToCanvas = async (width: number, height: number): Promise<ImageData | null> => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'black';
      ctx.textBaseline = 'top';

      const labelTitle = getLabelName();
      const labelSubtitle = getLabelSubtitle();

      if (printMode !== 'items_only' && qrDataUrl) {
          const img = new Image();
          img.src = qrDataUrl;
          await new Promise((resolve) => { img.onload = resolve; });

          const qrSize = Math.min(height - 10, 120);
          const qrY = (height - qrSize) / 2;
          ctx.drawImage(img, 10, qrY, qrSize, qrSize);

          const textX = 10 + qrSize + 10;
          const textW = width - textX - 10;

          ctx.font = 'bold 24px Arial';
          let title = labelTitle;
          if (!isItemMode && location?.is_container) title += " [BOX]";
          if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;
          ctx.fillText(title, textX, 15, textW);

          ctx.font = '16px Arial';
          ctx.fillStyle = '#666';
          ctx.fillText(labelSubtitle, textX, 45, textW);

          if (!isItemMode && printMode !== 'qr_only' && items.length > 0) {
               ctx.fillStyle = 'black';
               ctx.font = 'bold 14px Arial';
               ctx.fillText(`Contents (${items.length}):`, textX, 70, textW);

               ctx.font = '12px Arial';
               let y = 90;
               for (const displayItem of displayItems) {
                   if (y > height - 15) break;
                   ctx.fillText("• " + displayItem.name, textX, y, textW);
                   y += 15;
               }
          }
      } else if (printMode === 'items_only' && !isItemMode) {
          ctx.font = 'bold 24px Arial';
          let title = "Contents: " + labelTitle;
          if (holidayIcon) title = HOLIDAY_ICONS[selectedHoliday] + " " + title;
          ctx.fillText(title, 10, 15);

          ctx.font = '14px Arial';
          let y = 50;
          for (const listItem of items) {
              if (y > height - 15) break;
              let itemText = "• " + listItem.name;
              if (listItem.brand) itemText += ` (${listItem.brand})`;
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

        const modelSpec = currentModelSpec;
        console.log(`Direct printing with model: ${modelSpec.model} (${modelSpec.printheadPixels}px @ ${modelSpec.dpi}DPI, direction: ${modelSpec.printDirection})`);

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

        // Generate image data using model-specific dimensions
        const imageData = await drawLabelForModel(modelSpec);
        if (!imageData) throw new Error("Failed to generate label image");

        // For "left" direction printers, rotate +90 degrees clockwise
        // For "top" direction printers, no rotation needed
        const printImageData = modelSpec.printDirection === 'left'
            ? rotateImageData90CW(imageData)
            : imageData;

        // Use model-specific density
        await client.printImage(printImageData, modelSpec.densityDefault);
        await client.disconnect();

        setPrintSuccess(`Printed successfully via ${connectionType === 'bluetooth' ? 'Bluetooth' : 'USB'} to ${modelSpec.label}!`);

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
    const escapedTitle = escapeHtml(getLabelName());

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
          <h2>Print {isItemMode ? "Item" : "Location"} Label</h2>
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

        {/* Configuration Help Banner */}
        {connectionType === 'server' ? (
          <div style={{
            background: "rgba(255, 193, 7, 0.15)",
            border: "1px solid rgba(255, 193, 7, 0.5)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.9rem"
          }}>
            <strong>Server NIIMBOT Printing</strong> requires configuration in{" "}
            <a href="#/settings" style={{ color: "var(--accent)" }}>User Settings → Printer</a>.
            {!printerConfig?.enabled && (
              <span style={{ color: "#ff9800", marginLeft: "0.5rem" }}>
                (Not currently configured)
              </span>
            )}
          </div>
        ) : connectionType === 'system' ? (
          <div style={{
            background: "rgba(33, 150, 243, 0.15)",
            border: "1px solid rgba(33, 150, 243, 0.5)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.9rem"
          }}>
            <strong>System Printer (CUPS)</strong> - Print to any printer configured on the server.
            {systemPrintersAvailable === false && (
              <span style={{ color: "#f44336", display: "block", marginTop: "0.25rem" }}>
                CUPS not available. Ensure CUPS is running and the socket is mounted in Docker.
              </span>
            )}
          </div>
        ) : (
          <div style={{
            background: "rgba(76, 175, 80, 0.15)",
            border: "1px solid rgba(76, 175, 80, 0.5)",
            borderRadius: "6px",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.9rem"
          }}>
            <strong>Direct {connectionType === 'bluetooth' ? 'Bluetooth' : 'USB'} Printing</strong> - Select your
            printer model below for correct label sizing, then click print.
          </div>
        )}

        {/* RFID Detection Section - TEMPORARILY DISABLED */}
        {connectionType === 'server' && printerConfig?.enabled && (
          <div style={{
            background: "rgba(158, 158, 158, 0.1)",
            border: "2px solid rgba(158, 158, 158, 0.4)",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
            opacity: 0.7,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <strong style={{ fontSize: "0.95rem", color: "var(--text)" }}>
                🔍 Auto-Detect Label Profile (Disabled)
              </strong>
              <button
                disabled={true}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "not-allowed",
                  fontSize: "0.9rem",
                }}
              >
                Disabled
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 0.75rem 0" }}>
              RFID label detection temporarily disabled. Using fixed model specs (384×240px for B1).
            </p>

            {/* Detection Error */}
            {detectionError && (
              <div style={{
                background: "#ffebee",
                border: "1px solid #ef5350",
                borderRadius: "4px",
                padding: "0.75rem",
                marginBottom: "0.75rem",
                color: "#c62828",
                fontSize: "0.9rem",
              }}>
                ⚠️ {detectionError}
              </div>
            )}

            {/* Detected Profile Display */}
            {detectedProfile && !manualOverride && (
              <div style={{
                background: "rgba(76, 175, 80, 0.2)",
                border: "1px solid rgba(76, 175, 80, 0.8)",
                borderRadius: "4px",
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                  <strong style={{ color: "#2e7d32", marginRight: "0.5rem" }}>✓ Detected:</strong>
                  <span style={{ fontSize: "0.95rem" }}>{detectedProfile.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Confidence: {Math.round(detectionConfidence * 100)}%
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {detectedProfile.width_mm}×{detectedProfile.height_mm}mm @ {detectedProfile.dpi} DPI
                </div>
              </div>
            )}

            {/* Override Warning */}
            {detectedProfile && !overrideWarningDismissed && manualOverride === false && (
              <button
                onClick={handleToggleOverride}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  background: "transparent",
                  border: "1px dashed rgba(76, 175, 80, 0.6)",
                  color: "var(--text-secondary)",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  marginBottom: "0.75rem",
                }}
              >
                Override detected profile (advanced users only)
              </button>
            )}

            {/* Override Confirmation Dialog */}
            {overrideWarningDismissed && manualOverride === false && (
              <div style={{
                background: "#fff3e0",
                border: "2px solid #ff9800",
                borderRadius: "4px",
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}>
                <strong style={{ color: "#e65100", display: "block", marginBottom: "0.5rem" }}>
                  ⚠️ Warning: Manual Override
                </strong>
                <p style={{ fontSize: "0.85rem", color: "#bf360c", margin: "0.5rem 0" }}>
                  Manual override may result in misaligned or missing content on your labels. Only use if you know what you're doing.
                </p>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button
                    onClick={handleToggleOverride}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: "#ff9800",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    I understand, enable override
                  </button>
                  <button
                    onClick={() => {
                      setOverrideWarningDismissed(false);
                      setManualOverride(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      background: "transparent",
                      color: "#ff9800",
                      border: "1px solid #ff9800",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Override Active Indicator */}
            {manualOverride && detectedProfile && (
              <div style={{
                background: "#ffebee",
                border: "1px dashed #f44336",
                borderRadius: "4px",
                padding: "0.75rem",
                marginBottom: "0.75rem",
              }}>
                <strong style={{ color: "#c62828", display: "block", marginBottom: "0.5rem" }}>
                  🚨 Profile Override Active
                </strong>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                  <div>Detected: <strong>{detectedProfile.name}</strong></div>
                  <div>Selected: <strong id="selected-model-display">{selectedPrinterModel}</strong></div>
                </div>
                <div style={{
                  background: "white",
                  border: "1px solid #ffcccc",
                  borderRadius: "4px",
                  padding: "0.5rem",
                }}>
                  <label htmlFor="overrideModel" style={{ fontSize: "0.85rem", fontWeight: "bold", display: "block", marginBottom: "0.35rem" }}>
                    Select Override Profile:
                  </label>
                  <select
                    id="overrideModel"
                    value={selectedPrinterModel}
                    onChange={(e) => setSelectedPrinterModel(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.4rem",
                      fontSize: "0.85rem",
                      borderRadius: "3px",
                      border: "1px solid #ddd",
                    }}
                  >
                    {NIIMBOT_MODELS.map((model) => (
                      <option key={model.model} value={model.model}>
                        {model.label} - {model.dpi} DPI
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Options */}
        <div className="qr-options">
          <div className="form-row">
            <div className="form-group">
              <label>Label Size</label>
              <div style={{ padding: "0.5rem", backgroundColor: "var(--bg-secondary)", borderRadius: "4px" }}>
                {(connectionType === 'bluetooth' || connectionType === 'usb') ? (
                  <>
                    {currentModelSpec.label} ({currentModelSpec.printheadPixels}px width @ {currentModelSpec.dpi} DPI)
                  </>
                ) : (
                  <>12x40mm (standard label)</>
                )}
              </div>
              <span className="help-text">
                {(connectionType === 'bluetooth' || connectionType === 'usb')
                  ? "Label dimensions based on selected printer model"
                  : "Server/system printing uses configured label size"}
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
                  {CONNECTION_OPTIONS.map((opt) => {
                      const isDisabled =
                        (opt.value === 'bluetooth' && !browserCapabilities.hasWebBluetooth) ||
                        (opt.value === 'usb' && !browserCapabilities.hasWebSerial);
                      const unavailableText = isDisabled ? ' (Not available in this browser)' : '';
                      return (
                        <option key={opt.value} value={opt.value} disabled={isDisabled}>
                            {opt.icon} {opt.label}{unavailableText}
                        </option>
                      );
                  })}
               </select>
               {!browserCapabilities.hasWebBluetooth && !browserCapabilities.hasWebSerial && (
                 <span className="help-text" style={{ color: "#ff9800" }}>
                   USB/Bluetooth not supported in this browser. Use Chrome, Edge, or Opera for direct printing.
                 </span>
               )}
               {(browserCapabilities.hasWebBluetooth || browserCapabilities.hasWebSerial) && (
                 <span className="help-text">
                   Choose how your printer is connected
                 </span>
               )}
            </div>

            {/* System Printer Selection */}
            {connectionType === 'system' && (
              <div className="form-group">
                <label htmlFor="systemPrinter">System Printer</label>
                {loadingSystemPrinters ? (
                  <div style={{ padding: "0.5rem", color: "var(--muted)" }}>
                    Loading printers...
                  </div>
                ) : systemPrinters.length === 0 ? (
                  <div style={{ padding: "0.5rem", color: "#f44336" }}>
                    No printers available. Ensure CUPS is running.
                  </div>
                ) : (
                  <select
                    id="systemPrinter"
                    value={selectedSystemPrinter}
                    onChange={(e) => setSelectedSystemPrinter(e.target.value)}
                  >
                    {systemPrinters.map((printer) => (
                      <option key={printer.name} value={printer.name}>
                        {printer.info || printer.name}
                        {printer.is_default ? " (Default)" : ""}
                      </option>
                    ))}
                  </select>
                )}
                <span className="help-text">
                  Select a printer from the server's CUPS configuration
                </span>
              </div>
            )}

            {/* NIIMBOT Model Selection for Direct Printing */}
            {(connectionType === 'bluetooth' || connectionType === 'usb') && (
              <div className="form-group">
                <label htmlFor="printerModel">Printer Model</label>
                <select
                  id="printerModel"
                  value={selectedPrinterModel}
                  onChange={(e) => setSelectedPrinterModel(e.target.value)}
                >
                  {NIIMBOT_MODELS.map((model) => (
                    <option key={model.model} value={model.model}>
                      {model.label} - {model.dpi} DPI
                    </option>
                  ))}
                </select>
                <span className="help-text">
                  Select your NIIMBOT printer model for correct label sizing
                </span>
              </div>
            )}

            {!isItemMode && items.length > 0 && selectedSize !== "2x1" && (
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
                  {getLabelName()}
                  {!isItemMode && location?.is_container && (
                    <span className="container-badge">BOX</span>
                  )}
                </div>
                {getLabelSubtitle() && (
                  <div className="location-type">
                    {getLabelSubtitle()}
                  </div>
                )}
                {!isItemMode && printMode !== "qr_only" && displayItems.length > 0 && (
                  <div className="items-list">
                    <div className="items-list-title">
                      Contents ({items.length} item{items.length !== 1 ? "s" : ""}):
                    </div>
                    {displayItems.map((displayItem) => (
                      <div key={displayItem.id} className="item-entry">
                        • {displayItem.name}
                        {displayItem.brand && ` (${displayItem.brand})`}
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
          <h4>Quick Tips</h4>
          <ul>
            {connectionType === 'bluetooth' && (
              <>
                <li>📱 <strong>Bluetooth</strong>: Works on mobile and laptop - select your model above</li>
                <li>Supported browsers: Chrome, Edge, Opera (not Firefox/Safari)</li>
                <li>Your printer will appear in the Bluetooth picker (e.g., "D101_XXXX")</li>
              </>
            )}
            {connectionType === 'usb' && (
              <>
                <li>🔌 <strong>USB</strong>: Connect printer directly to your computer</li>
                <li>Supported browsers: Chrome, Edge, Opera on desktop only</li>
              </>
            )}
            {connectionType === 'server' && (
              <>
                <li>🖨️ <strong>Server NIIMBOT</strong>: NIIMBOT printer connected to NesVentory server</li>
                <li>Requires configuration in User Settings → Printer tab</li>
                {isItemMode && <li style={{ color: "#ff9800" }}>Note: Item printing via server coming soon - use Bluetooth for now</li>}
              </>
            )}
            {connectionType === 'system' && (
              <>
                <li>🖥️ <strong>System Printer</strong>: Print to any CUPS-configured printer</li>
                <li>Requires CUPS running on the server with socket mounted in Docker</li>
                <li>Works with standard label printers, inkjets, and laser printers</li>
              </>
            )}
            {(connectionType === 'bluetooth' || connectionType === 'usb') && (
              <li>Selected: <strong>{currentModelSpec.label}</strong> ({currentModelSpec.printheadPixels}px @ {currentModelSpec.dpi} DPI)</li>
            )}
            <li>QR code links to: {isItemMode ? "Item details page" : "Location page"}</li>
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
               disabled={isPrinting || isItemMode}
               style={{ marginLeft: "0.5rem" }}
               title={isItemMode ? "Server printing not yet supported for items - use USB or Bluetooth" : "Print to printer connected to server"}
             >
               {isPrinting ? "⏳ Printing..." : "🖨️ Send to NIIMBOT"}
             </button>
          ) : connectionType === 'system' ? (
            <button
              className="btn-success"
              onClick={handleSystemPrint}
              disabled={isPrinting || !selectedSystemPrinter || systemPrintersAvailable === false}
              style={{ marginLeft: "0.5rem", backgroundColor: "#673ab7" }}
              title="Print to system printer via CUPS"
            >
              {isPrinting ? "⏳ Printing..." : "🖥️ Print to System"}
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
