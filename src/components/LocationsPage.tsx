import React, { useState, useMemo, useCallback, useEffect } from "react";
import type { Location, LocationCreate, Item } from "../lib/api";
import { createLocation, updateLocation, deleteLocation } from "../lib/api";
import QRLabelPrint, { PRINT_MODE_OPTIONS, type PrintMode } from "./QRLabelPrint";
import LocationDetailsModal from "./LocationDetailsModal";
import { getLocationPath } from "../lib/utils";

interface LocationsPageProps {
  locations: Location[];
  items?: Item[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onItemClick?: (item: Item) => void;
  openFormOnMount?: boolean;
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
  items = [],
  loading,
  error,
  onRefresh,
  onItemClick,
  openFormOnMount = false,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Track the selected location path (breadcrumb navigation)
  const [selectedPath, setSelectedPath] = useState<Location[]>([]);
  // QR Label printing
  const [showQRPrint, setShowQRPrint] = useState<Location | null>(null);
  const [printModeFromEdit, setPrintModeFromEdit] = useState<PrintMode>("qr_with_items");

  // Form state
  const [formData, setFormData] = useState<LocationCreate>({
    name: "",
    parent_id: null,
    is_primary_location: false,
    is_container: false,
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

  // Get child locations for a given parent ID
  const getChildLocations = useCallback((parentId: string | number | null): Location[] => {
    if (parentId === null) {
      // Return top-level locations (no parent or primary)
      return locations.filter(loc => loc.is_primary_location || !loc.parent_id);
    }
    return locations.filter(loc => loc.parent_id?.toString() === parentId.toString());
  }, [locations]);

  // Get items for a specific location
  const getItemsAtLocation = useCallback((locationId: string | number): Item[] => {
    return items.filter(item => item.location_id?.toString() === locationId.toString());
  }, [items]);

  // Get the current selected location (last in path)
  const currentLocation = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : null;

  // Get locations to display in the current panel
  const currentPanelLocations = useMemo(() => {
    if (currentLocation === null) {
      return getChildLocations(null);
    }
    return getChildLocations(currentLocation.id);
  }, [getChildLocations, currentLocation]);

  // Get items for the current selected location
  const currentLocationItems = useMemo(() => {
    if (currentLocation === null) {
      return [];
    }
    return getItemsAtLocation(currentLocation.id);
  }, [getItemsAtLocation, currentLocation]);

  // Handler to navigate to a location
  const handleLocationClick = (location: Location) => {
    setSelectedPath([...selectedPath, location]);
  };

  // Handler to navigate back to a specific level in the breadcrumb
  const handleBreadcrumbClick = (index: number) => {
    if (index < 0) {
      setSelectedPath([]);
    } else {
      setSelectedPath(selectedPath.slice(0, index + 1));
    }
  };

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      parent_id: null,
      is_primary_location: false,
      is_container: false,
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
  }, []);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, [resetForm]);

  // Auto-open the form when openFormOnMount is true
  useEffect(() => {
    if (openFormOnMount) {
      handleOpenCreate();
    }
  }, [openFormOnMount, handleOpenCreate]);

  const handleOpenEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      parent_id: location.parent_id?.toString() || null,
      is_primary_location: location.is_primary_location || false,
      is_container: location.is_container || false,
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
    <>
      {/* Location Browser Panel */}
      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="panel-header">
          <h2>Browse Locations</h2>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn-outline" onClick={onRefresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button className="btn-primary" onClick={handleOpenCreate}>
              Add Location
            </button>
          </div>
        </div>
        {error && <div className="error-banner">{error}</div>}
        {formError && !showForm && <div className="error-banner">{formError}</div>}
        
