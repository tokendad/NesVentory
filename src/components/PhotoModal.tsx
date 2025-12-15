import React, { useState, useEffect } from "react";
import type { Photo, Item } from "../lib/api";
import { getApiBaseUrl, updatePhoto, PhotoUpdate } from "../lib/api";
import { formatPhotoType } from "../lib/utils";

interface PhotoModalProps {
  photo: Photo;
  allItems: Item[];
  onClose: () => void;
  onPhotoUpdated: () => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  photo,
  allItems,
  onClose,
  onPhotoUpdated,
}) => {
  const [isPrimary, setIsPrimary] = useState(photo.is_primary);
  const [isDataTag, setIsDataTag] = useState(photo.is_data_tag);
  const [photoType, setPhotoType] = useState(photo.photo_type || "");
  const [selectedItemId, setSelectedItemId] = useState(photo.item_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Check if any changes have been made
  useEffect(() => {
    const changed =
      isPrimary !== photo.is_primary ||
      isDataTag !== photo.is_data_tag ||
      photoType !== (photo.photo_type || "") ||
      selectedItemId !== photo.item_id;
    setHasChanges(changed);
  }, [isPrimary, isDataTag, photoType, selectedItemId, photo]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updates: PhotoUpdate = {};

      if (isPrimary !== photo.is_primary) {
        updates.is_primary = isPrimary;
      }
      if (isDataTag !== photo.is_data_tag) {
        updates.is_data_tag = isDataTag;
      }
      if (photoType !== (photo.photo_type || "")) {
        updates.photo_type = photoType === "" ? null : photoType;
      }
      if (selectedItemId !== photo.item_id) {
        updates.item_id = selectedItemId;
      }

      await updatePhoto(photo.item_id, photo.id, updates);
      onPhotoUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update photo");
    } finally {
      setSaving(false);
    }
  };

  // Get filename from path
  const getFilename = (path: string): string => {
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content photo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Photo Details</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="photo-modal-body">
          {/* Full-size image */}
          <div className="photo-preview">
            <img
              src={`${getApiBaseUrl()}${photo.path}`}
              alt="Full size preview"
              className="photo-full-size"
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          {/* Photo metadata and editing */}
          <div className="photo-details-form">
            <div className="form-section">
              <h3>Photo Information</h3>
              
              <div className="form-field">
                <label className="form-label">Filename:</label>
                <div className="form-value readonly">{getFilename(photo.path)}</div>
              </div>

              <div className="form-field">
                <label className="form-label">Uploaded:</label>
                <div className="form-value readonly">
                  {new Date(photo.uploaded_at).toLocaleString()}
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">MIME Type:</label>
                <div className="form-value readonly">{photo.mime_type || "Unknown"}</div>
              </div>
            </div>

            <div className="form-section">
              <h3>Edit Photo Details</h3>

              <div className="form-field">
                <label className="form-label">Associated Item:</label>
                <select
                  className="form-input"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                >
                  {allItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Photo Type:</label>
                <select
                  className="form-input"
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value)}
                >
                  <option value="">Default</option>
                  <option value="receipt">Receipt</option>
                  <option value="warranty">Warranty</option>
                  <option value="optional">Optional</option>
                  <option value="profile">Profile</option>
                </select>
              </div>

              <div className="form-field checkbox-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                  />
                  <span>Primary Photo</span>
                </label>
              </div>

              <div className="form-field checkbox-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isDataTag}
                    onChange={(e) => setIsDataTag(e.target.checked)}
                  />
                  <span>Data Tag Photo</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoModal;
