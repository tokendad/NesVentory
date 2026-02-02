import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { importCSV, fetchLocations, type CSVImportResult, type Location } from "../lib/api";
import { getLocationPath } from "../lib/utils";

interface CSVImportProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CSVImport: React.FC<CSVImportProps> = ({ onClose, onSuccess }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CSVImportResult | null>(null);
  
  // Parent location options
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedParentLocationId, setSelectedParentLocationId] = useState<string>("");
  const [useParentLocation, setUseParentLocation] = useState(false);
  const [createLocations, setCreateLocations] = useState(true);
  
  const csvInputRef = useRef<HTMLInputElement>(null);

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

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.csv')) {
        setCsvFile(file);
        setError(null);
      } else {
        setError("Please select a valid CSV file");
        setCsvFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvFile) {
      setError("Please select a CSV file to import");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const parentLocationId = useParentLocation && selectedParentLocationId 
        ? selectedParentLocationId 
        : null;
      
      const importResult = await importCSV(
        csvFile, 
        parentLocationId,
        createLocations
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

  const clearCsv = () => {
    setCsvFile(null);
    if (csvInputRef.current) {
      csvInputRef.current.value = "";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import from CSV</h2>
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
              {result.photos_failed > 0 && (
                <div className="import-stat">
                  <span className="stat-value" style={{ color: 'var(--color-warning)' }}>{result.photos_failed}</span>
                  <span className="stat-label">Photos Failed</span>
                </div>
              )}
              <div className="import-stat">
                <span className="stat-value">{result.locations_created}</span>
                <span className="stat-label">Locations Created</span>
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
              <h3>Step 1: Select CSV File</h3>
              <p className="help-text">
                Upload a CSV file containing your inventory items. The CSV should have a 'name' or 'item' column at minimum.
                You can also include columns for location, brand, model, serial number, purchase information, and image URLs.
              </p>
              <p className="help-text">
                <strong>Supported columns:</strong> name, description, location, brand, model, serial, 
                purchase_price, purchase_date, retailer, estimated_value, image_url, image_urls, upc, warranty_duration
              </p>
              <p className="help-text">
                <strong>Image URLs:</strong> Use the 'image_url' column for a single image URL, or 'image_urls' for multiple URLs 
                separated by semicolons (;) or pipes (|). Images will be downloaded automatically.
              </p>
              
              <div className="file-input-wrapper">
                <input
                  type="file"
                  ref={csvInputRef}
                  accept=".csv"
                  onChange={handleCsvChange}
                  disabled={loading}
                  id="csv-input"
                />
                {csvFile && (
                  <div className="file-info">
                    <span className="file-name">{csvFile.name}</span>
                    <button
                      type="button"
                      className="file-clear"
                      onClick={clearCsv}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="import-section">
              <h3>Step 2: Location Options</h3>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={createLocations}
                    onChange={(e) => setCreateLocations(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Automatically create locations from CSV</span>
                </label>
                <p className="help-text">
                  {createLocations
                    ? "Locations specified in the CSV that don't exist will be created automatically."
                    : "Only existing locations will be used. Items with non-existent locations will not be assigned a location."}
                </p>
              </div>
              
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useParentLocation}
                    onChange={(e) => {
                      setUseParentLocation(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedParentLocationId("");
                      }
                    }}
                    disabled={loading}
                  />
                  <span>Use a parent location for new locations</span>
                </label>
              </div>
              
              {useParentLocation && (
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
                    <option value="">Select a parent location...</option>
                    {getParentOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {"—".repeat(opt.depth)}{opt.depth > 0 ? " " : ""}{opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="help-text" style={{ marginTop: '8px' }}>
                    {selectedParentLocationId 
                      ? "New locations from the CSV will be created as sub-locations under this parent."
                      : "Select an existing location to use as the parent for new locations."}
                  </p>
                </div>
              )}
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
                disabled={loading || !csvFile}
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

export default CSVImport;
