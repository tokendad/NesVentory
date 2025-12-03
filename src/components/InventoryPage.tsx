import React, { useState, useMemo, useCallback } from "react";
import type { Item, Location, Tag } from "../lib/api";
import { getLocationPath } from "../lib/utils";
import { updateLocation } from "../lib/api";

interface InventoryPageProps {
  items: Item[];
  locations: Location[];
  loading: boolean;
  itemsLoading: boolean;
  locationsLoading: boolean;
  onRefresh: () => void;
  onRefreshLocations: () => void;
  onItemClick: (item: Item) => void;
  onAddItem?: () => void;
  onImport?: () => void;
  onAIScan?: () => void;
  onAddLocation?: () => void;
  onBulkDelete?: (itemIds: string[]) => Promise<void>;
  onBulkUpdateTags?: (itemIds: string[], tagIds: string[], mode: "replace" | "add" | "remove") => Promise<void>;
  onBulkUpdateLocation?: (itemIds: string[], locationId: string | null) => Promise<void>;
  tags?: Tag[];
  isMobile?: boolean;
}

// Column configuration type
interface ColumnConfig {
  key: string;
  label: string;
  enabled: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "name", label: "Name", enabled: true },
  { key: "brand", label: "Brand", enabled: true },
  { key: "model_number", label: "Model", enabled: false },
  { key: "serial_number", label: "Serial", enabled: false },
  { key: "location", label: "Location", enabled: true },
  { key: "purchase_price", label: "Purchase Price", enabled: false },
  { key: "estimated_value", label: "Estimated Value", enabled: false },
  { key: "tags", label: "Tags", enabled: false },
];

const SHOW_ALL_ITEMS = -1; // Special value to indicate showing all items

