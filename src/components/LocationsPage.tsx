import React, { useState, useMemo } from "react";
import type { Location, LocationCreate } from "../lib/api";
import { createLocation, updateLocation, deleteLocation } from "../lib/api";

interface LocationsPageProps {
  locations: Location[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

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

const LocationsPage: React.FC<LocationsPageProps> = ({
  locations,
  loading,
  error,
  onRefresh,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState<LocationCreate>({
    name: "",
    parent_id: null,
    is_primary_location: false,
    friendly_name: null,
    description: null,
    address: null,
    location_type: null,
    owner_info: null,
    landlord_info: null,
    tenant_info: null,
    insurance_info: null,
    estimated_property_value: null,
    estimated_value_with_items: null,
  });

  // Get primary locations (for parent selection)
  const primaryLocations = useMemo(() => {
    return locations.filter(loc => loc.is_primary_location || !loc.parent_id);
  }, [locations]);

  // Filter locations by search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) {
      return locations;
    }
    const query = searchQuery.toLowerCase().trim();
    return locations.filter((loc) => {
      const searchableFields = [
        loc.name,
        loc.friendly_name,
        loc.description,
        loc.address,
        loc.location_type,
      ];
      return searchableFields.some(
        (field) => field && field.toLowerCase().includes(query)
      );
    });
  }, [locations, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: "",
      parent_id: null,
      is_primary_location: false,
      friendly_name: null,
      description: null,
      address: null,
      location_type: null,
      owner_info: null,
      landlord_info: null,
      tenant_info: null,
      insurance_info: null,
      estimated_property_value: null,
      estimated_value_with_items: null,
    });
    setFormError(null);
    setEditingLocation(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleOpenEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      parent_id: location.parent_id?.toString() || null,
      is_primary_location: location.is_primary_location || false,
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
    setFormError(null);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    resetForm();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
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
      if (editingLocation) {
        await updateLocation(editingLocation.id.toString(), formData);
      } else {
        await createLocation(formData);
      }
      handleClose();
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Failed to save location");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    setFormLoading(true);
    try {
      await deleteLocation(locationId);
      setDeleteConfirm(null);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Failed to delete location");
    } finally {
      setFormLoading(false);
    }
  };

  const getLocationTypeLabel = (type: string | null | undefined): string => {
    if (!type) return "—";
    const found = LOCATION_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getParentName = (parentId: string | number | null | undefined): string => {
    if (!parentId) return "—";
    const parent = locations.find(loc => loc.id.toString() === parentId.toString());
    return parent ? (parent.friendly_name || parent.name) : "—";
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Locations</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn-outline" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn-primary" onClick={handleOpenCreate}>
            Add Location
          </button>
        </div>
      </div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search locations by name, description, address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => setSearchQuery("")}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {formError && !showForm && <div className="error-banner">{formError}</div>}
      <div className="table-wrapper">
        <table className="items-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Friendly Name</th>
              <th>Type</th>
              <th>Parent</th>
              <th>Primary</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="empty-row">
                  No locations found. Click "Add Location" to create your first location.
                </td>
              </tr>
            )}
            {locations.length > 0 && filteredLocations.length === 0 && searchQuery.trim() && !loading && (
              <tr>
                <td colSpan={7} className="empty-row">
                  No locations match your search.
                </td>
              </tr>
            )}
            {filteredLocations.map((loc) => (
              <tr key={loc.id}>
                <td>{loc.name}</td>
                <td>{loc.friendly_name || "—"}</td>
                <td>{getLocationTypeLabel(loc.location_type)}</td>
                <td>{getParentName(loc.parent_id)}</td>
                <td>
                  {loc.is_primary_location ? (
                    <span style={{ 
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      backgroundColor: "#4ecdc4",
                      color: "#fff",
                      fontSize: "0.75rem",
                      fontWeight: "500"
                    }}>
                      HOME
                    </span>
                  ) : "—"}
                </td>
                <td>{loc.address || "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="btn-outline"
                      onClick={() => handleOpenEdit(loc)}
                      style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                    >
                      Edit
                    </button>
                    {deleteConfirm === loc.id.toString() ? (
                      <>
                        <button
                          className="btn-danger"
                          onClick={() => handleDelete(loc.id.toString())}
                          disabled={formLoading}
                          style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn-outline"
                          onClick={() => setDeleteConfirm(null)}
                          style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn-outline"
                        onClick={() => setDeleteConfirm(loc.id.toString())}
                        style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem", color: "#dc3545" }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Location Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingLocation ? "Edit Location" : "Add New Location"}</h2>
              <button className="modal-close" onClick={handleClose}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="item-form">
              {formError && <div className="error-banner">{formError}</div>}

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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="parent_id">Parent Location</label>
                  <select
                    id="parent_id"
                    name="parent_id"
                    value={formData.parent_id?.toString() || ""}
                    onChange={handleChange}
                    disabled={formLoading}
                  >
                    <option value="">-- No Parent (Top Level) --</option>
                    {primaryLocations
                      .filter(loc => !editingLocation || loc.id.toString() !== editingLocation.id.toString())
                      .map((loc) => (
                        <option key={loc.id} value={loc.id.toString()}>
                          {loc.friendly_name || loc.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="checkbox-label" style={{ marginTop: "1.5rem" }}>
                    <input
                      type="checkbox"
                      name="is_primary_location"
                      checked={formData.is_primary_location || false}
                      onChange={handleChange}
                      disabled={formLoading}
                    />
                    <span>Primary Location (Home)</span>
                  </label>
                </div>
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
                  onClick={handleClose}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={formLoading}>
                  {formLoading ? "Saving..." : editingLocation ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default LocationsPage;
