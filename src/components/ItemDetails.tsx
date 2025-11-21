import React, { useState } from "react";
import type { Item, Location } from "../lib/api";

interface ItemDetailsProps {
  item: Item;
  locations: Location[];
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

const ItemDetails: React.FC<ItemDetailsProps> = ({
  item,
  locations,
  onEdit,
  onDelete,
  onClose,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const location = locations.find(
    (loc) => loc.id.toString() === item.location_id?.toString()
  );

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete item");
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item.name}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        {deleteError && <div className="error-banner">{deleteError}</div>}
        
        <div className="item-details">
          <div className="details-section">
            <h3>Basic Information</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{item.name}</span>
              </div>
              {item.description && (
                <div className="detail-item full-width">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{item.description}</span>
                </div>
              )}
              {item.brand && (
                <div className="detail-item">
                  <span className="detail-label">Brand:</span>
                  <span className="detail-value">{item.brand}</span>
                </div>
              )}
              {item.model_number && (
                <div className="detail-item">
                  <span className="detail-label">Model Number:</span>
                  <span className="detail-value">{item.model_number}</span>
                </div>
              )}
              {item.serial_number && (
                <div className="detail-item">
                  <span className="detail-label">Serial Number:</span>
                  <span className="detail-value">{item.serial_number}</span>
                </div>
              )}
              {item.upc && (
                <div className="detail-item">
                  <span className="detail-label">UPC:</span>
                  <span className="detail-value">{item.upc}</span>
                </div>
              )}
            </div>
          </div>

          <div className="details-section">
            <h3>Purchase Information</h3>
            <div className="details-grid">
              {item.purchase_date && (
                <div className="detail-item">
                  <span className="detail-label">Purchase Date:</span>
                  <span className="detail-value">{item.purchase_date}</span>
                </div>
              )}
              {item.retailer && (
                <div className="detail-item">
                  <span className="detail-label">Retailer:</span>
                  <span className="detail-value">{item.retailer}</span>
                </div>
              )}
              {item.purchase_price != null && !isNaN(Number(item.purchase_price)) && (
                <div className="detail-item">
                  <span className="detail-label">Purchase Price:</span>
                  <span className="detail-value">${Number(item.purchase_price).toFixed(2)}</span>
                </div>
              )}
              {item.estimated_value != null && !isNaN(Number(item.estimated_value)) && (
                <div className="detail-item">
                  <span className="detail-label">Estimated Value:</span>
                  <span className="detail-value">${Number(item.estimated_value).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="details-section">
            <h3>Location</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Location:</span>
                <span className="detail-value">{location?.name || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.75rem" }}>
            <button className="btn-outline" onClick={onClose}>
              Close
            </button>
            <button className="btn-primary" onClick={onEdit}>
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;
