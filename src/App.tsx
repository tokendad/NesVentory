import React, { useEffect, useState } from "react";
import LoginForm from "./components/LoginForm";
import Layout from "./components/Layout";
import DashboardCards from "./components/DashboardCards";
import ItemsTable from "./components/ItemsTable";
import LocationsTree from "./components/LocationsTree";
import { fetchItems, fetchLocations, type Item, type Location } from "./lib/api";

type View = "dashboard" | "items";

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("NesVentory_token")
  );
  const [userEmail, setUserEmail] = useState<string | undefined>(
    () => localStorage.getItem("NesVentory_user_email") || undefined
  );
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");

  async function loadItems() {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const data = await fetchItems();
      setItems(data);
    } catch (err: any) {
      setItemsError(err.message || "Failed to load items");
    } finally {
      setItemsLoading(false);
    }
  }

  async function loadLocations() {
    setLocationsLoading(true);
    setLocationsError(null);
    try {
      const data = await fetchLocations();
      setLocations(data);
    } catch (err: any) {
      setLocationsError(err.message || "Failed to load locations");
    } finally {
      setLocationsLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadItems();
    loadLocations();
  }, [token]);

  function handleLogout() {
    localStorage.removeItem("NesVentory_token");
    localStorage.removeItem("NesVentory_user_email");
    setToken(null);
    setUserEmail(undefined);
    setItems([]);
    setLocations([]);
  }

  if (!token) {
    return (
      <div className="app-root">
        <LoginForm
          onSuccess={(newToken, email) => {
            setToken(newToken);
            setUserEmail(email);
          }}
        />
      </div>
    );
  }

  const sidebar = (
    <nav className="sidebar-nav">
      <button
        className={view === "dashboard" ? "nav-link active" : "nav-link"}
        onClick={() => setView("dashboard")}
      >
        Dashboard
      </button>
      <button
        className={view === "items" ? "nav-link active" : "nav-link"}
        onClick={() => setView("items")}
      >
        Items
      </button>
      <hr />
      <LocationsTree
        locations={locations}
        loading={locationsLoading}
        error={locationsError}
      />
    </nav>
  );

  return (
    <div className="app-root">
      <Layout sidebar={sidebar} onLogout={handleLogout} userEmail={userEmail}>
        {view === "dashboard" && (
          <>
            <DashboardCards
              totalItems={items.length}
              totalLocations={locations.length}
            />
            <section className="panel">
              <div className="panel-header">
                <h2>Recent Items</h2>
                <button
                  className="btn-outline"
                  onClick={loadItems}
                  disabled={itemsLoading}
                >
                  {itemsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <div className="table-wrapper">
                <table className="items-table compact">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Manufacturer</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.manufacturer || "—"}</td>
                        <td>{item.location_id ?? "—"}</td>
                      </tr>
                    ))}
                    {items.length === 0 && !itemsLoading && (
                      <tr>
                        <td colSpan={3} className="empty-row">
                          No items yet. Your dashboard will come to life after your
                          first import.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {view === "items" && (
          <ItemsTable
            items={items}
            loading={itemsLoading}
            error={itemsError}
            onRefresh={loadItems}
          />
        )}
      </Layout>
    </div>
  );
};

export default App;
