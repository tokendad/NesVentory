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

  // Location node component
  const LocationNode: React.FC<{ 
    loc: Location & { children: Location[] }; 
    level: number;
  }> = ({ loc, level }) => {
    const itemCount = getItemsAtLocation(loc.id).length;
    const hasChildren = loc.children && loc.children.length > 0;
    const isSelected = selectedLocation?.id === loc.id;

    return (
      <div style={{ marginLeft: `${level * 1}rem` }}>
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
        {hasChildren && loc.children.map(child => (
          <LocationNode key={child.id} loc={child} level={level + 1} />
        ))}
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
          </div>
        </div>
        {locationsLoading && <p className="muted">Loading locations...</p>}
        {!locationsLoading && locationTree.length === 0 && (
          <p className="muted">No locations yet.</p>
        )}
        {!locationsLoading && locationTree.length > 0 && (
          <div style={{ padding: "1rem" }}>
            {locationTree.map(loc => (
              <LocationNode key={loc.id} loc={loc} level={0} />
            ))}
          </div>
        )}
      </section>

      {/* Items Section */}
      <section className="panel" style={{ marginTop: "1rem" }}>
        <div className="panel-header">
          <h2>
            Items
            {selectedLocation && ` in ${selectedLocation.friendly_name || selectedLocation.name}`}
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
          </div>
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
                {enabledColumns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 && !itemsLoading && (
                <tr>
                  <td colSpan={enabledColumns.length} className="empty-row">
                    {selectedLocation 
                      ? "No items in this location."
                      : "No items yet."}
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  style={{ cursor: "pointer" }}
                >
                  {enabledColumns.map(col => {
                    if (col.key === "name") return <td key={col.key}>{item.name}</td>;
                    if (col.key === "brand") return <td key={col.key}>{item.brand || "—"}</td>;
                    if (col.key === "model_number") return <td key={col.key}>{item.model_number || "—"}</td>;
                    if (col.key === "serial_number") return <td key={col.key}>{item.serial_number || "—"}</td>;
                    if (col.key === "location") return <td key={col.key}>{getLocationPath(item.location_id, locations)}</td>;
                    if (col.key === "purchase_price") return (
                      <td key={col.key}>
                        {item.purchase_price != null ? `$${item.purchase_price.toLocaleString()}` : "—"}
                      </td>
                    );
                    if (col.key === "estimated_value") return (
                      <td key={col.key}>
                        {item.estimated_value != null ? `$${item.estimated_value.toLocaleString()}` : "—"}
                      </td>
                    );
                    if (col.key === "tags") return (
                      <td key={col.key}>
                        {item.tags && item.tags.length > 0 
                          ? item.tags.map(t => t.name).join(", ")
                          : "—"}
                      </td>
                    );
                    return <td key={col.key}>—</td>;
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
    </>
  );
};

export default InventoryPage;
