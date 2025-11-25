import React, { useState, useMemo } from "react";
import type { Item } from "../lib/api";
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
}

const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  loading,
  error,
  onRefresh,
  onAddItem,
  onItemClick,
  onImport,
  onAIScan,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Items</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
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
                <td colSpan={7} className="empty-row">
                  No items found. Try importing from Encircle or adding via API.
                </td>
              </tr>
            )}
            {items.length > 0 && filteredItems.length === 0 && searchQuery.trim() && !loading && (
              <tr>
                <td colSpan={7} className="empty-row">
                  No items match your search.
                </td>
              </tr>
            )}
            {filteredItems.map((item) => (
              <tr key={item.id} onClick={() => onItemClick(item)} style={{ cursor: "pointer" }}>
                <td>{item.name}</td>
                <td>{item.brand || "—"}</td>
                <td>{item.model_number || "—"}</td>
                <td>{item.serial_number || "—"}</td>
                <td>
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
                <td>{formatDate(item.purchase_date)}</td>
                <td>{formatCurrency(item.purchase_price != null ? Number(item.purchase_price) : null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ItemsTable;
