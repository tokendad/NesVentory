import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ItemCreate, Location, Tag, ContactInfo, DataTagInfo, AIStatusResponse, BarcodeLookupResult, BarcodeScanResult, Warranty } from "../lib/api";
import { uploadPhoto, fetchTags, createTag, parseDataTagImage, getAIStatus, lookupBarcode, scanBarcodeImage } from "../lib/api";
import { formatPhotoType, getLocationPath } from "../lib/utils";
import { PHOTO_TYPES, ALLOWED_PHOTO_MIME_TYPES, LIVING_TAG_NAME, RELATIONSHIP_LABELS } from "../lib/constants";
import type { PhotoUpload } from "../lib/types";

// Tab type for the form
type TabId = "basic" | "warranty" | "media";

interface ItemFormProps {
  onSubmit: (item: ItemCreate, photos: PhotoUpload[]) => Promise<void>;
  onCancel: () => void;
  locations: Location[];
  initialData?: Partial<ItemCreate> & { tags?: Tag[]; warranties?: Warranty[] };
  isEditing?: boolean;
  currentUserId?: string;
  currentUserName?: string;
}

// Get current date in YYYY-MM-DD format for new items
const getCurrentDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Get current date in MM/DD/YY format for display
const getCurrentDisplayDate = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const year = String(today.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
};

