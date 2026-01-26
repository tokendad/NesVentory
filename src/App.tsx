/**
 * NesVentory v5.0.0 - Main Application Component
 * 
 * Legacy components that can be removed in future cleanup:
 * - DashboardCards.tsx (functionality merged into InventoryPage)
 * - ItemsTable.tsx (functionality merged into InventoryPage)
 * - LocationsPage.tsx (functionality merged into InventoryPage)
 * - LocationsTree.tsx (removed from sidebar navigation)
 */

import React, { useEffect, useState } from "react";
import LoginForm from "./components/LoginForm";
import OIDCCallback from "./components/OIDCCallback";
import RegisterForm from "./components/RegisterForm";
import SetPasswordModal from "./components/SetPasswordModal";
import UserSettings from "./components/UserSettings";
import Calendar from "./components/Calendar";
import AdminPage from "./components/AdminPage";
import Layout, { useIsMobile } from "./components/Layout";
import InventoryPage from "./components/InventoryPage";
import ItemForm from "./components/ItemForm";
import ItemDetails from "./components/ItemDetails";
import AddItemModal from "./components/AddItemModal";
import EncircleImport from "./components/EncircleImport";
import CSVImport from "./components/CSVImport";
import AIDetection from "./components/AIDetection";
import MediaManagement from "./components/MediaManagement";
import {
  fetchItems,
  fetchLocations,
  fetchTags,
  createItem,
  updateItem,
  deleteItem,
  uploadPhoto,
  uploadDocument,
  uploadDocumentFromUrl,
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
import type { PhotoUpload, DocumentUpload } from "./lib/types";

type View = "inventory" | "media" | "user-settings" | "calendar" | "admin";

const APP_VERSION = "6.7.4";

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
  const [view, setView] = useState<View>("inventory");
  const [showItemForm, setShowItemForm] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [itemInitialData, setItemInitialData] = useState<Partial<ItemCreate> | null>(null);
  const [itemInitialPhoto, setItemInitialPhoto] = useState<File | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showEncircleImport, setShowEncircleImport] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showAIDetection, setShowAIDetection] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout();
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

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
      // If unauthorized, logout to clear stale session
      if (err.message.includes("401") || err.message.includes("Could not validate credentials")) {
        handleLogout();
      }
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

  async function handleCreateItem(item: ItemCreate, photos: PhotoUpload[], documents: DocumentUpload[]) {
    const createdItem = await createItem(item);
    await uploadPhotosForItem(createdItem.id.toString(), photos);
    await uploadDocumentsForItem(createdItem.id.toString(), documents);
    setShowItemForm(false);
    await loadItems();
  }

  async function handleUpdateItem(item: ItemCreate, photos: PhotoUpload[], documents: DocumentUpload[]) {
    if (!selectedItem) return;
    const updatedItem = await updateItem(selectedItem.id.toString(), item);
    await uploadPhotosForItem(updatedItem.id.toString(), photos);
    await uploadDocumentsForItem(updatedItem.id.toString(), documents);
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

  async function uploadDocumentsForItem(itemId: string, documents: DocumentUpload[]) {
    if (documents.length > 0) {
      for (const doc of documents) {
        if (doc.file) {
          // Upload from file
          await uploadDocument(
            itemId,
            doc.file,
            doc.type
          );
        } else if (doc.url) {
          // Upload from URL
          await uploadDocumentFromUrl(
            itemId,
            doc.url,
            doc.type
          );
        }
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

  // Filter items based on search query
  const filteredItems = searchQuery.trim()
    ? items.filter((item) => {
        const query = searchQuery.toLowerCase().trim();
        const searchableFields = [
          item.name,
          item.description,
          item.brand,
          item.model_number,
          item.serial_number,
          item.retailer,
          item.upc,
        ];
        const fieldMatch = searchableFields.some(
          (field) => field && field.toLowerCase().includes(query)
        );
        const tagMatch = item.tags?.some(
          (tag) => tag.name.toLowerCase().includes(query)
        );
        return fieldMatch || tagMatch;
      })
    : items;

  if (!token) {
    // Check if we are handling an OIDC callback
    const urlParams = new URLSearchParams(window.location.search);
    const oidcCode = urlParams.get("code");

    if (oidcCode) {
      return (
        <OIDCCallback 
          onSuccess={(newToken, email) => {
            setToken(newToken);
            // If email is empty, it will be populated by loadCurrentUser
            if (email) setUserEmail(email);
            
            // Clear query params to remove code
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
          onError={(error) => {
            console.error("OIDC Login Error:", error);
            // Clear query params to remove code and show login form with error
            window.history.replaceState({}, document.title, window.location.pathname);
            // We can't easily pass error to LoginForm without state lifting or context, 
            // but clearing code will render LoginForm.
            alert(`Login failed: ${error}`); // Simple fallback
          }}
        />
      );
    }

    return (
      <div className="app-root">
        {showSetPassword ? (
          <SetPasswordModal
            onSuccess={() => {
              setShowSetPassword(false);
              // Reload user data after password is set
              loadCurrentUser();
            }}
          />
        ) : showRegisterForm ? (
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
              onMustChangePassword={() => {
                setShowSetPassword(true);
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
        className={view === "inventory" ? "nav-link active" : "nav-link"}
        onClick={() => setView("inventory")}
      >
        📦 Inventory
      </button>
      <button
        className={view === "media" ? "nav-link active" : "nav-link"}
        onClick={() => setView("media")}
      >
        📸 Media
      </button>
      <button
        className={view === "user-settings" ? "nav-link active" : "nav-link"}
        onClick={() => setView("user-settings")}
      >
        👤 User Settings
      </button>
      <button
        className={view === "calendar" ? "nav-link active" : "nav-link"}
        onClick={() => setView("calendar")}
      >
        📅 Maintenance Calendar
      </button>
      {currentUser?.role === "admin" && (
        <button
          className={view === "admin" ? "nav-link active" : "nav-link"}
          onClick={() => setView("admin")}
        >
          🔐 Admin
        </button>
      )}
      <div style={{ flex: 1 }} />
      <button className="btn-outline" onClick={handleLogout} style={{ marginTop: "auto" }}>
        Logout
      </button>
    </nav>
  );

  return (
    <div className="app-root">
      <Layout 
        sidebar={sidebar} 
        onLogout={handleLogout} 
        userEmail={userEmail}
        userName={currentUser?.full_name || undefined}
        onUserClick={() => setView("user-settings")}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        {view === "inventory" && (
          <InventoryPage
            items={filteredItems}
            locations={locations}
            loading={itemsLoading || locationsLoading}
            itemsLoading={itemsLoading}
            locationsLoading={locationsLoading}
            onRefresh={loadItems}
            onRefreshLocations={loadLocations}
            onItemClick={handleItemClick}
            onAddItem={() => setShowAddItemModal(true)}
            onImportEncircle={() => setShowEncircleImport(true)}
            onImportCSV={() => setShowCSVImport(true)}
            onAIScan={() => setShowAIDetection(true)}
            onBulkDelete={handleBulkDelete}
            onBulkUpdateTags={handleBulkUpdateTags}
            onBulkUpdateLocation={handleBulkUpdateLocation}
            tags={tags}
            isMobile={isMobile}
          />
        )}
        {view === "media" && <MediaManagement />}
        {view === "user-settings" && currentUser && (
          <UserSettings
            user={currentUser}
            onClose={() => setView("inventory")}
            onUpdate={handleUserSettingsUpdate}
            embedded={true}
          />
        )}
        {view === "calendar" && <Calendar />}
        {view === "admin" && currentUser?.role === "admin" && (
          <AdminPage 
            onClose={() => setView("inventory")} 
            currentUserId={currentUser?.id}
            embedded={true}
          />
        )}
        
        {/* Footer with version */}
        <footer className="app-footer">
          NesVentory v{APP_VERSION} | <a href="https://github.com/tokendad/NesVentory" target="_blank" rel="noopener noreferrer">GitHub</a>
        </footer>

        {/* Modals */}
        {showAddItemModal && (
          <AddItemModal
            onClose={() => setShowAddItemModal(false)}
            onContinue={(initialData, initialPhoto) => {
              setItemInitialData(initialData);
              setItemInitialPhoto(initialPhoto);
              setShowAddItemModal(false);
              setShowItemForm(true);
            }}
          />
        )}
        {showItemForm && !editingItem && (
          <ItemForm
            onSubmit={handleCreateItem}
            onCancel={() => {
              setShowItemForm(false);
              setItemInitialData(null);
              setItemInitialPhoto(null);
            }}
            locations={locations}
            initialData={itemInitialData || {}}
            initialPhotoFile={itemInitialPhoto}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.full_name || currentUser?.email}
          />
        )}
        {selectedItem && !editingItem && (
          <ItemDetails
            item={selectedItem}
            locations={locations}
            allItems={items}
            onEdit={handleEditClick}
            onDelete={handleDeleteItem}
            onClose={() => setSelectedItem(null)}
            onPhotoUpdated={loadItems}
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
        {showEncircleImport && (
          <EncircleImport
            onClose={() => setShowEncircleImport(false)}
            onSuccess={() => {
              loadItems();
              loadLocations();
            }}
          />
        )}
        {showCSVImport && (
          <CSVImport
            onClose={() => setShowCSVImport(false)}
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
