import React, { useEffect, useState } from "react";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import UserSettings from "./components/UserSettings";
import LocaleSettings from "./components/LocaleSettings";
import ThemeSettings from "./components/ThemeSettings";
import AdminPage from "./components/AdminPage";
import Layout, { useIsMobile } from "./components/Layout";
import DashboardCards from "./components/DashboardCards";
import ItemsTable from "./components/ItemsTable";
import LocationsTree from "./components/LocationsTree";
import LocationsPage from "./components/LocationsPage";
import ItemForm from "./components/ItemForm";
import ItemDetails from "./components/ItemDetails";
import Status from "./components/Status";
import EncircleImport from "./components/EncircleImport";
import AIDetection from "./components/AIDetection";
import {
  fetchItems,
  fetchLocations,
  fetchTags,
  createItem,
  updateItem,
  deleteItem,
  uploadPhoto,
  getCurrentUser,
  bulkDeleteItems,
  bulkUpdateTags,
  bulkUpdateLocation,
  type Item,
  type ItemCreate,
  type Location,
  type User,
  type Tag,
} from "./lib/api";
import { PHOTO_TYPES } from "./lib/constants";
import type { PhotoUpload } from "./lib/types";
import { getLocationPath } from "./lib/utils";

type View = "dashboard" | "items" | "locations" | "status" | "admin";

