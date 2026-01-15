import React, { useState } from "react";
import type { Location, LocationCreate, Item } from "../lib/api";
import { updateLocation } from "../lib/api";
import InsuranceTab from "./InsuranceTab";

interface LocationDetailsModalProps {
  location: Location;
  items: Item[];
  allLocations: Location[];
  onClose: () => void;
  onUpdate: () => void;
}

type TabType = "details" | "insurance";

const LOCATION_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "retail", label: "Retail" },
  { value: "industrial", label: "Industrial" },
  { value: "apartment_complex", label: "Apartment Complex" },
  { value: "condo", label: "Condo" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "other", label: "Other" },
];

const LOCATION_CATEGORIES = [
  "Primary",
  "Out-building",
  "Room",
  "Floor",
  "Exterior",
  "Garage",
  "Shed",
  "Container"
];

const LocationDetailsModal: React.FC<LocationDetailsModalProps> = ({
  location,
  items,
  allLocations,
  onClose,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Derive initial category from flags if not set
  const initialCategory = location.location_category || 
    (location.is_primary_location ? "Primary" : 
     location.is_container ? "Container" : 
     "Room"); // Default to Room if neither

  // Form state for details tab
  const [formData, setFormData] = useState<LocationCreate>({
    name: location.name,
    parent_id: location.parent_id?.toString() || null,
    is_primary_location: location.is_primary_location || false,
    is_container: location.is_container || false,
    location_category: initialCategory,
    friendly_name: location.friendly_name || null,
    description: location.description || null,
    address: location.address || null,
    location_type: location.location_type || null,
    owner_info: location.owner_info || null,
    landlord_info: location.landlord_info || null,
    tenant_info: location.tenant_info || null,
    insurance_info: location.insurance_info || null,
    estimated_property_value: location.estimated_property_value || null,
    estimated_value_with_items: location.estimated_value_with_items || null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (name === "location_category") {
      const category = value;
      let isPrimary = false;
      let isContainer = false;
      
      if (category === "Primary") {
        isPrimary = true;
      } else if (category === "Container") {
        isContainer = true;
      }
      
      setFormData(prev => ({
        ...prev,
        location_category: category,
        is_primary_location: isPrimary,
        is_container: isContainer,
        // Reset address if not primary
        address: isPrimary ? prev.address : null,
        // Reset location type if not primary
        location_type: isPrimary ? prev.location_type : null
      }));
      return;
    }

    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "parent_id"
          ? value === "" ? null : value
          : name === "location_type"
          ? value === "" ? null : value
          : name === "estimated_property_value" || name === "estimated_value_with_items"
          ? value === "" ? null : parseFloat(value)
          : value === "" ? null : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      await updateLocation(location.id.toString(), formData);
      onUpdate();
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Failed to save location");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "900px", width: "90%" }}
      >
        <div className="modal-header">
          <h2>{location.friendly_name || location.name}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs - Only show Insurance tab for primary locations */}
        {formData.is_primary_location && (
          <div className="settings-tabs" style={{ marginBottom: "1rem" }}>
            <button
              className={`settings-tab ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              📝 Details
            </button>
            <button
              className={`settings-tab ${activeTab === "insurance" ? "active" : ""}`}
              onClick={() => setActiveTab("insurance")}
            >
              🏠 Insurance
            </button>
          </div>
        )}

        {formError && <div className="error-banner">{formError}</div>}

        {/* Details Tab */}
        {activeTab === "details" && (
          <form onSubmit={handleSubmit} className="item-form">
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={formLoading}
                placeholder="e.g., Living Room, Main House, Unit 101"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="friendly_name">Friendly Name</label>
                <input
                  type="text"
                  id="friendly_name"
                  name="friendly_name"
                  value={formData.friendly_name || ""}
                  onChange={handleChange}
                  disabled={formLoading}
                  placeholder="e.g., Our Home, Beach House"
                />
              </div>

              <div className="form-group">
                <label htmlFor="location_category">Location Category</label>
                <select
                  id="location_category"
                  name="location_category"
                  value={formData.location_category || ""}
                  onChange={handleChange}
                  disabled={formLoading}
                >
                  <option value="">-- Select Category --</option>
                  {LOCATION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditionally show Location Type and Address only for Primary Location */}
            {formData.location_category === "Primary" && (
              <>
                <div className="form-group">
                  <label htmlFor="location_type">Location Type</label>
                  <select
                    id="location_type"
                    name="location_type"
                    value={formData.location_type || ""}
                    onChange={handleChange}
                    disabled={formLoading}
                  >
                    <option value="">-- Select Type --</option>
                    {LOCATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address || ""}
                    onChange={handleChange}
                    disabled={formLoading}
                    placeholder="Full street address"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                rows={3}
                disabled={formLoading}
                placeholder="Description of the location"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="estimated_property_value">Estimated Property Value</label>
                <input
                  type="number"
                  id="estimated_property_value"
                  name="estimated_property_value"
                  value={formData.estimated_property_value ?? ""}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  disabled={formLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="estimated_value_with_items">Value with Items</label>
                <input
                  type="number"
                  id="estimated_value_with_items"
                  name="estimated_value_with_items"
                  value={formData.estimated_value_with_items ?? ""}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={onClose}
                disabled={formLoading}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={formLoading}>
                {formLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Insurance Tab - Only for primary locations */}
        {activeTab === "insurance" && location.is_primary_location && (
          <div style={{ maxHeight: "70vh", overflowY: "auto", padding: "0.5rem" }}>
            <InsuranceTab location={location} items={items} allLocations={allLocations} onUpdate={onUpdate} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationDetailsModal;
