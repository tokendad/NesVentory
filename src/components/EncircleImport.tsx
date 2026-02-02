import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { importEncircle, previewEncircle, fetchLocations, type EncircleImportResult, type Location } from "../lib/api";
import { getLocationPath } from "../lib/utils";

interface EncircleImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Allowed image MIME types for import
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Filter files to only include valid image types
const filterValidImages = (files: FileList): File[] => {
  return Array.from(files).filter(file => ALLOWED_IMAGE_TYPES.includes(file.type));
};

const EncircleImport: React.FC<EncircleImportProps> = ({ onClose, onSuccess }) => {
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [matchByName, setMatchByName] = useState(true);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EncircleImportResult | null>(null);
  
  // Parent location options
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedParentLocationId, setSelectedParentLocationId] = useState<string>("");
  const [detectedParentName, setDetectedParentName] = useState<string | null>(null);
  const [useExistingLocation, setUseExistingLocation] = useState(false);
  
  // Image selection mode: 'files' or 'folder'
  const [imageSelectionMode, setImageSelectionMode] = useState<'files' | 'folder'>('files');
  
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Build hierarchical location list for parent dropdown
  const getParentOptions = useMemo(() => {
    const options: { id: string; label: string; depth: number }[] = [];

    // Build tree structure for proper ordering
    const buildOptions = (parentId: string | null, depth: number) => {
      const children = locations.filter(loc =>
        parentId === null
          ? (loc.is_primary_location || !loc.parent_id)
          : loc.parent_id?.toString() === parentId
      );

      // Sort by name for consistent ordering
      children.sort((a, b) => (a.friendly_name || a.name).localeCompare(b.friendly_name || b.name));

      children.forEach(loc => {
        options.push({
          id: loc.id.toString(),
          label: loc.friendly_name || loc.name,
          depth
        });
        buildOptions(loc.id.toString(), depth + 1);
      });
    };

    buildOptions(null, 0);
    return options;
  }, [locations]);

  // Fetch available locations on mount
  useEffect(() => {
    fetchLocations()
      .then((locs) => {
        setLocations(locs);
      })
      .catch((err) => {
        console.error("Failed to fetch locations:", err);
      });
  }, []);

  const handleXlsxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        setXlsxFile(file);
        setError(null);
        setDetectedParentName(null);
        
        // Preview the file to extract parent location name
        setPreviewing(true);
        try {
          const preview = await previewEncircle(file);
          setDetectedParentName(preview.parent_location_name);
        } catch (err: any) {
          console.error("Preview failed:", err);
          // Don't show error to user, just continue without preview
        } finally {
          setPreviewing(false);
        }
      } else {
        setError("Please select a valid XLSX file");
        setXlsxFile(null);
        setDetectedParentName(null);
      }
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setImages(filterValidImages(files));
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setImages(filterValidImages(files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!xlsxFile) {
      setError("Please select an XLSX file to import");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const parentLocationId = useExistingLocation && selectedParentLocationId 
        ? selectedParentLocationId 
        : null;
      const createParentFromFile = !useExistingLocation || !selectedParentLocationId;
      
      const importResult = await importEncircle(
        xlsxFile, 
        images, 
        matchByName,
        parentLocationId,
        createParentFromFile
      );
      setResult(importResult);
      onSuccess();
    } catch (err: any) {
      // Handle structured error response
      let errorMessage = err.message || "Import failed";
      // Only attempt to parse as JSON if it looks like JSON
      if (errorMessage.startsWith('{') || errorMessage.startsWith('[')) {
        try {
          const parsed = JSON.parse(errorMessage);
          if (parsed.message) {
            errorMessage = parsed.message;
            if (parsed.errors && Array.isArray(parsed.errors)) {
              errorMessage += ": " + parsed.errors.join(", ");
            }
          }
        } catch {
          // Not valid JSON, use original message
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearXlsx = () => {
    setXlsxFile(null);
    setDetectedParentName(null);
    if (xlsxInputRef.current) {
      xlsxInputRef.current.value = "";
    }
  };

  const clearImages = () => {
    setImages([]);
    if (imagesInputRef.current) {
      imagesInputRef.current.value = "";
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const handleImageSelectionModeChange = (mode: 'files' | 'folder') => {
    setImageSelectionMode(mode);
    clearImages();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import from Encircle</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        {result ? (
          <div className="import-result">
            <div className={result.quota_exceeded ? "warning-banner" : "success-banner"} style={result.quota_exceeded ? {
              backgroundColor: "#fff3e0",
              border: "1px solid #ffb74d",
              color: "#e65100",
              padding: "0.75rem",
              borderRadius: "4px",
              marginBottom: "1rem"
            } : undefined}>
              {result.message}
            </div>
            
            {/* Quota exceeded warning */}
            {result.quota_exceeded && (
              <div style={{
                backgroundColor: "#e3f2fd",
                border: "1px solid #64b5f6",
                borderRadius: "4px",
                padding: "0.75rem",
                marginBottom: "1rem"
              }}>
                <strong style={{ color: "#1565c0" }}>💡 Tip</strong>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#1565c0" }}>
                  Some items were imported without AI-assisted details due to rate limits. 
                  You can use <strong>User Settings → Enrich from Data Tags</strong> later to fill in missing details 
                  from data tag photos.
                </p>
              </div>
            )}
            
            <div className="import-stats">
              <div className="import-stat">
                <span className="stat-value">{result.items_created}</span>
                <span className="stat-label">Items Created</span>
              </div>
              <div className="import-stat">
                <span className="stat-value">{result.photos_attached}</span>
                <span className="stat-label">Photos Attached</span>
              </div>
              <div className="import-stat">
                <span className="stat-value">{result.locations_created}</span>
                <span className="stat-label">Parent Locations</span>
              </div>
              <div className="import-stat">
                <span className="stat-value">{result.sublocations_created}</span>
                <span className="stat-label">Rooms Created</span>
              </div>
              <div className="import-stat">
                <span className="stat-value">{result.items_without_photos}</span>
                <span className="stat-label">Items Without Photos</span>
              </div>
            </div>
            
            {result.parent_location_name && (
              <div className="import-info">
                <strong>Parent Location:</strong> {result.parent_location_name}
              </div>
            )}
            
            <div className="import-log">
              <h4>Import Log</h4>
              <div className="log-content">
                {result.log.map((line, idx) => (
                  <div key={idx} className="log-line" style={line.includes("⚠️") ? { color: "#e65100", fontWeight: 500 } : undefined}>{line}</div>
                ))}
              </div>
            </div>
            
            <div className="form-actions">
              <button className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="import-form">
            {error && <div className="error-banner">{error}</div>}
            
            <div className="import-section">
              <h3>Step 1: Select Encircle XLSX File</h3>
              <p className="help-text">
                Upload the detailed XLSX export file from Encircle. The file should contain columns like "No." and "Description". 
                The parent location will be extracted from the file header (e.g., "Maine Cottage") and rooms/sub-locations will be created automatically.
              </p>
              
              <div className="file-input-wrapper">
                <input
                  type="file"
                  ref={xlsxInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleXlsxChange}
                  disabled={loading || previewing}
                  id="xlsx-input"
                />
                {xlsxFile && (
                  <div className="file-info">
                    <span className="file-name">{xlsxFile.name}</span>
                    <button
                      type="button"
                      className="file-clear"
                      onClick={clearXlsx}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              
              {previewing && (
                <div className="help-text" style={{ marginTop: '8px', fontStyle: 'italic' }}>
                  Analyzing file...
                </div>
              )}
              
              {detectedParentName && (
                <div className="detected-location" style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  backgroundColor: 'var(--bg-elevated-softer)', 
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text)'
                }}>
                  <strong>📍 Detected Location:</strong> {detectedParentName}
                  <p className="help-text" style={{ margin: '8px 0 0 0' }}>
                    This location will be created as the parent location for all imported items and rooms.
                  </p>
                </div>
              )}
            </div>
            
            <div className="import-section">
              <h3>Step 2: Parent Location</h3>
              <p className="help-text">
                Choose how to handle the parent location for imported items and rooms.
              </p>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useExistingLocation}
                    onChange={(e) => {
                      setUseExistingLocation(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedParentLocationId("");
                      }
                    }}
                    disabled={loading}
                  />
                  <span>Use an existing location as parent</span>
                </label>
              </div>
              
              {useExistingLocation && (
                <div style={{ marginTop: '12px' }}>
                  <select
                    value={selectedParentLocationId}
                    onChange={(e) => setSelectedParentLocationId(e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #ddd)',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select a location...</option>
                    {getParentOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {"—".repeat(opt.depth)}{opt.depth > 0 ? " " : ""}{opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="help-text" style={{ marginTop: '8px' }}>
                    {selectedParentLocationId 
                      ? "Imported rooms will be created as sub-locations under this parent."
                      : "Select an existing location to use as the parent for imported rooms."}
                  </p>
                </div>
              )}
              
              {!useExistingLocation && (
                <p className="help-text" style={{ marginTop: '8px' }}>
                  {detectedParentName 
                    ? `A new parent location "${detectedParentName}" will be created from the file.`
                    : "A new parent location will be created based on the file content."}
                </p>
              )}
            </div>
            
            <div className="import-section">
              <h3>Step 3: Select Images (Optional)</h3>
              <p className="help-text">
                Select image files to attach to items. Images will be matched to items based on their filenames.
              </p>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ marginRight: '16px' }}>
                  <input
                    type="radio"
                    name="imageSelectionMode"
                    value="files"
                    checked={imageSelectionMode === 'files'}
                    onChange={() => handleImageSelectionModeChange('files')}
                    disabled={loading}
                    style={{ marginRight: '4px' }}
                  />
                  Select individual files
                </label>
                <label>
                  <input
                    type="radio"
                    name="imageSelectionMode"
                    value="folder"
                    checked={imageSelectionMode === 'folder'}
                    onChange={() => handleImageSelectionModeChange('folder')}
                    disabled={loading}
                    style={{ marginRight: '4px' }}
                  />
                  All images in folder
                </label>
              </div>
              
              <div className="file-input-wrapper">
                {imageSelectionMode === 'files' ? (
                  <input
                    type="file"
                    ref={imagesInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
                    disabled={loading}
                    id="images-input"
                  />
                ) : (
                  <input
                    type="file"
                    ref={folderInputRef}
                    // @ts-expect-error webkitdirectory is not in React's type definitions
                    webkitdirectory=""
                    multiple
                    onChange={handleFolderChange}
                    disabled={loading}
                    id="folder-input"
                  />
                )}
                {images.length > 0 && (
                  <div className="file-info">
                    <span className="file-name">{images.length} image(s) selected</span>
                    <button
                      type="button"
                      className="file-clear"
                      onClick={clearImages}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="import-section">
              <h3>Image Matching Options</h3>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={matchByName}
                    onChange={(e) => setMatchByName(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Match images by item description (recommended)</span>
                </label>
                <p className="help-text">
                  {matchByName
                    ? "Images will be matched if their filename contains the item description (e.g., 'living_room_sofa.jpg' matches item 'Sofa'). Falls back to number prefix matching if no name match is found."
                    : "Images will only be matched by their numeric prefix (e.g., '0003_photo.jpg' matches item #3)."}
                </p>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                className="btn-outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !xlsxFile || previewing}
              >
                {loading ? "Importing..." : "Import"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EncircleImport;
