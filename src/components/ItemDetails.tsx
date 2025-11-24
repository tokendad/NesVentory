import React, { useState } from "react";
import type { Item, Location } from "../lib/api";
import { getApiBaseUrl } from "../lib/api";
import { formatPhotoType, formatCurrency, formatDate, formatDateTime } from "../lib/utils";

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
    <section className="panel item-details-panel">
      <div className="panel-header">
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
                  <span className="detail-value">{formatDate(item.purchase_date)}</span>
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
                  <span className="detail-value">{formatCurrency(Number(item.purchase_price))}</span>
                </div>
              )}
              {item.estimated_value != null && !isNaN(Number(item.estimated_value)) && (
                <div className="detail-item">
                  <span className="detail-label">Estimated Value:</span>
                  <span className="detail-value">{formatCurrency(Number(item.estimated_value))}</span>
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

          {item.tags && item.tags.length > 0 && (
            <div className="details-section">
              <h3>Tags</h3>
              <div className="item-tags">
                {item.tags.map(tag => (
                  <span key={tag.id} className={`tag-badge ${tag.is_predefined ? 'predefined' : ''}`}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.warranties && item.warranties.length > 0 && (
            <div className="details-section">
              <h3>Warranty Information</h3>
              {item.warranties.map((warranty, index) => (
                <div key={index} className="warranty-item">
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{warranty.type}</span>
                    </div>
                    {warranty.provider && (
                      <div className="detail-item">
                        <span className="detail-label">Provider:</span>
                        <span className="detail-value">{warranty.provider}</span>
                      </div>
                    )}
                    {warranty.policy_number && (
                      <div className="detail-item">
                        <span className="detail-label">Policy Number:</span>
                        <span className="detail-value">{warranty.policy_number}</span>
                      </div>
                    )}
                    {warranty.duration_months && (
                      <div className="detail-item">
                        <span className="detail-label">Duration:</span>
                        <span className="detail-value">{warranty.duration_months} months</span>
                      </div>
                    )}
                    {warranty.expiration_date && (
                      <div className="detail-item">
                        <span className="detail-label">Expiration Date:</span>
                        <span className="detail-value">{formatDate(warranty.expiration_date)}</span>
                      </div>
                    )}
                    {warranty.notes && (
                      <div className="detail-item full-width">
                        <span className="detail-label">Notes:</span>
                        <span className="detail-value">{warranty.notes}</span>
                      </div>
                    )}
                  </div>
                  {index < item.warranties!.length - 1 && <hr className="warranty-separator" />}
                </div>
              ))}
            </div>
          )}

          {item.photos && item.photos.length > 0 && (
            <div className="details-section">
              <h3>Images</h3>
              <div className="photos-grid">
                {item.photos.map((photo) => {
                  let badgeText = formatPhotoType(photo.photo_type);
                  if (photo.is_primary) badgeText = 'Primary';
                  else if (photo.is_data_tag) badgeText = 'Data Tag';
                  
                  return (
                    <div key={photo.id} className="photo-item">
                      <img 
                        src={`${getApiBaseUrl()}${photo.path}`} 
                        alt={`${item.name} - ${badgeText}`}
                        className="item-photo"
                      />
                      <span className="photo-badge">{badgeText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {item.documents && item.documents.length > 0 && (
            <div className="details-section">
              <h3>Attachments</h3>
              <div className="documents-list">
                {item.documents.map((doc) => (
                  <div key={doc.id} className="document-item">
                    <a 
                      href={`${getApiBaseUrl()}${doc.path}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="document-link"
                    >
                      📎 {doc.filename}
                    </a>
                    <span className="document-date">
                      Uploaded: {formatDate(doc.uploaded_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      <div className="panel-actions">
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
    </section>
  );
};

export default ItemDetails;
