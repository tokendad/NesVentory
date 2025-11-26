import React, { useState, useMemo } from "react";
import type { Item, Tag, Location } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/utils";

interface ItemsTableProps {
  items: Item[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onAddItem: () => void;
  onItemClick: (item: Item) => void;
  onImport?: () => void;
  onAIScan?: () => void;
  onBulkDelete?: (itemIds: string[]) => Promise<void>;
  onBulkUpdateTags?: (itemIds: string[], tagIds: string[], mode: "replace" | "add" | "remove") => Promise<void>;
  onBulkUpdateLocation?: (itemIds: string[], locationId: string | null) => Promise<void>;
  tags?: Tag[];
  locations?: Location[];
}

type BulkAction = "delete" | "updateTags" | "updateLocation" | null;
type TagUpdateMode = "replace" | "add" | "remove";

const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  loading,
  error,
  onRefresh,
  onAddItem,
  onItemClick,
  onImport,
  onAIScan,
  onBulkDelete,
  onBulkUpdateTags,
  onBulkUpdateLocation,
  tags = [],
  locations = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [tagUpdateMode, setTagUpdateMode] = useState<TagUpdateMode>("add");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }
    const query = searchQuery.toLowerCase().trim();
    return items.filter((item) => {
      // Search across all text fields
      const searchableFields = [
        item.name,
        item.description,
        item.brand,
        item.model_number,
        item.serial_number,
        item.retailer,
        item.upc,
      ];
      
      // Check if any field contains the query
      const fieldMatch = searchableFields.some(
        (field) => field && field.toLowerCase().includes(query)
      );
      
      // Check if any tag name contains the query
      const tagMatch = item.tags?.some(
        (tag) => tag.name.toLowerCase().includes(query)
      );
      
      return fieldMatch || tagMatch;
    });
  }, [items, searchQuery]);

  // Clear selection when filter changes to avoid confusion
  React.useEffect(() => {
    setSelectedItemIds(new Set());
  }, [searchQuery]);

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

  // Only count items that are both selected and currently visible in filtered list
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
      
      // Reset state after successful action
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

  return (
    <section className="panel">
      <div className="panel-header panel-header-left">
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {isSomeSelected && (
            <>
              <button 
                className="btn-danger" 
                onClick={() => setBulkAction("delete")}
                disabled={loading}
              >
                Delete ({visibleSelectedIds.size})
              </button>
              <button 
                className="btn-outline" 
                onClick={() => setBulkAction("updateTags")}
                disabled={loading}
              >
                Update Tags ({visibleSelectedIds.size})
              </button>
              <button 
                className="btn-outline" 
                onClick={() => setBulkAction("updateLocation")}
                disabled={loading}
              >
                Update Location ({visibleSelectedIds.size})
              </button>
              <div style={{ width: "1px", height: "1.5rem", background: "var(--border-subtle)", margin: "0 0.25rem" }} />
            </>
          )}
          <button className="btn-outline" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
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
          <button className="btn-primary" onClick={onAddItem}>
            Add Item
          </button>
        </div>
        <h2>Items</h2>
      </div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search items by name, brand, model, serial, tags..."
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
      <div className="table-wrapper">
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  title="Select all items"
                />
              </th>
              <th>Name</th>
              <th>Brand</th>
              <th>Model</th>
              <th>Serial</th>
              <th>Tags</th>
              <th>Purchase Date</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="empty-row">
                  No items found. Try importing from Encircle or adding via API.
                </td>
              </tr>
            )}
            {items.length > 0 && filteredItems.length === 0 && searchQuery.trim() && !loading && (
              <tr>
                <td colSpan={8} className="empty-row">
                  No items match your search.
                </td>
              </tr>
            )}
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedItemIds.has(item.id.toString())}
                    onChange={(e) => handleSelectItem(item.id.toString(), e.target.checked)}
                  />
                </td>
                <td onClick={() => onItemClick(item)} style={{ cursor: "pointer" }}>{item.name}</td>
                <td onClick={() => onItemClick(item)} style={{ cursor: "pointer" }}>{item.brand || "—"}</td>
                <td onClick={() => onItemClick(item)} style={{ cursor: "pointer" }}>{item.model_number || "—"}</td>
                <td onClick={() => onItemClick(item)} style={{ cursor: "pointer" }}>{item.serial_number || "—"}</td>
                <td onClick={() => onItemClick(item)} style={{ cursor: "pointer" }}>
                  {item.tags && item.tags.length > 0 ? (
                    <div className="item-tags">
                      {item.tags.map(tag => (
                        <span key={tag.id} className={`tag-badge ${tag.is_predefined ? 'predefined' : ''}`}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : "—"}
                </td>
                <td onClick={() => onItemClick(item)} style={{ cursor: "pointer" }}>{formatDate(item.purchase_date)}</td>
                <td onClick={() => onItemClick(item)} style={{ cursor: "pointer" }}>{formatCurrency(item.purchase_price != null ? Number(item.purchase_price) : null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {bulkAction === "delete" && (
        <div className="modal-overlay" onClick={handleCancelBulkAction}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirm Delete</h2>
              <button className="modal-close" onClick={handleCancelBulkAction}>×</button>
            </div>
            <div style={{ padding: "1rem 0" }}>
              <p style={{ color: "var(--danger)", fontWeight: 500, marginBottom: "1rem" }}>
                You are about to delete {visibleSelectedIds.size} item{visibleSelectedIds.size !== 1 ? "s" : ""}.
              </p>
              <p style={{ color: "var(--muted)" }}>
                This action cannot be undone. Please confirm your choice.
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={handleCancelBulkAction} disabled={bulkActionLoading}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleBulkActionConfirm} disabled={bulkActionLoading}>
                {bulkActionLoading ? "Deleting..." : `Delete ${visibleSelectedIds.size} Item${visibleSelectedIds.size !== 1 ? "s" : ""}`}
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
              <h2>Update Tags</h2>
              <button className="modal-close" onClick={handleCancelBulkAction}>×</button>
            </div>
            <div style={{ padding: "1rem 0" }}>
              <p style={{ color: "var(--accent)", marginBottom: "1rem" }}>
                This will affect {visibleSelectedIds.size} item{visibleSelectedIds.size !== 1 ? "s" : ""}.
              </p>
              
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label>Update Mode</label>
                <select
                  value={tagUpdateMode}
                  onChange={(e) => setTagUpdateMode(e.target.value as TagUpdateMode)}
                  style={{ width: "100%" }}
                >
                  <option value="add">Add tags to existing</option>
                  <option value="remove">Remove tags from items</option>
                  <option value="replace">Replace all tags</option>
                </select>
              </div>

              <div className="form-group">
                <label>Select Tags</label>
                <div className="tags-selection">
                  {tags.map((tag) => (
                    <label key={tag.id} className="tag-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.has(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                      />
                      <span className={tag.is_predefined ? "tag-predefined" : "tag-custom"}>
                        {tag.name}
                      </span>
                    </label>
                  ))}
                  {tags.length === 0 && (
                    <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No tags available</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={handleCancelBulkAction} disabled={bulkActionLoading}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleBulkActionConfirm} 
                disabled={bulkActionLoading || selectedTagIds.size === 0}
              >
                {bulkActionLoading ? "Updating..." : `Update ${visibleSelectedIds.size} Item${visibleSelectedIds.size !== 1 ? "s" : ""}`}
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
              <h2>Update Location</h2>
              <button className="modal-close" onClick={handleCancelBulkAction}>×</button>
            </div>
            <div style={{ padding: "1rem 0" }}>
              <p style={{ color: "var(--accent)", marginBottom: "1rem" }}>
                This will affect {visibleSelectedIds.size} item{visibleSelectedIds.size !== 1 ? "s" : ""}.
              </p>
              
              <div className="form-group">
                <label>Select New Location</label>
                <select
                  value={selectedLocationId || ""}
                  onChange={(e) => setSelectedLocationId(e.target.value || null)}
                  style={{ width: "100%" }}
                >
                  <option value="">No Location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id.toString()}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={handleCancelBulkAction} disabled={bulkActionLoading}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleBulkActionConfirm} 
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? "Updating..." : `Update ${visibleSelectedIds.size} Item${visibleSelectedIds.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ItemsTable;
