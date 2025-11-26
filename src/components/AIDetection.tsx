import React, { useState, useRef, useEffect } from "react";
import {
  detectItemsFromImage,
  getAIStatus,
  type DetectedItem,
  type DetectionResult,
  type AIStatusResponse,
  type Location,
  type ItemCreate,
} from "../lib/api";

// Confidence threshold constants for visual display
const HIGH_CONFIDENCE_THRESHOLD = 0.8;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.5;

interface AIDetectionProps {
  onClose: () => void;
  onAddItems: (items: ItemCreate[]) => void;
  locations: Location[];
}

const AIDetection: React.FC<AIDetectionProps> = ({ onClose, onAddItems, locations }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check AI status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await getAIStatus();
        setAIStatus(status);
      } catch {
        setAIStatus({ enabled: false });
      } finally {
        setStatusLoading(false);
      }
    }
    checkStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      if (allowedTypes.includes(file.type)) {
        setImageFile(file);
        setError(null);
        setResult(null);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setError("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
        setImageFile(null);
        setImagePreview(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      setError("Please select an image to analyze");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedItems(new Set());
    
    try {
      const detectionResult = await detectItemsFromImage(imageFile);
      setResult(detectionResult);
      
      // Select all items by default
      if (detectionResult.items.length > 0) {
        setSelectedItems(new Set(detectionResult.items.map((_, idx) => idx)));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze image";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (result && result.items.length > 0) {
      setSelectedItems(new Set(result.items.map((_, idx) => idx)));
    }
  };

  const handleSelectNone = () => {
    setSelectedItems(new Set());
  };

  const handleAddSelectedItems = () => {
    if (!result) return;
    
    const itemsToAdd: ItemCreate[] = [];
    
    result.items.forEach((item, index) => {
      if (selectedItems.has(index)) {
        itemsToAdd.push({
          name: item.name,
          description: item.description || undefined,
          brand: item.brand || undefined,
          estimated_value: item.estimated_value || undefined,
          estimated_value_ai_date: item.estimation_date || undefined,
          location_id: selectedLocationId || undefined,
        });
      }
    });
    
    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
      onClose();
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setSelectedItems(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getConfidenceColor = (confidence: number | null | undefined): string => {
    if (confidence === null || confidence === undefined) return "var(--text-muted)";
    if (confidence >= HIGH_CONFIDENCE_THRESHOLD) return "#4caf50";
    if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) return "#ff9800";
    return "#f44336";
  };

  const formatConfidence = (confidence: number | null | undefined): string => {
    if (confidence === null || confidence === undefined) return "";
    return `${Math.round(confidence * 100)}%`;
  };

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "-";
    return `$${value.toLocaleString()}`;
  };

  // Loading state for AI status check
  if (statusLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📷 AI Photo Detection</h2>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Checking AI availability...</p>
          </div>
        </div>
      </div>
    );
  }

  // AI not configured state
  if (!aiStatus?.enabled) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📷 AI Photo Detection</h2>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div style={{ padding: "2rem" }}>
            <div className="error-banner" style={{ marginBottom: "1rem" }}>
              AI Photo Detection is not configured.
            </div>
            <p style={{ marginBottom: "1rem" }}>
              To use this feature, you need to configure a Google Gemini API key:
            </p>
            <ol style={{ marginLeft: "1.5rem", marginBottom: "1.5rem" }}>
              <li>Get an API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
              <li>Add <code>GEMINI_API_KEY=your-key-here</code> to your .env file</li>
              <li>Restart the application</li>
            </ol>
            <div className="form-actions">
              <button className="btn-primary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📷 AI Photo Detection</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div style={{ padding: "1.5rem" }}>
          {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}
          
          {!result ? (
            <>
              <div className="import-section">
                <h3>Take or Upload a Photo</h3>
                <p className="help-text">
                  Upload a photo of a room or area. The AI will detect household items and help you add them to your inventory.
                </p>
                
                <div className="file-input-wrapper" style={{ marginTop: "1rem" }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    disabled={loading}
                    id="ai-image-input"
                    style={{ display: imagePreview ? "none" : "block" }}
                  />
                  
                  {imagePreview && (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "300px",
                          borderRadius: "8px",
                          display: "block",
                        }}
                      />
                      <button
                        type="button"
                        className="file-clear"
                        onClick={clearImage}
                        disabled={loading}
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "8px",
                          background: "rgba(0,0,0,0.6)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "28px",
                          height: "28px",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="form-actions" style={{ marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAnalyze}
                  disabled={loading || !imageFile}
                >
                  {loading ? "Analyzing..." : "🔍 Detect Items"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="success-banner" style={{ marginBottom: "1rem" }}>
                Detected {result.items.length} item{result.items.length !== 1 ? "s" : ""} in the image
              </div>
              
              {result.items.length > 0 ? (
                <>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleSelectAll}
                      style={{ fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={handleSelectNone}
                      style={{ fontSize: "0.875rem", padding: "0.375rem 0.75rem" }}
                    >
                      Select None
                    </button>
                    
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label htmlFor="location-select" style={{ fontSize: "0.875rem" }}>
                        Add to location:
                      </label>
                      <select
                        id="location-select"
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        style={{ padding: "0.375rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
                      >
                        <option value="">No location</option>
                        {locations.map((loc) => (
                          <option key={loc.id.toString()} value={loc.id.toString()}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="table-wrapper" style={{ maxHeight: "350px", overflowY: "auto" }}>
                    <table className="items-table compact">
                      <thead>
                        <tr>
                          <th style={{ width: "40px" }}></th>
                          <th>Item</th>
                          <th>Brand</th>
                          <th>Est. Value</th>
                          <th style={{ width: "80px" }}>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((item, index) => (
                          <tr
                            key={index}
                            onClick={() => handleItemToggle(index)}
                            style={{
                              cursor: "pointer",
                              backgroundColor: selectedItems.has(index) ? "var(--bg-selected)" : undefined,
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedItems.has(index)}
                                onChange={() => handleItemToggle(index)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 500 }}>{item.name}</div>
                              {item.description && (
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  {item.description}
                                </div>
                              )}
                            </td>
                            <td>{item.brand || "—"}</td>
                            <td>{formatValue(item.estimated_value)}</td>
                            <td>
                              {item.confidence !== null && item.confidence !== undefined && (
                                <span
                                  style={{
                                    color: getConfidenceColor(item.confidence),
                                    fontWeight: 500,
                                  }}
                                >
                                  {formatConfidence(item.confidence)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="form-actions" style={{ marginTop: "1.5rem" }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setResult(null);
                        setSelectedItems(new Set());
                      }}
                    >
                      ← Scan Another
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleAddSelectedItems}
                      disabled={selectedItems.size === 0}
                    >
                      Add {selectedItems.size} Item{selectedItems.size !== 1 ? "s" : ""} to Inventory
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem" }}>
                  <p>No items were detected in this image. Try taking a clearer photo or one with more visible items.</p>
                  <div className="form-actions" style={{ marginTop: "1.5rem", justifyContent: "center" }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setResult(null);
                        clearImage();
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIDetection;
