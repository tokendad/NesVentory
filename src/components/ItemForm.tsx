import React, { useState, useEffect } from "react";
import type { ItemCreate, Location } from "../lib/api";
import { uploadPhoto } from "../lib/api";
import { formatPhotoType } from "../lib/utils";
import { PHOTO_TYPES, ALLOWED_PHOTO_MIME_TYPES } from "../lib/constants";

interface PhotoUpload {
  file: File;
  preview: string;
  type: string;
}

interface ItemFormProps {
  onSubmit: (item: ItemCreate, photos: PhotoUpload[]) => Promise<void>;
  onCancel: () => void;
  locations: Location[];
  initialData?: Partial<ItemCreate>;
  isEditing?: boolean;
}

const ItemForm: React.FC<ItemFormProps> = ({
  onSubmit,
  onCancel,
  locations,
  initialData,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState<ItemCreate>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    brand: initialData?.brand || "",
    model_number: initialData?.model_number || "",
    serial_number: initialData?.serial_number || "",
    purchase_date: initialData?.purchase_date || "",
    purchase_price: initialData?.purchase_price || undefined,
    estimated_value: initialData?.estimated_value || undefined,
    retailer: initialData?.retailer || "",
    upc: initialData?.upc || "",
    location_id: initialData?.location_id || null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    };
  }, [photos]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "purchase_price" || name === "estimated_value"
          ? value === ""
            ? undefined
            : parseFloat(value)
          : name === "location_id"
          ? value === ""
            ? null
            : value
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(formData, photos);
    } catch (err: any) {
      setError(err.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoUpload[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Validate file type
      if (ALLOWED_PHOTO_MIME_TYPES.includes(file.type)) {
        const preview = URL.createObjectURL(file);
        newPhotos.push({ file, preview, type });
      } else {
        setError(`Invalid file type: ${file.name}. Allowed types: JPEG, PNG, GIF, WebP`);
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? "Edit Item" : "Add New Item"}</h2>
          <button className="modal-close" onClick={onCancel}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="item-form">
          {error && <div className="error-banner">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="brand">Brand</label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="model_number">Model Number</label>
              <input
                type="text"
                id="model_number"
                name="model_number"
                value={formData.model_number || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="serial_number">Serial Number</label>
              <input
                type="text"
                id="serial_number"
                name="serial_number"
                value={formData.serial_number || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="upc">UPC</label>
              <input
                type="text"
                id="upc"
                name="upc"
                value={formData.upc || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="purchase_date">Purchase Date</label>
              <input
                type="date"
                id="purchase_date"
                name="purchase_date"
                value={formData.purchase_date || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="retailer">Retailer</label>
              <input
                type="text"
                id="retailer"
                name="retailer"
                value={formData.retailer || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="purchase_price">Purchase Price</label>
              <input
                type="number"
                id="purchase_price"
                name="purchase_price"
                value={formData.purchase_price ?? ""}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="estimated_value">Estimated Value</label>
              <input
                type="number"
                id="estimated_value"
                name="estimated_value"
                value={formData.estimated_value ?? ""}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location_id">Location</label>
            <select
              id="location_id"
              name="location_id"
              value={formData.location_id?.toString() || ""}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="">-- No Location --</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id.toString()}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <h3>Photos</h3>
            
            <div className="photo-upload-section">
              <div className="photo-type-upload">
                <label htmlFor="photo-default">Default/Primary Photo</label>
                <input
                  type="file"
                  id="photo-default"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.DEFAULT)}
                  disabled={loading}
                />
                <span className="help-text">Primary photo for the item</span>
              </div>

              <div className="photo-type-upload">
                <label htmlFor="photo-data-tag">Data Tag</label>
                <input
                  type="file"
                  id="photo-data-tag"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.DATA_TAG)}
                  disabled={loading}
                />
                <span className="help-text">Photo of serial number or data tag</span>
              </div>

              <div className="photo-type-upload">
                <label htmlFor="photo-receipt">Receipt</label>
                <input
                  type="file"
                  id="photo-receipt"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.RECEIPT)}
                  disabled={loading}
                  multiple
                />
                <span className="help-text">Purchase receipt</span>
              </div>

              <div className="photo-type-upload">
                <label htmlFor="photo-warranty">Warranty Information</label>
                <input
                  type="file"
                  id="photo-warranty"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.WARRANTY)}
                  disabled={loading}
                  multiple
                />
                <span className="help-text">Warranty documents or cards</span>
              </div>

              <div className="photo-type-upload">
                <label htmlFor="photo-optional">Additional Photos</label>
                <input
                  type="file"
                  id="photo-optional"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.OPTIONAL)}
                  disabled={loading}
                  multiple
                />
                <span className="help-text">Any additional photos</span>
              </div>
            </div>

            {photos.length > 0 && (
              <div className="photo-previews">
                <h4>Selected Photos ({photos.length})</h4>
                <div className="photo-preview-grid">
                  {photos.map((photo, index) => (
                    <div key={index} className="photo-preview-item">
                      <img src={photo.preview} alt={`Preview ${index + 1}`} />
                      <div className="photo-preview-info">
                        <span className="photo-type-badge">{formatPhotoType(photo.type)}</span>
                        <button
                          type="button"
                          className="remove-photo-btn"
                          onClick={() => removePhoto(index)}
                          disabled={loading}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemForm;