const InventoryPage: React.FC<InventoryPageProps> = ({
  items,
  locations,
  loading,
  itemsLoading,
  locationsLoading,
  onRefresh,
  onRefreshLocations,
  onItemClick,
  onAddItem,
  onImport,
  onAIScan,
  onAddLocation,
  onBulkDelete,
  onBulkUpdateTags,
  onBulkUpdateLocation,
  tags = [],
  isMobile = false,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [itemLimit, setItemLimit] = useState<number>(10);
  const [columns, setColumns] = useState<ColumnConfig[]>(
    () => {
      const saved = localStorage.getItem("NesVentory_itemColumns");
      return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    }
  );
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState<Location | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"delete" | "updateTags" | "updateLocation" | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [tagUpdateMode, setTagUpdateMode] = useState<"replace" | "add" | "remove">("add");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Build location tree
  const locationTree = useMemo(() => {
    const byId = new Map<string | number, Location & { children: Location[] }>();
    locations.forEach((loc) =>
      byId.set(loc.id, { ...loc, children: [] })
    );
    const roots: (Location & { children: Location[] })[] = [];
    byId.forEach((loc) => {
      if (loc.parent_id != null && byId.has(loc.parent_id)) {
        byId.get(loc.parent_id)!.children.push(loc);
      } else {
        roots.push(loc);
      }
    });
    return roots;
  }, [locations]);

  // Get items for location
  const getItemsAtLocation = useCallback((locationId: string | number | null): Item[] => {
    if (locationId === null) {
      return items;
    }
    // Get all descendant location IDs
    const getDescendantIds = (locId: string | number): Set<string | number> => {
      const ids = new Set<string | number>([locId]);
      const children = locations.filter(loc => loc.parent_id?.toString() === locId.toString());
      children.forEach(child => {
        const childIds = getDescendantIds(child.id);
        childIds.forEach(id => ids.add(id));
      });
      return ids;
    };
    const targetIds = getDescendantIds(locationId);
    return items.filter(item => item.location_id && targetIds.has(item.location_id));
  }, [items, locations]);

  // Filter items based on selected location and limit
  const filteredItems = useMemo(() => {
    const locationItems = selectedLocation 
      ? getItemsAtLocation(selectedLocation.id)
      : items;
    
    // Sort by newest first (created_at descending)
    const sorted = locationItems.slice().sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    // Return all items if limit is set to show all, otherwise slice to limit
    return itemLimit === SHOW_ALL_ITEMS ? sorted : sorted.slice(0, itemLimit);
  }, [items, selectedLocation, getItemsAtLocation, itemLimit]);

  // Toggle column visibility
  const toggleColumn = (key: string) => {
    const newColumns = columns.map(col => 
      col.key === key ? { ...col, enabled: !col.enabled } : col
    );
    setColumns(newColumns);
    localStorage.setItem("NesVentory_itemColumns", JSON.stringify(newColumns));
  };

  // Get enabled columns
  const enabledColumns = columns.filter(col => col.enabled);

  // Bulk operation handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItemIds(new Set(filteredItems.map(item => item.id.toString())));
    } else {
      setSelectedItemIds(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItemIds);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItemIds(newSelected);
  };

  const visibleSelectedIds = useMemo(() => {
    const filteredIds = new Set(filteredItems.map(item => item.id.toString()));
    return new Set(Array.from(selectedItemIds).filter(id => filteredIds.has(id)));
  }, [filteredItems, selectedItemIds]);

  const isAllSelected = filteredItems.length > 0 && filteredItems.every(item => selectedItemIds.has(item.id.toString()));
  const isSomeSelected = visibleSelectedIds.size > 0;

  const handleBulkActionConfirm = async () => {
    if (!bulkAction || visibleSelectedIds.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const itemIds = Array.from(visibleSelectedIds);
      
      if (bulkAction === "delete" && onBulkDelete) {
        await onBulkDelete(itemIds);
      } else if (bulkAction === "updateTags" && onBulkUpdateTags) {
        await onBulkUpdateTags(itemIds, Array.from(selectedTagIds), tagUpdateMode);
      } else if (bulkAction === "updateLocation" && onBulkUpdateLocation) {
        await onBulkUpdateLocation(itemIds, selectedLocationId);
      }
      
      setSelectedItemIds(new Set());
      setBulkAction(null);
      setSelectedTagIds(new Set());
      setSelectedLocationId(null);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleCancelBulkAction = () => {
    setBulkAction(null);
    setSelectedTagIds(new Set());
    setSelectedLocationId(null);
  };

  const handleTagToggle = (tagId: string) => {
    const newSelected = new Set(selectedTagIds);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTagIds(newSelected);
  };

  // Location node component
  const LocationNode: React.FC<{ 
    loc: Location & { children: Location[] }; 
    level: number;
  }> = ({ loc, level }) => {
    const itemCount = getItemsAtLocation(loc.id).length;
    const hasChildren = loc.children && loc.children.length > 0;
    const isSelected = selectedLocation?.id === loc.id;

    return (
      <div style={{ display: "inline-block" }}>
        <div
          className={`location-bubble ${isSelected ? 'selected' : ''}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            margin: "0.25rem",
            borderRadius: "2rem",
            background: isSelected ? "var(--accent)" : "rgba(78, 205, 196, 0.2)",
            border: `1px solid ${isSelected ? "var(--accent)" : "rgba(78, 205, 196, 0.5)"}`,
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
          onClick={() => setSelectedLocation(isSelected ? null : loc)}
        >
          <span>{loc.friendly_name || loc.name}</span>
          {itemCount > 0 && (
            <span style={{ 
              fontSize: "0.75rem", 
              opacity: 0.8,
              backgroundColor: "rgba(0,0,0,0.2)",
              padding: "0.125rem 0.375rem",
              borderRadius: "1rem"
            }}>
              {itemCount}
            </span>
          )}
          <button
            className="btn-icon-small"
            onClick={(e) => {
              e.stopPropagation();
              setShowLocationSettings(loc);
              setEditFormData({
                name: loc.name,
                friendly_name: loc.friendly_name || "",
                description: loc.description || "",
                address: loc.address || "",
              });
            }}
            title="Location Settings"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem",
              display: "flex",
              alignItems: "center",
              fontSize: "1rem",
            }}
          >
            ⚙️
          </button>
        </div>
        {hasChildren && (
          <div style={{ display: "inline-block", marginLeft: "0.5rem" }}>
            {loc.children.map(child => (
              <LocationNode key={child.id} loc={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleLocationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showLocationSettings) return;

    try {
      await updateLocation(showLocationSettings.id.toString(), editFormData);
      setShowLocationSettings(null);
      setEditFormData(null);
      onRefreshLocations();
    } catch (err: any) {
      alert(`Failed to update location: ${err.message}`);
    }
  };

  return (
    <>
      {/* Stats Section */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-label">Total Items</div>
          <div className="card-value">{items.length}</div>
          <div className="card-footnote">All tracked possessions</div>
        </div>
        <div className="card">
          <div className="card-label">Locations</div>
          <div className="card-value">{locations.length}</div>
          <div className="card-footnote">Homes, rooms, shelves</div>
        </div>
        <div className="card">
          <div className="card-label">Status</div>
          <div className="card-value status-ok">Healthy</div>
          <div className="card-footnote">API reachable</div>
        </div>
      </div>

      {/* Locations Section */}
      <section className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-header">
          <h2>Browse Locations</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn-outline"
              onClick={() => setSelectedLocation(null)}
              disabled={selectedLocation === null}
            >
              All Locations
            </button>
            <button
              className="btn-outline"
              onClick={onRefreshLocations}
              disabled={locationsLoading}
            >
              {locationsLoading ? "Refreshing..." : "Refresh"}
            </button>
            {onAddLocation && (
              <button
                className="btn-primary"
                onClick={onAddLocation}
              >
                Add Location
              </button>
            )}
          </div>
        </div>
        {locationsLoading && <p className="muted">Loading locations...</p>}
        {!locationsLoading && locationTree.length === 0 && (
          <p className="muted">No locations yet.</p>
        )}
        {!locationsLoading && locationTree.length > 0 && (
          <div style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {locationTree.map(loc => (
              <LocationNode key={loc.id} loc={loc} level={0} />
            ))}
          </div>
        )}
      </section>

      {/* Items Section */}
      <section className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-header panel-header-left">
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {isSomeSelected && (
              <>
                <button 
                  className="btn-danger" 
                  onClick={() => setBulkAction("delete")}
                  disabled={itemsLoading}
                >
                  Delete ({visibleSelectedIds.size})
                </button>
                <button 
                  className="btn-outline" 
                  onClick={() => setBulkAction("updateTags")}
                  disabled={itemsLoading}
                >
                  Update Tags ({visibleSelectedIds.size})
                </button>
                <button 
                  className="btn-outline" 
                  onClick={() => setBulkAction("updateLocation")}
                  disabled={itemsLoading}
                >
                  Update Location ({visibleSelectedIds.size})
                </button>
                <div style={{ width: "1px", height: "1.5rem", background: "var(--border-subtle)", margin: "0 0.25rem" }} />
              </>
            )}
            <label style={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              Show:
              <select
                value={itemLimit}
                onChange={(e) => setItemLimit(Number(e.target.value))}
                style={{ padding: "0.25rem 0.5rem" }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={SHOW_ALL_ITEMS}>All</option>
              </select>
            </label>
            <button
              className="btn-outline"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
            >
              Columns
            </button>
            <button
              className="btn-outline"
              onClick={onRefresh}
              disabled={itemsLoading}
            >
              {itemsLoading ? "Refreshing..." : "Refresh"}
            </button>
            {onAIScan && (
              <button className="btn-outline" onClick={onAIScan}>
                📷 AI Scan
              </button>
            )}
            {onImport && (
              <button className="btn-outline" onClick={onImport}>
                Import from Encircle
              </button>
            )}
            {onAddItem && (
              <button className="btn-primary" onClick={onAddItem}>
                Add Item
              </button>
            )}
          </div>
          <h2>
            Items
            {selectedLocation && ` in ${selectedLocation.friendly_name || selectedLocation.name}`}
          </h2>
        </div>

        {/* Column Selector */}
        {showColumnSelector && (
          <div style={{
            padding: "1rem",
            background: "rgba(78, 205, 196, 0.1)",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
          }}>
            <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Select Columns to Display</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {columns.map(col => (
                <label key={col.key} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    type="checkbox"
                    checked={col.enabled}
                    onChange={() => toggleColumn(col.key)}
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table className="items-table">
            <thead>
              <tr>
                <th style={{ width: "2.5rem" }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={filteredItems.length === 0}
                  />
                </th>
                {enabledColumns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 && !itemsLoading && (
                <tr>
                  <td colSpan={enabledColumns.length + 1} className="empty-row">
                    {selectedLocation 
                      ? "No items in this location."
                      : "No items yet."}
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  style={{ cursor: "pointer" }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(item.id.toString())}
                      onChange={(e) => handleSelectItem(item.id.toString(), e.target.checked)}
                    />
                  </td>
                  {enabledColumns.map(col => {
                    const handleClick = () => onItemClick(item);
                    if (col.key === "name") return <td key={col.key} onClick={handleClick}>{item.name}</td>;
                    if (col.key === "brand") return <td key={col.key} onClick={handleClick}>{item.brand || "—"}</td>;
                    if (col.key === "model_number") return <td key={col.key} onClick={handleClick}>{item.model_number || "—"}</td>;
                    if (col.key === "serial_number") return <td key={col.key} onClick={handleClick}>{item.serial_number || "—"}</td>;
                    if (col.key === "location") return <td key={col.key} onClick={handleClick}>{getLocationPath(item.location_id, locations)}</td>;
                    if (col.key === "purchase_price") return (
                      <td key={col.key} onClick={handleClick}>
                        {item.purchase_price != null ? `$${item.purchase_price.toLocaleString()}` : "—"}
                      </td>
                    );
                    if (col.key === "estimated_value") return (
                      <td key={col.key} onClick={handleClick}>
                        {item.estimated_value != null ? `$${item.estimated_value.toLocaleString()}` : "—"}
                      </td>
                    );
                    if (col.key === "tags") return (
                      <td key={col.key} onClick={handleClick}>
                        {item.tags && item.tags.length > 0 
                          ? item.tags.map(t => t.name).join(", ")
                          : "—"}
                      </td>
                    );
                    return <td key={col.key} onClick={handleClick}>—</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Location Settings Modal */}
      {showLocationSettings && (
        <div className="modal-overlay" onClick={() => setShowLocationSettings(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Location Settings</h2>
              <button className="modal-close" onClick={() => setShowLocationSettings(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleLocationUpdate} className="item-form">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={editFormData?.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="friendly_name">Friendly Name</label>
                <input
                  type="text"
                  id="friendly_name"
                  value={editFormData?.friendly_name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, friendly_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={editFormData?.description || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input
                  type="text"
                  id="address"
                  value={editFormData?.address || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowLocationSettings(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkAction === "delete" && (
        <div className="modal-overlay" onClick={handleCancelBulkAction}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Bulk Delete</h2>
              <button className="modal-close" onClick={handleCancelBulkAction}>✕</button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <p>Are you sure you want to delete {visibleSelectedIds.size} item{visibleSelectedIds.size !== 1 ? 's' : ''}?</p>
              <p style={{ color: "var(--danger)", marginTop: "0.5rem" }}>This action cannot be undone.</p>
            </div>
            <div className="form-actions">
              <button className="btn-outline" onClick={handleCancelBulkAction} disabled={bulkActionLoading}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleBulkActionConfirm} disabled={bulkActionLoading}>
                {bulkActionLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Tags Modal */}
      {bulkAction === "updateTags" && (
        <div className="modal-overlay" onClick={handleCancelBulkAction}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Tags for {visibleSelectedIds.size} Item{visibleSelectedIds.size !== 1 ? 's' : ''}</h2>
              <button className="modal-close" onClick={handleCancelBulkAction}>✕</button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div className="form-group">
                <label>Mode</label>
                <select
                  value={tagUpdateMode}
                  onChange={(e) => setTagUpdateMode(e.target.value as "replace" | "add" | "remove")}
                  style={{ width: "100%", padding: "0.5rem" }}
                >
                  <option value="add">Add Tags</option>
                  <option value="remove">Remove Tags</option>
                  <option value="replace">Replace Tags</option>
                </select>
              </div>
              <div className="form-group">
                <label>Select Tags</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {tags.map(tag => (
                    <label key={tag.id} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <input
                        type="checkbox"
                        checked={selectedTagIds.has(tag.id.toString())}
                        onChange={() => handleTagToggle(tag.id.toString())}
                      />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                  {tags.length === 0 && (
                    <p style={{ color: "var(--muted)" }}>No tags available</p>
                  )}
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-outline" onClick={handleCancelBulkAction} disabled={bulkActionLoading}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleBulkActionConfirm} 
                disabled={bulkActionLoading || selectedTagIds.size === 0}
              >
                {bulkActionLoading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Location Modal */}
      {bulkAction === "updateLocation" && (
        <div className="modal-overlay" onClick={handleCancelBulkAction}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Location for {visibleSelectedIds.size} Item{visibleSelectedIds.size !== 1 ? 's' : ''}</h2>
              <button className="modal-close" onClick={handleCancelBulkAction}>✕</button>
            </div>
            <div style={{ padding: "1.5rem" }}>
              <div className="form-group">
                <label>Select Location</label>
                <select
                  value={selectedLocationId || ""}
                  onChange={(e) => setSelectedLocationId(e.target.value || null)}
                  style={{ width: "100%", padding: "0.5rem" }}
                >
                  <option value="">No Location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id.toString()}>
                      {getLocationPath(loc.id, locations)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-outline" onClick={handleCancelBulkAction} disabled={bulkActionLoading}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleBulkActionConfirm} disabled={bulkActionLoading}>
                {bulkActionLoading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryPage;
