import React from "react";
import type { Item } from "../lib/api";

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
              <th>Purchase Date</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="empty-row">
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
                <td>{item.purchase_date || "—"}</td>
                <td>
                  {item.purchase_price != null && !isNaN(Number(item.purchase_price))
                    ? `$${Number(item.purchase_price).toFixed(2)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ItemsTable;