const ItemForm: React.FC<ItemFormProps> = ({
  onSubmit,
  onCancel,
  locations,
  initialData,
  isEditing = false,
  currentUserId,
  currentUserName,
}) => {
  const [formData, setFormData] = useState<ItemCreate>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    brand: initialData?.brand || "",
    model_number: initialData?.model_number || "",
    serial_number: initialData?.serial_number || "",
    purchase_date: initialData?.purchase_date || (!isEditing ? getCurrentDate() : ""),
    purchase_price: initialData?.purchase_price || undefined,
    estimated_value: initialData?.estimated_value || undefined,
    estimated_value_ai_date: initialData?.estimated_value_ai_date || undefined,
    estimated_value_user_date: initialData?.estimated_value_user_date || undefined,
    estimated_value_user_name: initialData?.estimated_value_user_name || undefined,
    retailer: initialData?.retailer || "",
    upc: initialData?.upc || "",
    location_id: initialData?.location_id || null,
    tag_ids: initialData?.tags?.map(t => t.id) || [],
    // Living item fields
    is_living: initialData?.is_living || false,
    birthdate: initialData?.birthdate || "",
    contact_info: initialData?.contact_info || null,
    relationship_type: initialData?.relationship_type || "",
    is_current_user: initialData?.is_current_user || false,
    associated_user_id: initialData?.associated_user_id || null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  
  // AI Data Tag scanning state
  const [aiStatus, setAIStatus] = useState<AIStatusResponse | null>(null);
  const [scanningDataTag, setScanningDataTag] = useState(false);
  const [dataTagResult, setDataTagResult] = useState<DataTagInfo | null>(null);
  const dataTagInputRef = useRef<HTMLInputElement>(null);
  
  // Barcode lookup state
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeLookupResult | null>(null);
  
  // Barcode scanning state (mobile camera)
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const barcodeScanInputRef = useRef<HTMLInputElement>(null);

  // Tab state for non-mobile view
  const [activeTab, setActiveTab] = useState<TabId>("basic");

  // Warranty state
  const [warranties, setWarranties] = useState<Warranty[]>(
    initialData?.warranties || []
  );

  // Memoize the Living tag ID to avoid recalculating on every render
  const livingTagId = useMemo(() => {
    const livingTag = availableTags.find(t => t.name === LIVING_TAG_NAME);
    return livingTag?.id || null;
  }, [availableTags]);

  // Check if Living tag is selected (memoized)
  const isLivingItemSelected = useMemo(() => {
    if (!livingTagId) return false;
    return (formData.tag_ids || []).includes(livingTagId);
  }, [livingTagId, formData.tag_ids]);

  // Load tags and AI status on mount
  useEffect(() => {
    fetchTags()
      .then(setAvailableTags)
      .catch(err => console.error("Failed to load tags:", err));
    
    // Check AI status for data tag scanning feature
    getAIStatus()
      .then(setAIStatus)
      .catch(() => setAIStatus({ enabled: false }));
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    };
  }, [photos]);

  // Update is_living flag and clear irrelevant fields when switching between living/non-living modes.
  // This is intentional behavior: Living items (people, pets, plants) don't have purchase dates, 
  // brands, etc., while non-living items don't have birthdates, relationships, or contact info.
  // The field clearing ensures clean data and prevents confusion.
  useEffect(() => {
    if (isLivingItemSelected !== formData.is_living) {
      setFormData(prev => ({
        ...prev,
        is_living: isLivingItemSelected,
        // Clear non-living fields when switching to living mode
        ...(isLivingItemSelected ? {
          purchase_date: "",
          purchase_price: undefined,
          brand: "",
          model_number: "",
          serial_number: "",
          retailer: "",
          upc: "",
        } : {
          // Clear living fields when switching to non-living mode
          birthdate: "",
          contact_info: null,
          relationship_type: "",
          is_current_user: false,
          associated_user_id: null,
        })
      }));
    }
  }, [isLivingItemSelected, formData.is_living]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => {
      const updates: Partial<ItemCreate> = {
        [name]:
          type === "checkbox"
            ? checked
            : name === "purchase_price" || name === "estimated_value"
            ? value === ""
              ? undefined
              : parseFloat(value)
            : name === "location_id"
            ? value === ""
              ? null
              : value
            : value,
      };
      
      // When user changes the estimated value, clear AI date and set user info
      if (name === "estimated_value") {
        updates.estimated_value_ai_date = undefined;
        // Only set user info if there's a value
        if (value !== "") {
          updates.estimated_value_user_date = getCurrentDisplayDate();
          updates.estimated_value_user_name = currentUserName || "Unknown";
        } else {
          updates.estimated_value_user_date = undefined;
          updates.estimated_value_user_name = undefined;
        }
      }
      
      return { ...prev, ...updates };
    });
  };

  const handleContactInfoChange = (field: keyof ContactInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      contact_info: value 
        ? { ...prev.contact_info, [field]: value } 
        : { ...prev.contact_info, [field]: null }
    }));
  };

  const handleIsCurrentUserChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      is_current_user: checked,
      relationship_type: checked ? "self" : prev.relationship_type,
      // When unchecking, clear the associated_user_id since the item is no longer associated with the current user
      associated_user_id: checked ? (currentUserId || null) : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Sanitize form data before submission:
      // Convert empty strings to null for fields that expect dates or UUIDs
      // to prevent Pydantic validation errors on the backend
      const sanitizedData: ItemCreate = {
        ...formData,
        purchase_date: formData.purchase_date === '' ? null : formData.purchase_date,
        birthdate: formData.birthdate === '' ? null : formData.birthdate,
        location_id: formData.location_id === '' ? null : formData.location_id,
        associated_user_id: formData.associated_user_id === '' ? null : formData.associated_user_id,
        warranties: warranties.length > 0 ? warranties : undefined,
      };
      await onSubmit(sanitizedData, photos);
    } catch (err: any) {
      setError(err.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoUpload[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Validate file type
      if (ALLOWED_PHOTO_MIME_TYPES.includes(file.type)) {
        const preview = URL.createObjectURL(file);
        newPhotos.push({ file, preview, type });
      } else {
        const allowedTypes = ALLOWED_PHOTO_MIME_TYPES.map(mt => mt.replace('image/', '')).join(', ').toUpperCase();
        setError(`Invalid file type: ${file.name}. Allowed types: ${allowedTypes}`);
      }
    }

    // For default, data_tag, and profile types, only one photo is allowed
    // Remove any existing photos of the same type before adding new ones
    if (type === PHOTO_TYPES.DEFAULT || type === PHOTO_TYPES.DATA_TAG || type === PHOTO_TYPES.PROFILE) {
      setPhotos((prev) => {
        // Revoke URLs for photos being removed
        prev.filter(p => p.type === type).forEach(p => URL.revokeObjectURL(p.preview));
        // Remove existing photos of this type and add new one
        return [...prev.filter(p => p.type !== type), ...newPhotos];
      });
    } else {
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => {
      const currentTags = prev.tag_ids || [];
      const isSelected = currentTags.includes(tagId);
      return {
        ...prev,
        tag_ids: isSelected
          ? currentTags.filter(id => id !== tagId)
          : [...currentTags, tagId]
      };
    });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const tag = await createTag(newTagName.trim());
      setAvailableTags(prev => [...prev, tag]);
      setFormData(prev => ({
        ...prev,
        tag_ids: [...(prev.tag_ids || []), tag.id]
      }));
      setNewTagName("");
    } catch (err: any) {
      setError(err.message || "Failed to create tag");
    }
  };

  // Handle data tag scan - triggers file input
  const handleDataTagScan = () => {
    dataTagInputRef.current?.click();
  };

  // Handle data tag file selection and AI parsing
  const handleDataTagFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    
    const file = files[0];
    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }
    
    // Also add this as the data tag photo
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => {
      // Revoke URLs for existing data tag photos
      prev.filter(p => p.type === PHOTO_TYPES.DATA_TAG).forEach(p => URL.revokeObjectURL(p.preview));
      // Remove existing data tag photos and add new one
      return [...prev.filter(p => p.type !== PHOTO_TYPES.DATA_TAG), { file, preview, type: PHOTO_TYPES.DATA_TAG }];
    });
    
    // Parse the data tag with AI
    setScanningDataTag(true);
    setError(null);
    setDataTagResult(null);
    
    try {
      const result = await parseDataTagImage(file);
      setDataTagResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to parse data tag image");
    } finally {
      setScanningDataTag(false);
      // Reset the input so the same file can be selected again
      if (dataTagInputRef.current) {
        dataTagInputRef.current.value = "";
      }
    }
  };

  // Apply parsed data tag info to form fields
  const applyDataTagInfo = (info: DataTagInfo) => {
    setFormData(prev => ({
      ...prev,
      brand: info.brand || info.manufacturer || prev.brand,
      model_number: info.model_number || prev.model_number,
      serial_number: info.serial_number || prev.serial_number,
      // Only apply estimated value if it's provided by AI and there's no existing value
      estimated_value: info.estimated_value ?? prev.estimated_value,
      // Set AI date if value came from AI, otherwise preserve existing value
      estimated_value_ai_date: info.estimated_value ? info.estimation_date : prev.estimated_value_ai_date,
      // Clear user date if value came from AI
      estimated_value_user_date: info.estimated_value ? undefined : prev.estimated_value_user_date,
      estimated_value_user_name: info.estimated_value ? undefined : prev.estimated_value_user_name,
    }));
    setDataTagResult(null);
  };

  // Dismiss data tag result without applying
  const dismissDataTagResult = () => {
    setDataTagResult(null);
  };

  // Handle barcode lookup
  const handleBarcodeLookup = async () => {
    const upc = formData.upc?.trim();
    if (!upc) {
      setError("Please enter a UPC/barcode to look up");
      return;
    }
    
    setLookingUpBarcode(true);
    setError(null);
    setBarcodeResult(null);
    
    try {
      const result = await lookupBarcode(upc);
      setBarcodeResult(result);
    } catch (err: any) {
      setError(err.message || "Failed to look up barcode");
    } finally {
      setLookingUpBarcode(false);
    }
  };

  // Apply barcode lookup result to form fields
  const applyBarcodeResult = (result: BarcodeLookupResult) => {
    setFormData(prev => ({
      ...prev,
      name: result.name || prev.name,
      description: result.description || prev.description,
      brand: result.brand || prev.brand,
      model_number: result.model_number || prev.model_number,
      // Only apply estimated value if it's provided by AI and there's no existing value
      estimated_value: result.estimated_value ?? prev.estimated_value,
      // Set AI date if value came from AI, otherwise preserve existing value
      estimated_value_ai_date: result.estimated_value ? result.estimation_date : prev.estimated_value_ai_date,
      // Clear user date if value came from AI
      estimated_value_user_date: result.estimated_value ? undefined : prev.estimated_value_user_date,
      estimated_value_user_name: result.estimated_value ? undefined : prev.estimated_value_user_name,
    }));
    setBarcodeResult(null);
  };

  // Dismiss barcode result without applying
  const dismissBarcodeResult = () => {
    setBarcodeResult(null);
  };

  // Handle barcode scan - triggers file input (mobile camera)
  const handleBarcodeScan = () => {
    barcodeScanInputRef.current?.click();
  };

  // Handle barcode image capture and AI parsing
  const handleBarcodeScanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files[0]) return;
    
    const file = files[0];
    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.type)) {
      setError("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }
    
    // Parse the barcode from the image
    setScanningBarcode(true);
    setError(null);
    
    try {
      const result = await scanBarcodeImage(file);
      if (result.found && result.upc) {
        // Update the UPC field with the scanned value
        const scannedUpc = result.upc;  // Capture in local variable for closure
        setFormData(prev => ({
          ...prev,
          upc: scannedUpc
        }));
      } else {
        setError("Could not read barcode from image. Please try again with a clearer photo.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to scan barcode image");
    } finally {
      setScanningBarcode(false);
      // Reset the input so the same file can be selected again
      if (barcodeScanInputRef.current) {
        barcodeScanInputRef.current.value = "";
      }
    }
  };

  // Warranty handlers
  const addWarranty = (type: 'manufacturer' | 'extended') => {
    setWarranties(prev => [...prev, { type }]);
  };

  const removeWarranty = (index: number) => {
    setWarranties(prev => prev.filter((_, i) => i !== index));
  };

  const updateWarranty = <K extends keyof Warranty>(
    index: number,
    field: K,
    value: Warranty[K]
  ) => {
    setWarranties(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const livingMode = isLivingItemSelected;

  // Render content for Tab 1: Basic Item Information
  const renderBasicInfoTab = () => (
    <div className="tab-content">
      {/* Tags Section - Always visible */}
      <div className="form-section">
        <h3>Tags</h3>
        <p className="help-text">Select "Living" tag for people, pets, plants, or other living things</p>
        <div className="tags-selection">
          {availableTags.map((tag) => (
            <label key={tag.id} className="tag-checkbox">
              <input
                type="checkbox"
                checked={(formData.tag_ids || []).includes(tag.id)}
                onChange={() => handleTagToggle(tag.id)}
                disabled={loading}
              />
              <span className={tag.is_predefined ? "tag-predefined" : "tag-custom"}>
                {tag.name}
              </span>
            </label>
          ))}
        </div>
        <div className="new-tag-input">
          <input
            type="text"
            placeholder="Create new tag..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateTag())}
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleCreateTag}
            disabled={loading || !newTagName.trim()}
            className="btn-outline"
          >
            Add Tag
          </button>
        </div>
      </div>
      
      {/* Name and Description - Always visible */}
      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          disabled={loading}
          placeholder={livingMode ? "Person/Pet/Plant name" : "Item name"}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description || ""}
          onChange={handleChange}
          rows={3}
          disabled={loading}
          placeholder={livingMode ? "Notes about this person, pet, or plant" : "Item description"}
        />
      </div>

      {/* Living Item Fields */}
      {livingMode && (
        <div className="form-section living-section">
          <h3>Living Item Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="relationship_type">Relationship</label>
              <select
                id="relationship_type"
                name="relationship_type"
                value={formData.relationship_type || ""}
                onChange={handleChange}
                disabled={loading || formData.is_current_user}
              >
                <option value="">-- Select Relationship --</option>
                {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="birthdate">Birthdate</label>
              <input
                type="date"
                id="birthdate"
                name="birthdate"
                value={formData.birthdate || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          {currentUserId && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.is_current_user || false}
                  onChange={(e) => handleIsCurrentUserChange(e.target.checked)}
                  disabled={loading}
                />
                <span>This is me (associate with my account)</span>
              </label>
            </div>
          )}

          <div className="form-section contact-section">
            <h4>Contact Information</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact_phone">Phone</label>
                <input
                  type="tel"
                  id="contact_phone"
                  value={formData.contact_info?.phone || ""}
                  onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                  disabled={loading}
                  placeholder="Phone number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact_email">Email</label>
                <input
                  type="email"
                  id="contact_email"
                  value={formData.contact_info?.email || ""}
                  onChange={(e) => handleContactInfoChange('email', e.target.value)}
                  disabled={loading}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="contact_address">Address</label>
              <input
                type="text"
                id="contact_address"
                value={formData.contact_info?.address || ""}
                onChange={(e) => handleContactInfoChange('address', e.target.value)}
                disabled={loading}
                placeholder="Address"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact_notes">Contact Notes</label>
              <textarea
                id="contact_notes"
                value={formData.contact_info?.notes || ""}
                onChange={(e) => handleContactInfoChange('notes', e.target.value)}
                rows={2}
                disabled={loading}
                placeholder="Additional contact notes"
              />
            </div>
          </div>
        </div>
      )}

      {/* Non-Living Item Fields */}
      {!livingMode && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="brand">Brand</label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="model_number">Model Number</label>
              <input
                type="text"
                id="model_number"
                name="model_number"
                value={formData.model_number || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="serial_number">Serial Number</label>
              <input
                type="text"
                id="serial_number"
                name="serial_number"
                value={formData.serial_number || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="upc">UPC / Barcode</label>
              <div className="upc-input-wrapper">
                <input
                  type="text"
                  id="upc"
                  name="upc"
                  value={formData.upc || ""}
                  onChange={handleChange}
                  disabled={loading || lookingUpBarcode || scanningBarcode}
                  placeholder="Enter UPC/barcode"
                />
                {aiStatus?.enabled && (
                  <>
                    {/* Hidden file input for barcode camera scanning */}
                    <input
                      type="file"
                      ref={barcodeScanInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleBarcodeScanFileChange}
                      disabled={loading || scanningBarcode}
                      style={{ display: "none" }}
                    />
                    <button
                      type="button"
                      className="btn-outline btn-barcode-scan"
                      onClick={handleBarcodeScan}
                      disabled={loading || scanningBarcode}
                      title="Scan barcode with camera"
                    >
                      {scanningBarcode ? "🔄" : "📷"}
                    </button>
                    <button
                      type="button"
                      className="btn-outline btn-barcode-lookup"
                      onClick={handleBarcodeLookup}
                      disabled={loading || lookingUpBarcode || !formData.upc?.trim()}
                      title="Look up product info from UPC/barcode using AI"
                    >
                      {lookingUpBarcode ? "🔄 Looking up..." : "🤖 AI Scan"}
                    </button>
                  </>
                )}
              </div>
              {aiStatus?.enabled && (
                <span className="help-text">Tap 📷 to scan barcode with camera, or enter manually and use AI Scan</span>
              )}
            </div>
          </div>

          {/* Barcode Lookup Results */}
          {barcodeResult && (
            <div className="barcode-lookup-result">
              {barcodeResult.found ? (
                <>
                  <h4>📦 Product Found</h4>
                  <div className="barcode-result-fields">
                    {barcodeResult.name && (
                      <div className="barcode-result-field">
                        <span className="field-label">Product:</span>
                        <span className="field-value">{barcodeResult.name}</span>
                      </div>
                    )}
                    {barcodeResult.brand && (
                      <div className="barcode-result-field">
                        <span className="field-label">Brand:</span>
                        <span className="field-value">{barcodeResult.brand}</span>
                      </div>
                    )}
                    {barcodeResult.model_number && (
                      <div className="barcode-result-field">
                        <span className="field-label">Model:</span>
                        <span className="field-value">{barcodeResult.model_number}</span>
                      </div>
                    )}
                    {barcodeResult.category && (
                      <div className="barcode-result-field">
                        <span className="field-label">Category:</span>
                        <span className="field-value">{barcodeResult.category}</span>
                      </div>
                    )}
                    {barcodeResult.description && (
                      <div className="barcode-result-field">
                        <span className="field-label">Description:</span>
                        <span className="field-value">{barcodeResult.description}</span>
                      </div>
                    )}
                    {barcodeResult.estimated_value != null && (
                      <div className="barcode-result-field">
                        <span className="field-label">Est. Value:</span>
                        <span className="field-value">${barcodeResult.estimated_value.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="barcode-result-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={dismissBarcodeResult}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => applyBarcodeResult(barcodeResult)}
                    >
                      Apply to Form
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h4>❌ Product Not Found</h4>
                  <p className="no-result-message">
                    Could not identify a product for this UPC/barcode. The barcode may not be in our knowledge base.
                  </p>
                  <div className="barcode-result-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={dismissBarcodeResult}
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="purchase_date">Purchase Date</label>
              <input
                type="date"
                id="purchase_date"
                name="purchase_date"
                value={formData.purchase_date || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="retailer">Retailer</label>
              <input
                type="text"
                id="retailer"
                name="retailer"
                value={formData.retailer || ""}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="purchase_price">Purchase Price</label>
              <input
                type="number"
                id="purchase_price"
                name="purchase_price"
                value={formData.purchase_price ?? ""}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="estimated_value">Estimated Value</label>
              <input
                type="number"
                id="estimated_value"
                name="estimated_value"
                value={formData.estimated_value ?? ""}
                onChange={handleChange}
                step="0.01"
                min="0"
                disabled={loading}
              />
              {formData.estimated_value_ai_date && (
                <span className="help-text ai-estimate-note">
                  ℹ️ AI best guess on date: {formData.estimated_value_ai_date}
                </span>
              )}
              {formData.estimated_value_user_date && formData.estimated_value_user_name && (
                <span className="help-text user-estimate-note">
                  ℹ️ User supplied value by {formData.estimated_value_user_name} on date: {formData.estimated_value_user_date}
                </span>
              )}
            </div>
          </div>

          {/* Primary Photo in Basic Tab */}
          <div className="form-section">
            <h3>Primary Photo</h3>
            <div className="photo-type-upload">
              <label htmlFor="photo-default">Default/Primary Photo</label>
              <input
                type="file"
                id="photo-default"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.DEFAULT)}
                disabled={loading}
              />
              <span className="help-text">Primary photo for the item</span>
            </div>
          </div>
        </>
      )}

      {/* Location - Always visible */}
      <div className="form-group">
        <label htmlFor="location_id">Location</label>
        <select
          id="location_id"
          name="location_id"
          value={formData.location_id?.toString() || ""}
          onChange={handleChange}
          disabled={loading}
        >
          <option value="">-- No Location --</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id.toString()}>
              {getLocationPath(location.id, locations)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // Render content for Tab 2: Warranty Information
  const renderWarrantyTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h3>Warranty Information</h3>
        <p className="help-text">Add manufacturer or extended warranty information for this item</p>
        
        {warranties.map((warranty, index) => (
          <div key={index} className="warranty-form-item">
            <div className="warranty-header">
              <h4>{warranty.type === 'manufacturer' ? '🏭 Manufacturer Warranty' : '📋 Extended Warranty'}</h4>
              <button
                type="button"
                className="btn-outline btn-small btn-danger-outline"
                onClick={() => removeWarranty(index)}
                disabled={loading}
              >
                Remove
              </button>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Provider / Company</label>
                <input
                  type="text"
                  value={warranty.provider || ""}
                  onChange={(e) => updateWarranty(index, 'provider', e.target.value || null)}
                  disabled={loading}
                  placeholder="Warranty provider name"
                />
              </div>
              <div className="form-group">
                <label>Policy Number</label>
                <input
                  type="text"
                  value={warranty.policy_number || ""}
                  onChange={(e) => updateWarranty(index, 'policy_number', e.target.value || null)}
                  disabled={loading}
                  placeholder="Policy or contract number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duration (months)</label>
                <input
                  type="number"
                  value={warranty.duration_months ?? ""}
                  onChange={(e) => updateWarranty(index, 'duration_months', e.target.value ? parseInt(e.target.value) : null)}
                  disabled={loading}
                  min="0"
                  placeholder="Duration in months"
                />
              </div>
              <div className="form-group">
                <label>Expiration Date</label>
                <input
                  type="date"
                  value={warranty.expiration_date || ""}
                  onChange={(e) => updateWarranty(index, 'expiration_date', e.target.value || null)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={warranty.notes || ""}
                onChange={(e) => updateWarranty(index, 'notes', e.target.value || null)}
                disabled={loading}
                rows={2}
                placeholder="Additional warranty notes, phone numbers, contact info..."
              />
            </div>
          </div>
        ))}

        <div className="warranty-add-buttons">
          <button
            type="button"
            className="btn-outline"
            onClick={() => addWarranty('manufacturer')}
            disabled={loading}
          >
            + Add Manufacturer Warranty
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={() => addWarranty('extended')}
            disabled={loading}
          >
            + Add Extended Warranty
          </button>
        </div>
      </div>

      {/* Warranty Photos */}
      <div className="form-section">
        <h3>Warranty Photos</h3>
        <div className="photo-type-upload">
          <label htmlFor="photo-warranty">Warranty Documents</label>
          <input
            type="file"
            id="photo-warranty"
            accept="image/*"
            onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.WARRANTY)}
            disabled={loading}
            multiple
          />
          <span className="help-text">Upload photos of warranty cards, documents, or receipts</span>
        </div>
        
        {/* Show warranty photo previews */}
        {photos.filter(p => p.type === PHOTO_TYPES.WARRANTY).length > 0 && (
          <div className="photo-previews">
            <h4>Warranty Photos ({photos.filter(p => p.type === PHOTO_TYPES.WARRANTY).length})</h4>
            <div className="photo-preview-grid">
              {photos.map((photo, index) => 
                photo.type === PHOTO_TYPES.WARRANTY && (
                  <div key={index} className="photo-preview-item">
                    <img src={photo.preview} alt={`Warranty ${index + 1}`} />
                    <div className="photo-preview-info">
                      <span className="photo-type-badge">{formatPhotoType(photo.type)}</span>
                      <button
                        type="button"
                        className="remove-photo-btn"
                        onClick={() => removePhoto(index)}
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render content for Tab 3: Media (All Photos)
  const renderMediaTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h3>Photos</h3>
        
        <div className="photo-upload-section">
          {livingMode ? (
            <>
              <div className="photo-type-upload">
                <label htmlFor="photo-profile-media">Profile Picture</label>
                <input
                  type="file"
                  id="photo-profile-media"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.PROFILE)}
                  disabled={loading}
                />
                <span className="help-text">Profile photo for this person, pet, or plant</span>
              </div>

              <div className="photo-type-upload">
                <label htmlFor="photo-optional-media">Additional Photos</label>
                <input
                  type="file"
                  id="photo-optional-media"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.OPTIONAL)}
                  disabled={loading}
                  multiple
                />
                <span className="help-text">Any additional photos</span>
              </div>
            </>
          ) : (
            <>
              <div className="photo-type-upload">
                <label htmlFor="photo-default-media">Default/Primary Photo</label>
                <input
                  type="file"
                  id="photo-default-media"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.DEFAULT)}
                  disabled={loading}
                />
                <span className="help-text">Primary photo for the item</span>
              </div>

              <div className="photo-type-upload">
                <label htmlFor="photo-data-tag-media">Data Tag</label>
                <div className="data-tag-controls">
                  <input
                    type="file"
                    id="photo-data-tag-media"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.DATA_TAG)}
                    disabled={loading || scanningDataTag}
                  />
                  {aiStatus?.enabled && (
                    <>
                      <input
                        type="file"
                        ref={dataTagInputRef}
                        accept="image/*"
                        capture="environment"
                        onChange={handleDataTagFileChange}
                        disabled={loading || scanningDataTag}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        className="btn-outline btn-scan-data-tag"
                        onClick={handleDataTagScan}
                        disabled={loading || scanningDataTag}
                        title="Take a photo of the data tag and auto-fill fields using AI"
                      >
                        {scanningDataTag ? "🔄 Scanning..." : "🤖 AI Scan"}
                      </button>
                    </>
                  )}
                </div>
                <span className="help-text">
                  Photo of serial number or data tag
                  {aiStatus?.enabled && " — Use AI Scan to auto-fill manufacturer, model & serial number"}
                </span>
              </div>

              {/* Data Tag Scan Results */}
              {dataTagResult && (
                <div className="data-tag-result">
                  <h4>📋 Data Tag Scan Results</h4>
                  <div className="data-tag-fields">
                    {dataTagResult.manufacturer && (
                      <div className="data-tag-field">
                        <span className="field-label">Manufacturer:</span>
                        <span className="field-value">{dataTagResult.manufacturer}</span>
                      </div>
                    )}
                    {dataTagResult.brand && dataTagResult.brand !== dataTagResult.manufacturer && (
                      <div className="data-tag-field">
                        <span className="field-label">Brand:</span>
                        <span className="field-value">{dataTagResult.brand}</span>
                      </div>
                    )}
                    {dataTagResult.model_number && (
                      <div className="data-tag-field">
                        <span className="field-label">Model Number:</span>
                        <span className="field-value">{dataTagResult.model_number}</span>
                      </div>
                    )}
                    {dataTagResult.serial_number && (
                      <div className="data-tag-field">
                        <span className="field-label">Serial Number:</span>
                        <span className="field-value">{dataTagResult.serial_number}</span>
                      </div>
                    )}
                    {dataTagResult.production_date && (
                      <div className="data-tag-field">
                        <span className="field-label">Production Date:</span>
                        <span className="field-value">{dataTagResult.production_date}</span>
                      </div>
                    )}
                    {dataTagResult.estimated_value !== null && dataTagResult.estimated_value !== undefined && (
                      <div className="data-tag-field">
                        <span className="field-label">Estimated Value:</span>
                        <span className="field-value">${dataTagResult.estimated_value.toLocaleString()}</span>
                      </div>
                    )}
                    {dataTagResult.additional_info && Object.keys(dataTagResult.additional_info).length > 0 && (
                      <div className="data-tag-additional">
                        <span className="field-label">Additional Info:</span>
                        <div className="additional-fields">
                          {Object.entries(dataTagResult.additional_info).map(([key, value]) => (
                            <span key={key} className="additional-field">
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!dataTagResult.manufacturer && !dataTagResult.brand && !dataTagResult.model_number && 
                     !dataTagResult.serial_number && !dataTagResult.production_date && !dataTagResult.estimated_value && (
                      <p className="no-data-found">No data tag information could be extracted. Try a clearer image.</p>
                    )}
                  </div>
                  <div className="data-tag-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={dismissDataTagResult}
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => applyDataTagInfo(dataTagResult)}
                      disabled={!dataTagResult.brand && !dataTagResult.manufacturer && 
                               !dataTagResult.model_number && !dataTagResult.serial_number && 
                               !dataTagResult.estimated_value}
                    >
                      Apply to Form
                    </button>
                  </div>
                </div>
              )}

              <div className="photo-type-upload">
                <label htmlFor="photo-receipt-media">Receipt</label>
                <input
                  type="file"
                  id="photo-receipt-media"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.RECEIPT)}
                  disabled={loading}
                  multiple
                />
                <span className="help-text">Purchase receipt</span>
              </div>

              <div className="photo-type-upload">
                <label htmlFor="photo-warranty-media">Warranty Information</label>
                <input
                  type="file"
                  id="photo-warranty-media"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.WARRANTY)}
                  disabled={loading}
                  multiple
                />
                <span className="help-text">Warranty documents or cards</span>
              </div>

              <div className="photo-type-upload">
                <label htmlFor="photo-optional-media">Additional Photos</label>
                <input
                  type="file"
                  id="photo-optional-media"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.OPTIONAL)}
                  disabled={loading}
                  multiple
                />
                <span className="help-text">Any additional photos</span>
              </div>
            </>
          )}
        </div>

        {photos.length > 0 && (
          <div className="photo-previews">
            <h4>All Selected Photos ({photos.length})</h4>
            <div className="photo-preview-grid">
              {photos.map((photo, index) => (
                <div key={index} className="photo-preview-item">
                  <img src={photo.preview} alt={`Preview ${index + 1}`} />
                  <div className="photo-preview-info">
                    <span className="photo-type-badge">{formatPhotoType(photo.type)}</span>
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={() => removePhoto(index)}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? "Edit Item" : livingMode ? "Add Living Item" : "Add New Item"}</h2>
          <button className="modal-close" onClick={onCancel}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="item-form item-form-tabbed">
          {error && <div className="error-banner">{error}</div>}
          
          {/* Tab Navigation - Only show for non-living items */}
          {!livingMode && (
            <div className="tab-navigation">
              <button
                type="button"
                className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                📋 Basic Info
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'warranty' ? 'active' : ''}`}
                onClick={() => setActiveTab('warranty')}
              >
                🛡️ Warranty
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
                onClick={() => setActiveTab('media')}
              >
                📷 Media
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className="tab-panels">
            {livingMode ? (
              // For living items, show all content without tabs
              <>
                {renderBasicInfoTab()}
                <div className="form-section">
                  <h3>Photos</h3>
                  <div className="photo-upload-section">
                    <div className="photo-type-upload">
                      <label htmlFor="photo-profile-living">Profile Picture</label>
                      <input
                        type="file"
                        id="photo-profile-living"
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.PROFILE)}
                        disabled={loading}
                      />
                      <span className="help-text">Profile photo for this person, pet, or plant</span>
                    </div>

                    <div className="photo-type-upload">
                      <label htmlFor="photo-optional-living">Additional Photos</label>
                      <input
                        type="file"
                        id="photo-optional-living"
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(e, PHOTO_TYPES.OPTIONAL)}
                        disabled={loading}
                        multiple
                      />
                      <span className="help-text">Any additional photos</span>
                    </div>
                  </div>

                  {photos.length > 0 && (
                    <div className="photo-previews">
                      <h4>Selected Photos ({photos.length})</h4>
                      <div className="photo-preview-grid">
                        {photos.map((photo, index) => (
                          <div key={index} className="photo-preview-item">
                            <img src={photo.preview} alt={`Preview ${index + 1}`} />
                            <div className="photo-preview-info">
                              <span className="photo-type-badge">{formatPhotoType(photo.type)}</span>
                              <button
                                type="button"
                                className="remove-photo-btn"
                                onClick={() => removePhoto(index)}
                                disabled={loading}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // For non-living items, use tabbed interface
              <>
                {activeTab === 'basic' && renderBasicInfoTab()}
                {activeTab === 'warranty' && renderWarrantyTab()}
                {activeTab === 'media' && renderMediaTab()}
              </>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ItemForm;
