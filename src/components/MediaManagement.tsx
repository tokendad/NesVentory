import React, { useState, useEffect } from "react";
import {
  getMediaStats,
  listMedia,
  bulkDeleteMedia,
  updateMedia,
  fetchItems,
  fetchLocations,
  type MediaStats,
  type MediaItem,
  type Item,
  type Location,
} from "../lib/api";
import { getLocationPath } from "../lib/utils";

interface MediaManagementProps {
  onClose?: () => void;
}

const MediaManagement: React.FC<MediaManagementProps> = ({ onClose }) => {
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"" | "photo" | "video">("");
  const [showMediaModal, setShowMediaModal] = useState<MediaItem | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    loadData();
    loadItems();
    loadLocations();
  }, []);

  useEffect(() => {
    loadMedia();
  }, [locationFilter, mediaTypeFilter]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const statsData = await getMediaStats();
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || "Failed to load media data");
    } finally {
      setLoading(false);
    }
  }

  async function loadMedia() {
    try {
      setError(null);
      const response = await listMedia(
        locationFilter || undefined,
        mediaTypeFilter || undefined,
        false
      );
      setMedia(response.media);
    } catch (err: any) {
      setError(err.message || "Failed to load media list");
    }
  }

  async function loadItems() {
    try {
      const itemsData = await fetchItems();
      setItems(itemsData);
    } catch (err: any) {
      console.error("Failed to load items:", err);
    }
  }

  async function loadLocations() {
    try {
      const locationsData = await fetchLocations();
      setLocations(locationsData);
    } catch (err: any) {
      console.error("Failed to load locations:", err);
    }
  }

  async function handleBulkDelete() {
    if (selectedMedia.size === 0) {
      alert("Please select media to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedMedia.size} media file(s)?`)) {
      return;
    }

    try {
      const mediaIds: string[] = [];
      const mediaTypes: string[] = [];
      
      selectedMedia.forEach((id) => {
        const mediaItem = media.find((m) => m.id === id);
        if (mediaItem) {
          mediaIds.push(id);
          mediaTypes.push(mediaItem.type);
        }
      });

      await bulkDeleteMedia(mediaIds, mediaTypes);
      setSelectedMedia(new Set());
      await loadData();
      await loadMedia();
    } catch (err: any) {
      alert(`Failed to delete media: ${err.message}`);
    }
  }

  function toggleMediaSelection(id: string) {
    const newSelection = new Set(selectedMedia);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMedia(newSelection);
  }

  function toggleSelectAll() {
    if (selectedMedia.size === media.length) {
      setSelectedMedia(new Set());
    } else {
      setSelectedMedia(new Set(media.map((m) => m.id)));
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  if (loading && !stats) {
    return <div className="loading">Loading media management...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📸 Media Management</h1>
        {onClose && (
          <button className="btn-outline" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Stats Section */}
      {stats && (
        <div className="stats-grid" style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "1rem", 
          marginBottom: "2rem" 
        }}>
          <div className="stat-card" style={{
            padding: "1.5rem",
            backgroundColor: "var(--card-bg)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Total Photos
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "600", color: "var(--text-primary)" }}>
              {stats.total_photos}
            </div>
          </div>
          <div className="stat-card" style={{
            padding: "1.5rem",
            backgroundColor: "var(--card-bg)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Total Videos
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "600", color: "var(--text-primary)" }}>
              {stats.total_videos}
            </div>
          </div>
          <div className="stat-card" style={{
            padding: "1.5rem",
            backgroundColor: "var(--card-bg)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Storage Used
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "600", color: "var(--text-primary)" }}>
              {stats.total_storage_mb.toFixed(2)} MB
            </div>
          </div>
          <div className="stat-card" style={{
            padding: "1.5rem",
            backgroundColor: "var(--card-bg)",
            borderRadius: "8px",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Directories
            </div>
            <div style={{ fontSize: "2rem", fontWeight: "600", color: "var(--text-primary)" }}>
              {stats.directories.length}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="bulk-actions" style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "1.5rem",
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <button
          className="btn-danger"
          onClick={handleBulkDelete}
          disabled={selectedMedia.size === 0}
        >
          🗑️ Delete Selected ({selectedMedia.size})
        </button>
        
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{ padding: "0.5rem", minWidth: "200px" }}
          >
            <option value="">All Locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id.toString()}>
                {getLocationPath(location.id, locations)}
              </option>
            ))}
          </select>
          <select
            value={mediaTypeFilter}
            onChange={(e) => setMediaTypeFilter(e.target.value as "" | "photo" | "video")}
            style={{ padding: "0.5rem" }}
          >
            <option value="">All Types</option>
            <option value="photo">Photos Only</option>
            <option value="video">Videos Only</option>
          </select>
        </div>
      </div>

      {/* Media Gallery */}
      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={media.length > 0 && selectedMedia.size === media.length}
            onChange={toggleSelectAll}
          />
          <span>Select All</span>
        </label>
        <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Showing {media.length} media file(s)
        </span>
      </div>

      <div className="media-gallery" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "1rem",
      }}>
        {media.map((item) => (
          <div
            key={item.id}
            className="media-item"
            style={{
              position: "relative",
              aspectRatio: "1",
              backgroundColor: "var(--card-bg)",
              borderRadius: "8px",
              overflow: "hidden",
              border: selectedMedia.has(item.id) 
                ? "3px solid var(--primary-color)" 
                : "1px solid var(--border-color)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {/* Checkbox */}
            <div style={{
              position: "absolute",
              top: "0.5rem",
              left: "0.5rem",
              zIndex: 2
            }}>
              <input
                type="checkbox"
                checked={selectedMedia.has(item.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleMediaSelection(item.id);
                }}
                style={{ width: "20px", height: "20px" }}
              />
            </div>

            {/* Media Preview */}
            <div 
              onClick={() => setShowMediaModal(item)}
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#000"
              }}
            >
              {item.type === "video" ? (
                <div style={{
                  color: "white",
                  fontSize: "3rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  🎥
                  <div style={{ fontSize: "0.875rem" }}>Video</div>
                </div>
              ) : (
                <img
                  src={item.path}
                  alt="Media"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block"
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement("div");
                      fallback.style.cssText = "color: white; font-size: 2rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;";
                      fallback.innerHTML = "📷";
                      const caption = document.createElement("div");
                      caption.style.cssText = "color: white; font-size: 0.875rem;";
                      caption.textContent = "Image not found";
                      fallback.appendChild(caption);
                      parent.appendChild(fallback);
                    }
                  }}
                />
              )}
            </div>

            {/* Info overlay */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "0.5rem",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "white",
              fontSize: "0.75rem"
            }}>
              <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                {item.item_name || item.location_name || "Unassigned"}
              </div>
              <div style={{ opacity: 0.8 }}>
                {new Date(item.uploaded_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {media.length === 0 && !loading && (
        <div style={{
          textAlign: "center",
          padding: "3rem",
          color: "var(--text-secondary)"
        }}>
          No media files found
        </div>
      )}

      {/* Media Detail Modal */}
      {showMediaModal && (
        <MediaDetailModal
          media={showMediaModal}
          items={items}
          onClose={() => setShowMediaModal(null)}
          onUpdate={() => {
            setShowMediaModal(null);
            loadData();
            loadMedia();
          }}
        />
      )}
    </div>
  );
};

interface MediaDetailModalProps {
  media: MediaItem;
  items: Item[];
  onClose: () => void;
  onUpdate: () => void;
}

const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  media,
  items,
  onClose,
  onUpdate,
}) => {
  const [selectedItemId, setSelectedItemId] = useState(media.item_id || "");
  const [photoType, setPhotoType] = useState(media.photo_type || "");
  const [saving, setSaving] = useState(false);

  async function handleUpdate(action: "item" | "tag" | "delete") {
    setSaving(true);
    try {
      if (action === "delete") {
        if (!confirm("Are you sure you want to delete this media file?")) {
          setSaving(false);
          return;
        }
        await bulkDeleteMedia([media.id], [media.type]);
        onUpdate();
      } else if (action === "item") {
        if (!selectedItemId) {
          alert("Please select an item");
          setSaving(false);
          return;
        }
        await updateMedia(media.id, media.type, { item_id: selectedItemId });
        onUpdate();
      } else if (action === "tag") {
        await updateMedia(media.id, media.type, { photo_type: photoType });
        onUpdate();
      }
    } catch (err: any) {
      alert(`Failed to update media: ${err.message}`);
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{
        maxWidth: "800px",
        maxHeight: "90vh",
        overflow: "auto"
      }}>
        <div className="modal-header">
          <h2>Media Details</h2>
          <button className="btn-outline" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Media Preview */}
          <div style={{
            marginBottom: "1.5rem",
            backgroundColor: "#000",
            borderRadius: "8px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px"
          }}>
            {media.type === "video" ? (
              <div style={{ color: "white", fontSize: "4rem" }}>🎥</div>
            ) : (
              <img
                src={media.path}
                alt="Media"
                style={{
                  maxWidth: "100%",
                  maxHeight: "500px",
                  objectFit: "contain"
                }}
              />
            )}
          </div>

          {/* Media Info */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "0.5rem 1rem",
            marginBottom: "1.5rem",
            fontSize: "0.875rem"
          }}>
            <strong>Type:</strong>
            <span>{media.type}</span>
            
            <strong>Uploaded:</strong>
            <span>{new Date(media.uploaded_at).toLocaleString()}</span>
            
            {media.item_name && (
              <>
                <strong>Item:</strong>
                <span>{media.item_name}</span>
              </>
            )}
            
            {media.location_name && (
              <>
                <strong>Location:</strong>
                <span>{media.location_name}</span>
              </>
            )}

            {media.photo_type && (
              <>
                <strong>Photo Type:</strong>
                <span>{media.photo_type}</span>
              </>
            )}
          </div>

          {/* Actions */}
          {media.type === "photo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                  Change Item
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    style={{ flex: 1, padding: "0.5rem" }}
                  >
                    <option value="">Select an item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary"
                    onClick={() => handleUpdate("item")}
                    disabled={saving || !selectedItemId}
                  >
                    Update Item
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
                  Change Photo Type/Tag
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    value={photoType}
                    onChange={(e) => setPhotoType(e.target.value)}
                    style={{ flex: 1, padding: "0.5rem" }}
                  >
                    <option value="">None</option>
                    <option value="default">Default</option>
                    <option value="data_tag">Data Tag</option>
                    <option value="receipt">Receipt</option>
                    <option value="warranty">Warranty</option>
                    <option value="optional">Optional</option>
                  </select>
                  <button
                    className="btn-primary"
                    onClick={() => handleUpdate("tag")}
                    disabled={saving}
                  >
                    Update Type
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
            <button
              className="btn-danger"
              onClick={() => handleUpdate("delete")}
              disabled={saving}
              style={{ width: "100%" }}
            >
              🗑️ Delete Media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaManagement;