const App: React.FC = () => {
  const isMobile = useIsMobile();
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("NesVentory_token")
  );
  const [userEmail, setUserEmail] = useState<string | undefined>(
    () => localStorage.getItem("NesVentory_user_email") || undefined
  );
  const [currentUser, setCurrentUser] = useState<User | null>(
    () => {
      const stored = localStorage.getItem("NesVentory_currentUser");
      return stored ? JSON.parse(stored) : null;
    }
  );
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [showItemForm, setShowItemForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showLocaleSettings, setShowLocaleSettings] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  const [showAdminPage, setShowAdminPage] = useState(false);
  const [showEncircleImport, setShowEncircleImport] = useState(false);
  const [showAIDetection, setShowAIDetection] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

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

  async function loadTags() {
    try {
      const data = await fetchTags();
      setTags(data);
    } catch (err: any) {
      console.error("Failed to load tags:", err);
    }
  }

  async function loadCurrentUser() {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      // Persist only NON-SENSITIVE user fields to localStorage.
      // NEVER store api_key, password, or any credentials!
      const safeUser = {
        id: user.id,
        email: user.email,
        full_name: user.full_name || "",
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
      localStorage.setItem("NesVentory_currentUser", JSON.stringify(safeUser));
    } catch (err: any) {
      console.error("Failed to load current user:", err);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadItems();
    loadLocations();
    loadTags();
    loadCurrentUser();
  }, [token]);

  function handleLogout() {
    localStorage.removeItem("NesVentory_token");
    localStorage.removeItem("NesVentory_user_email");
    localStorage.removeItem("NesVentory_currentUser");
    setToken(null);
    setUserEmail(undefined);
    setCurrentUser(null);
    setItems([]);
    setLocations([]);
  }

  async function handleCreateItem(item: ItemCreate, photos: PhotoUpload[]) {
    const createdItem = await createItem(item);
    await uploadPhotosForItem(createdItem.id.toString(), photos);
    setShowItemForm(false);
    await loadItems();
  }

  async function handleUpdateItem(item: ItemCreate, photos: PhotoUpload[]) {
    if (!selectedItem) return;
    const updatedItem = await updateItem(selectedItem.id.toString(), item);
    await uploadPhotosForItem(updatedItem.id.toString(), photos);
    setEditingItem(false);
    setSelectedItem(null);
    await loadItems();
  }

  async function uploadPhotosForItem(itemId: string, photos: PhotoUpload[]) {
    if (photos.length > 0) {
      for (const photo of photos) {
        const isPrimary = photo.type === PHOTO_TYPES.DEFAULT;
        const isDataTag = photo.type === PHOTO_TYPES.DATA_TAG;
        await uploadPhoto(
          itemId,
          photo.file,
          photo.type,
          isPrimary,
          isDataTag
        );
      }
    }
  }

  async function handleDeleteItem() {
    if (!selectedItem) return;
    await deleteItem(selectedItem.id.toString());
    setSelectedItem(null);
    await loadItems();
  }

  async function handleBulkDelete(itemIds: string[]) {
    await bulkDeleteItems(itemIds);
    await loadItems();
  }

  async function handleBulkUpdateTags(itemIds: string[], tagIds: string[], mode: "replace" | "add" | "remove") {
    await bulkUpdateTags(itemIds, tagIds, mode);
    await loadItems();
  }

  async function handleBulkUpdateLocation(itemIds: string[], locationId: string | null) {
    await bulkUpdateLocation(itemIds, locationId);
    await loadItems();
  }

  async function handleAIAddItems(items: ItemCreate[]) {
    // Create each item detected by AI
    for (const item of items) {
      await createItem(item);
    }
    await loadItems();
  }

  function handleItemClick(item: Item) {
    setSelectedItem(item);
  }

  function handleEditClick() {
    setEditingItem(true);
  }

  function getLocationName(locationId: number | string | null | undefined): string {
    return getLocationPath(locationId, locations);
  }

  function handleUserSettingsUpdate(updatedUser: User) {
    setCurrentUser(updatedUser);
    // Persist only NON-SENSITIVE user fields to localStorage.
    // NEVER store api_key, password, auth_token, or any credentials!
    // Defensive: make sure sensitive data is never stored
    const {
      id,
      email,
      full_name = "",
      role,
      created_at,
      updated_at,
    } = updatedUser;
    const safeUser = {
      id,
      email,
      full_name,
      role,
      created_at,
      updated_at,
    };
    // You may optionally add a runtime assertion or warning if sensitive keys are present
    localStorage.setItem("NesVentory_currentUser", JSON.stringify(safeUser));
  }

  if (!token) {
    return (
      <div className="app-root">
        {showRegisterForm ? (
          <RegisterForm
            onSuccess={() => {
              setShowRegisterForm(false);
              setRegistrationSuccess(true);
            }}
            onCancel={() => setShowRegisterForm(false)}
          />
        ) : (
          <div>
            {registrationSuccess && (
              <div style={{
                position: "fixed",
                top: "1rem",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#4caf50",
                color: "white",
                padding: "1rem 2rem",
                borderRadius: "4px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                zIndex: 1000
              }}>
                Registration successful! Please log in.
              </div>
            )}
            <LoginForm
              onSuccess={(newToken, email) => {
                setToken(newToken);
                setUserEmail(email);
                setRegistrationSuccess(false);
              }}
              onRegisterClick={() => {
                setShowRegisterForm(true);
                setRegistrationSuccess(false);
              }}
            />
          </div>
        )}
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
      <button
        className={view === "locations" ? "nav-link active" : "nav-link"}
        onClick={() => setView("locations")}
      >
        Locations
      </button>
      <button
        className={view === "status" ? "nav-link active" : "nav-link"}
        onClick={() => setView("status")}
      >
        Status
      </button>
      {currentUser?.role === "admin" && (
        <button
          className={view === "admin" ? "nav-link active" : "nav-link"}
          onClick={() => setShowAdminPage(true)}
        >
          Admin
        </button>
      )}
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
      <Layout 
        sidebar={sidebar} 
        onLogout={handleLogout} 
        userEmail={userEmail}
        userName={currentUser?.full_name || undefined}
        onUserClick={() => setShowUserSettings(true)}
        onLocaleClick={() => setShowLocaleSettings(true)}
        onThemeClick={() => setShowThemeSettings(true)}
      >
        {view === "dashboard" && (
          <>
            <DashboardCards
              totalItems={items.length}
              totalLocations={locations.length}
              isMobile={isMobile}
              userName={currentUser?.full_name || undefined}
              userEmail={userEmail}
              onUserClick={() => setShowUserSettings(true)}
              onLogout={handleLogout}
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
                      <th>Brand</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .slice()
                      .sort((a, b) => {
                        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                        return dateB - dateA;
                      })
                      .slice(0, 10)
                      .map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>{item.name}</td>
                          <td>{item.brand || "—"}</td>
                          <td>{getLocationName(item.location_id)}</td>
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
            onAddItem={() => setShowItemForm(true)}
            onItemClick={handleItemClick}
            onImport={() => setShowEncircleImport(true)}
            onAIScan={() => setShowAIDetection(true)}
            onBulkDelete={handleBulkDelete}
            onBulkUpdateTags={handleBulkUpdateTags}
            onBulkUpdateLocation={handleBulkUpdateLocation}
            tags={tags}
            locations={locations}
          />
        )}
        {view === "locations" && (
          <LocationsPage
            locations={locations}
            items={items}
            loading={locationsLoading}
            error={locationsError}
            onRefresh={loadLocations}
            onItemClick={handleItemClick}
          />
        )}
        {view === "status" && <Status />}
        {showItemForm && (
          <ItemForm
            onSubmit={handleCreateItem}
            onCancel={() => setShowItemForm(false)}
            locations={locations}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.full_name || currentUser?.email}
          />
        )}
        {selectedItem && !editingItem && (
          <ItemDetails
            item={selectedItem}
            locations={locations}
            onEdit={handleEditClick}
            onDelete={handleDeleteItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
        {selectedItem && editingItem && (
          <ItemForm
            onSubmit={handleUpdateItem}
            onCancel={() => {
              setEditingItem(false);
              setSelectedItem(null);
            }}
            locations={locations}
            initialData={selectedItem}
            isEditing={true}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.full_name || currentUser?.email}
          />
        )}
        {showUserSettings && currentUser && (
          <UserSettings
            user={currentUser}
            onClose={() => setShowUserSettings(false)}
            onUpdate={handleUserSettingsUpdate}
          />
        )}
        {showLocaleSettings && (
          <LocaleSettings
            onClose={() => setShowLocaleSettings(false)}
          />
        )}
        {showThemeSettings && (
          <ThemeSettings
            onClose={() => setShowThemeSettings(false)}
          />
        )}
        {showAdminPage && currentUser?.role === "admin" && (
          <AdminPage onClose={() => setShowAdminPage(false)} />
        )}
        {showEncircleImport && (
          <EncircleImport
            onClose={() => setShowEncircleImport(false)}
            onSuccess={() => {
              loadItems();
              loadLocations();
            }}
          />
        )}
        {showAIDetection && (
          <AIDetection
            onClose={() => setShowAIDetection(false)}
            onAddItems={handleAIAddItems}
            locations={locations}
          />
        )}
      </Layout>
    </div>
  );
};

export default App;
