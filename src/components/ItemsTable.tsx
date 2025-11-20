import React from "react";
import type { Item } from "../lib/api";

interface ItemsTableProps {
  items: Item[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  loading,
  error,
  onRefresh,
}) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Items</h2>
        <button className="btn-outline" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="table-wrapper">
        <table className="items-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Manufacturer</th>
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
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.manufacturer || "—"}</td>
                <td>{item.model_number || "—"}</td>
                <td>{item.serial_number || "—"}</td>
                <td>{item.purchase_date || "—"}</td>
                <td>
                  {item.purchase_price != null
                    ? `$${item.purchase_price.toFixed(2)}`
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
