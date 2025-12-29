import React, { useState, useRef } from "react";
import { 
  detectItemsFromImage, 
  DetectionResult, 
  DetectedItem,
  getAIStatus
} from "../lib/api";
import { ItemCreate } from "../lib/api";
import { PHOTO_TYPES } from "../lib/constants";

interface AddItemModalProps {
  onClose: () => void;
  onContinue: (itemData: Partial<ItemCreate> | null, initialPhoto: File | null) => void;
}

type Mode = "select" | "detecting" | "review";

const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onContinue }) => {
  const [mode, setMode] = useState<Mode>("select");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Check AI status on mount
  React.useEffect(() => {
    getAIStatus()
      .then(status => setAiEnabled(status.enabled))
      .catch(() => setAiEnabled(false));
  }, []);

  const handleManualEntry = () => {
    onContinue(null, null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    if (aiEnabled) {
      setMode("detecting");
      setLoading(true);
      setError(null);
      
      try {
        const result = await detectItemsFromImage(file);
        if (result.items.length > 0) {
          setDetectionResult(result);
          setMode("review");
        } else {
          // No items detected, go straight to manual but keep the photo
          setError("No items detected by AI. Proceeding to manual entry.");
          // Small delay to let user see the error
          setTimeout(() => {
             onContinue(null, file);
          }, 2000);
        }
      } catch (err: any) {
        setError(err.message || "AI detection failed");
        // Proceed to manual entry on error after delay
        setTimeout(() => {
          onContinue(null, file);
        }, 2000);
      } finally {
        setLoading(false);
      }
    } else {
      // AI not enabled, go straight to form with photo
      onContinue(null, file);
    }
  };

  const handleAcceptResult = (item: DetectedItem) => {
    // Convert DetectedItem to ItemCreate (partial)
    const itemData: Partial<ItemCreate> = {
      name: item.name,
      description: item.description || "",
      brand: item.brand || "",
      estimated_value: item.estimated_value || undefined,
      estimated_value_ai_date: item.estimation_date || undefined
    };
    onContinue(itemData, selectedFile);
  };

  const handleRejectAll = () => {
    // Proceed with just the photo
    onContinue(null, selectedFile);
  };

  // Cleanup preview on unmount
  React.useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  if (mode === "select") {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
          <div className="modal-header">
            <h2>Add New Item</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          
          <div className="add-item-options" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
            {/* Camera Option */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <button 
              className="btn-outline" 
              style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
              onClick={() => cameraInputRef.current?.click()}
            >
              📷 Take Photo
            </button>

            {/* File Upload Option */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <button 
              className="btn-outline"
              style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Import from File
            </button>

            {/* Manual Entry Option */}
            <button 
              className="btn-primary"
              style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem' }}
              onClick={handleManualEntry}
            >
              📝 Edit Manually
            </button>
          </div>
          
          {!aiEnabled && (
            <p className="help-text" style={{ textAlign: 'center', fontStyle: 'italic' }}>
              Note: AI detection is not configured. Photos will be attached but not analyzed.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (mode === "detecting") {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
          <h3>Analyzing Image...</h3>
          {imagePreview && (
            <div style={{ margin: '1rem 0', borderRadius: '8px', overflow: 'hidden' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }} />
            </div>
          )}
          <div className="loading-spinner" style={{ fontSize: '2rem', margin: '1rem 0' }}>🔄</div>
          <p>Please wait while AI identifies the item.</p>
        </div>
      </div>
    );
  }

  if (mode === "review" && detectionResult) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Review AI Results</h2>
            <button className="modal-close" onClick={handleRejectAll}>✕</button>
          </div>

          <div style={{ marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-elevated-softer)', textAlign: 'center' }}>
             {imagePreview && (
                <img src={imagePreview} alt="Captured" style={{ maxHeight: '200px', maxWidth: '100%' }} />
             )}
          </div>

          <p style={{ marginBottom: '1rem' }}>Select the best match to pre-fill the form:</p>

          <div className="detection-results" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
            {detectionResult.items.map((item, index) => (
              <div 
                key={index} 
                className="result-card"
                style={{ 
                   border: '1px solid var(--border-panel)', 
                   borderRadius: '8px', 
                   padding: '1rem',
                   background: 'var(--bg-elevated)',
                   display: 'flex',
                   flexDirection: 'column',
                   gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent)' }}>{item.name}</h4>
                  {item.confidence && (
                    <span className="badge" style={{ 
                      fontSize: '0.75rem', 
                      background: item.confidence > 0.8 ? 'var(--success)' : 'var(--warning, #f59e0b)',
                      color: '#000',
                      padding: '0.1rem 0.4rem', 
                      borderRadius: '4px'
                    }}>
                      {Math.round(item.confidence * 100)}% Match
                    </span>
                  )}
                </div>
                
                {item.description && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{item.description}</p>}
                
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                  {item.brand && <span><strong>Brand:</strong> {item.brand}</span>}
                  {item.estimated_value && <span><strong>Value:</strong> ${item.estimated_value}</span>}
                </div>

                <button 
                  className="btn-primary" 
                  style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                  onClick={() => handleAcceptResult(item)}
                >
                  Accept This Match
                </button>
              </div>
            ))}
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', justifyContent: 'space-between' }}>
            <button className="btn-outline" onClick={handleRejectAll}>
              Reject All (Edit Manually)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AddItemModal;
