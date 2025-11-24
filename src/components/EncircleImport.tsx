import React, { useState, useRef } from "react";
import { importEncircle, type EncircleImportResult } from "../lib/api";

interface EncircleImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EncircleImport: React.FC<EncircleImportProps> = ({ onClose, onSuccess }) => {
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [matchByName, setMatchByName] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EncircleImportResult | null>(null);
  
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const handleXlsxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        setXlsxFile(file);
        setError(null);
      } else {
        setError("Please select a valid XLSX file");
        setXlsxFile(null);
      }
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const validImages: File[] = [];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      for (let i = 0; i < files.length; i++) {
        if (allowedTypes.includes(files[i].type)) {
          validImages.push(files[i]);
        }
      }
      
      setImages(validImages);
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
      const importResult = await importEncircle(xlsxFile, images, matchByName);
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
    if (xlsxInputRef.current) {
      xlsxInputRef.current.value = "";
    }
  };

  const clearImages = () => {
    setImages([]);
    if (imagesInputRef.current) {
      imagesInputRef.current.value = "";
    }
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
            <div className="success-banner">
              {result.message}
            </div>
            
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
                <span className="stat-label">Locations Created</span>
              </div>
              <div className="import-stat">
                <span className="stat-value">{result.items_without_photos}</span>
                <span className="stat-label">Items Without Photos</span>
              </div>
            </div>
            
            <div className="import-log">
              <h4>Import Log</h4>
              <div className="log-content">
                {result.log.map((line, idx) => (
                  <div key={idx} className="log-line">{line}</div>
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
              </p>
              
              <div className="file-input-wrapper">
                <input
                  type="file"
                  ref={xlsxInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleXlsxChange}
                  disabled={loading}
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
            </div>
            
            <div className="import-section">
              <h3>Step 2: Select Images (Optional)</h3>
              <p className="help-text">
                Select image files to attach to items. Images will be matched to items based on their filenames.
              </p>
              
              <div className="file-input-wrapper">
                <input
                  type="file"
                  ref={imagesInputRef}
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  disabled={loading}
                  id="images-input"
                />
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
                disabled={loading || !xlsxFile}
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
