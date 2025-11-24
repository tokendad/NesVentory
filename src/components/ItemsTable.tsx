import React from "react";
import type { Item } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/utils";

interface ItemsTableProps {
  items: Item[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onAddItem: () => void;
  onItemClick: (item: Item) => void;
}

const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  loading,
  error,
  onRefresh,
  onAddItem,
  onItemClick,
}) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Items</h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn-outline" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="btn-primary" onClick={onAddItem}>
            Add Item
          </button>
        </div>
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
            {items.map((item) => (
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