        {/* Breadcrumb navigation */}
        <div className="location-breadcrumb">
          <button
            className={selectedPath.length === 0 ? "breadcrumb-btn active" : "breadcrumb-btn"}
            onClick={() => handleBreadcrumbClick(-1)}
          >
            All Locations
          </button>
          {selectedPath.map((loc, index) => (
            <React.Fragment key={loc.id}>
              <span style={{ color: "var(--muted)" }}>›</span>
              <button
                className={index === selectedPath.length - 1 ? "breadcrumb-btn active" : "breadcrumb-btn"}
                onClick={() => handleBreadcrumbClick(index)}
              >
                {loc.friendly_name || loc.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Location List - Vertical */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          {currentPanelLocations.length === 0 && !loading && (
            <div style={{ 
              textAlign: "center", 
              padding: "2rem",
              color: "var(--muted)",
              fontStyle: "italic"
            }}>
              {currentLocation 
                ? "No sub-locations in this location."
                : "No locations found. Click 'Add Location' below to create your first location."}
            </div>
          )}
          {currentPanelLocations.map((loc) => {
            const childCount = getChildLocations(loc.id).length;
            const itemCount = getItemsAtLocation(loc.id).length;
            return (
              <div
                key={loc.id}
                className="location-card"
              >
                <div 
                  onClick={() => handleLocationClick(loc)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleLocationClick(loc);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Navigate to ${loc.friendly_name || loc.name}`}
                  style={{ flex: 1, cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem", fontWeight: 500 }}>
                      {loc.friendly_name || loc.name}
                    </span>
                    {loc.is_primary_location && (
                      <span className="location-badge home">HOME</span>
                    )}
                    {loc.is_container && (
                      <span className="location-badge container">BOX</span>
                    )}
                  </div>
                  {loc.location_type && (
                    <div style={{ 
                      fontSize: "0.75rem", 
                      color: "var(--muted)", 
                      marginBottom: "0.5rem" 
                    }}>
                      {getLocationTypeLabel(loc.location_type)}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                      {childCount > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span style={{ color: "var(--accent)" }} role="img" aria-label="Rooms">📁</span>
                          {childCount} {childCount === 1 ? "room" : "rooms"}
                        </span>
                      )}
                      {itemCount > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <span style={{ color: "var(--accent)" }} role="img" aria-label="Items">📦</span>
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </span>
                      )}
                      {childCount === 0 && itemCount === 0 && (
                        <span>Click to explore</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button
                    className="btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingLocation(loc);
                    }}
                    style={{ 
                      fontSize: "0.7rem", 
                      padding: "0.2rem 0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                    title="View/Edit Location"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    className="btn-outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQRPrint(loc);
                    }}
                    style={{ 
                      fontSize: "0.7rem", 
                      padding: "0.2rem 0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem"
                    }}
                    title="Print QR Label"
                  >
                    📱 QR
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Items at current location */}
        {currentLocation && currentLocationItems.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ 
              fontSize: "0.95rem", 
              fontWeight: 500, 
              marginBottom: "0.75rem",
              color: "var(--accent)"
            }}>
              Items in {currentLocation.friendly_name || currentLocation.name}
            </h3>
            <div className="table-wrapper" style={{ maxHeight: "300px" }}>
              <table className="items-table compact">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Brand</th>
                    <th>Model</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLocationItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onItemClick?.(item)}
                      style={{ cursor: onItemClick ? "pointer" : "default" }}
                    >
                      <td>{item.name}</td>
                      <td>{item.brand || "—"}</td>
                      <td>{item.model_number || "—"}</td>
                      <td>
                        {item.estimated_value != null 
                          ? `$${item.estimated_value.toLocaleString()}` 
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Show message when no items at selected location */}
        {currentLocation && currentLocationItems.length === 0 && currentPanelLocations.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "1.5rem",
            color: "var(--muted)",
            fontStyle: "italic",
            background: "rgba(15, 23, 42, 0.5)",
            borderRadius: "0.5rem"
          }}>
            No items in this location.
          </div>
        )}
      </section>



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
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_container"
                    checked={formData.is_container || false}
                    onChange={handleChange}
                    disabled={formLoading}
                  />
                  <span>📦 Container (Box/Bin/Case with multiple items)</span>
                </label>
                <span className="help-text">
                  Mark this location as a container for storing multiple items. 
                  A QR code can be printed and affixed to the box.
                </span>
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

              {/* Print Label Section - Only show when editing */}
              {editingLocation && (
                <div className="form-group" style={{ 
                  marginTop: "1rem", 
                  padding: "1rem", 
                  borderRadius: "0.5rem",
                  background: "rgba(78, 205, 196, 0.1)",
                  border: "1px solid rgba(78, 205, 196, 0.3)"
                }}>
                  <label style={{ fontWeight: 500, marginBottom: "0.5rem", display: "block" }}>
                    🖨️ Print Label
                  </label>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <select
                        id="printMode"
                        value={printModeFromEdit}
                        onChange={(e) => setPrintModeFromEdit(e.target.value as PrintMode)}
                        disabled={formLoading}
                        style={{ width: "100%" }}
                      >
                        {PRINT_MODE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setShowQRPrint(editingLocation);
                      }}
                      disabled={formLoading}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      🖨️ Print
                    </button>
                  </div>
                  <span className="help-text" style={{ marginTop: "0.5rem", display: "block" }}>
                    Print a label for this location with your selected content
                  </span>
                </div>
              )}

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

      {/* QR Label Print Modal */}
      {showQRPrint && (
        <QRLabelPrint
          location={showQRPrint}
          items={getItemsAtLocation(showQRPrint.id)}
          onClose={() => setShowQRPrint(null)}
          initialPrintMode={printModeFromEdit}
        />
      )}

      {/* Location Details Modal (with Insurance tab for primary locations) */}
      {viewingLocation && (
        <LocationDetailsModal
          location={viewingLocation}
          items={items}
          allLocations={locations}
          onClose={() => setViewingLocation(null)}
          onUpdate={() => {
            setViewingLocation(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
};

export default LocationsPage;
