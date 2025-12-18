import React, { useState } from "react";
import type { EnrichedItemData, Item } from "../lib/api";
import { updateItem } from "../lib/api";
import { formatCurrency } from "../lib/utils";

interface EnrichmentModalProps {
  item: Item;
  enrichmentData: EnrichedItemData[];
  onClose: () => void;
  onItemUpdated: () => void;
}

const EnrichmentModal: React.FC<EnrichmentModalProps> = ({
  item,
  enrichmentData,
  onClose,
  onItemUpdated,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentData = enrichmentData[selectedIndex];
  const hasMore = selectedIndex < enrichmentData.length - 1;

  const handleAccept = async () => {
    if (!currentData) return;

    setAccepting(true);
    setError(null);

    try {
      const updates: any = {};

      // Only update fields that have new data
      // Note: We only fill empty fields to avoid overwriting user-provided data
      if (currentData.description && !item.description) {
        updates.description = currentData.description;
      }
      if (currentData.brand && !item.brand) {
        updates.brand = currentData.brand;
      }
      if (currentData.model_number && !item.model_number) {
        updates.model_number = currentData.model_number;
      }
      if (currentData.serial_number && !item.serial_number) {
        updates.serial_number = currentData.serial_number;
      }
      // For estimated value, only update if no value exists or if no user-supplied value exists
      if (currentData.estimated_value !== undefined && currentData.estimated_value !== null) {
        // Only update if there's no existing value or if existing value is from AI (can be replaced)
        if (!item.estimated_value || (item.estimated_value && !item.estimated_value_user_date)) {
          updates.estimated_value = currentData.estimated_value;
          updates.estimated_value_ai_date = currentData.estimated_value_ai_date;
        }
      }

      if (Object.keys(updates).length === 0) {
        setError("No new data to apply. All suggested fields already have values.");
        setAccepting(false);
        return;
      }

      await updateItem(item.id.toString(), updates);
      onItemUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update item");
      setAccepting(false);
    }
  };

  const handleReject = () => {
    if (hasMore) {
      // Show next suggestion
      setSelectedIndex(selectedIndex + 1);
    } else {
      // No more suggestions, close modal
      onClose();
    }
  };

  const getConfidenceColor = (confidence?: number | null): string => {
    if (!confidence) return "#888";
    if (confidence >= 0.8) return "#4caf50"; // Green
    if (confidence >= 0.6) return "#ff9800"; // Orange
    return "#f44336"; // Red
  };

  const getConfidenceLabel = (confidence?: number | null): string => {
    if (!confidence) return "Unknown";
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  if (!currentData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <section className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>No Enrichment Data</h2>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <p>No enrichment suggestions available for this item.</p>
          <div className="modal-actions">
            <button className="btn-outline" onClick={onClose}>
              Close
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Enrich Item Data</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <strong>Source:</strong>
            <span>{currentData.source}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <strong>Confidence:</strong>
            <span
              style={{
                color: getConfidenceColor(currentData.confidence),
                fontWeight: "bold",
              }}
            >
              {getConfidenceLabel(currentData.confidence)}
              {currentData.confidence !== null && currentData.confidence !== undefined
                ? ` (${(currentData.confidence * 100).toFixed(0)}%)`
                : ""}
            </span>
          </div>
          {enrichmentData.length > 1 && (
            <div style={{ marginTop: "0.5rem", color: "#666" }}>
              Suggestion {selectedIndex + 1} of {enrichmentData.length}
            </div>
          )}
        </div>

        <div className="details-section">
          <h3>Suggested Enrichments</h3>
          {/* Show note about which fields will be updated */}
          <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem", padding: "0.5rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            ℹ️ Only empty fields will be filled. Existing values will not be overwritten.
          </div>
          <div className="details-grid">
            {currentData.description && (
              <div className="detail-item full-width">
                <span className="detail-label">Description:</span>
                <span className="detail-value" style={{ 
                  color: item.description ? "#999" : "inherit",
                  fontStyle: item.description ? "italic" : "normal"
                }}>
                  {currentData.description}
                  {item.description && " (will not be applied - field already has value)"}
                </span>
                {item.description && (
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                    Current: {item.description}
                  </div>
                )}
              </div>
            )}
            {currentData.brand && (
              <div className="detail-item">
                <span className="detail-label">Brand:</span>
                <span className="detail-value" style={{ 
                  color: item.brand ? "#999" : "inherit",
                  fontStyle: item.brand ? "italic" : "normal"
                }}>
                  {currentData.brand}
                  {item.brand && " (will not be applied)"}
                </span>
                {item.brand && (
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                    Current: {item.brand}
                  </div>
                )}
              </div>
            )}
            {currentData.model_number && (
              <div className="detail-item">
                <span className="detail-label">Model Number:</span>
                <span className="detail-value" style={{ 
                  color: item.model_number ? "#999" : "inherit",
                  fontStyle: item.model_number ? "italic" : "normal"
                }}>
                  {currentData.model_number}
                  {item.model_number && " (will not be applied)"}
                </span>
                {item.model_number && (
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                    Current: {item.model_number}
                  </div>
                )}
              </div>
            )}
            {currentData.serial_number && (
              <div className="detail-item">
                <span className="detail-label">Serial Number:</span>
                <span className="detail-value" style={{ 
                  color: item.serial_number ? "#999" : "inherit",
                  fontStyle: item.serial_number ? "italic" : "normal"
                }}>
                  {currentData.serial_number}
                  {item.serial_number && " (will not be applied)"}
                </span>
                {item.serial_number && (
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                    Current: {item.serial_number}
                  </div>
                )}
              </div>
            )}
            {currentData.estimated_value !== undefined && currentData.estimated_value !== null && (
              <div className="detail-item">
                <span className="detail-label">Estimated Value:</span>
                <span className="detail-value" style={{ 
                  color: (item.estimated_value && item.estimated_value_user_date) ? "#999" : "inherit",
                  fontStyle: (item.estimated_value && item.estimated_value_user_date) ? "italic" : "normal"
                }}>
                  {formatCurrency(Number(currentData.estimated_value))}
                  {item.estimated_value && item.estimated_value_user_date && " (will not be applied - user value)"}
                </span>
                {item.estimated_value && (
                  <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                    Current: {formatCurrency(Number(item.estimated_value))}
                    {item.estimated_value_user_date && " (user-supplied)"}
                    {item.estimated_value_ai_date && !item.estimated_value_user_date && " (AI-estimated, can be replaced)"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn-outline"
            onClick={handleReject}
            disabled={accepting}
          >
            {hasMore ? "Show Next Suggestion" : "Close"}
          </button>
          <button
            className="btn-primary"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? "Accepting..." : "Accept & Apply"}
          </button>
        </div>
      </section>
    </div>
  );
};

export default EnrichmentModal;
