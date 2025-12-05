// V2.0: In unified container, API is served from the same origin
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "";  // Empty string means same origin

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface Warranty {
  type: 'manufacturer' | 'extended';
  provider?: string | null;
  policy_number?: string | null;
  duration_months?: number | null;
  expiration_date?: string | null;
  notes?: string | null;
}

export interface Photo {
  id: string;
  item_id: string;
  path: string;
  mime_type?: string | null;
  is_primary: boolean;
  is_data_tag: boolean;
  photo_type?: string | null;
  uploaded_at: string;
}

export interface Document {
  id: string;
  item_id: string;
  filename: string;
  mime_type?: string | null;
  path: string;
  document_type?: string | null;
  uploaded_at: string;
}

export interface Tag {
  id: string;
  name: string;
  is_predefined: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactInfo {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface MaintenanceTask {
  id: string;
  item_id: string;
  name: string;
  description?: string | null;
  next_due_date?: string | null;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'bi_monthly' | 'yearly' | 'custom_days';
  recurrence_interval?: number | null;
  color?: string;
  last_completed?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTaskCreate {
  item_id: string;
  name: string;
  description?: string | null;
  next_due_date?: string | null;
  recurrence_type: 'none' | 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'bi_monthly' | 'yearly' | 'custom_days';
  recurrence_interval?: number | null;
  color?: string;
  last_completed?: string | null;
}

export interface Item {
  id: number | string;
  name: string;
  description?: string | null;
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  estimated_value?: number | null;
  estimated_value_ai_date?: string | null;  // Date when AI estimated the value (MM/DD/YY format)
  estimated_value_user_date?: string | null;  // Date when user supplied the value (MM/DD/YY format)
  estimated_value_user_name?: string | null;  // Username who supplied the value
  retailer?: string | null;
  upc?: string | null;
  location_id?: number | string | null;
  warranties?: Warranty[];
  photos?: Photo[];
  documents?: Document[];
  tags?: Tag[];
  maintenance_tasks?: MaintenanceTask[];
  // Living item fields
  is_living?: boolean;
  birthdate?: string | null;
  contact_info?: ContactInfo | null;
  relationship_type?: string | null;
  is_current_user?: boolean;
  associated_user_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ItemCreate {
  name: string;
  description?: string | null;
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  estimated_value?: number | null;
  estimated_value_ai_date?: string | null;  // Date when AI estimated the value (MM/DD/YY format)
  estimated_value_user_date?: string | null;  // Date when user supplied the value (MM/DD/YY format)
  estimated_value_user_name?: string | null;  // Username who supplied the value
  retailer?: string | null;
  upc?: string | null;
  location_id?: number | string | null;
  warranties?: Warranty[];
  tag_ids?: string[];
  // Living item fields
  is_living?: boolean;
  birthdate?: string | null;
  contact_info?: ContactInfo | null;
  relationship_type?: string | null;
  is_current_user?: boolean;
  associated_user_id?: string | null;
}

export interface LandlordInfo {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface TenantInfo {
  name?: string;
  phone?: string;
  email?: string;
  lease_start?: string;
  lease_end?: string;
  rent_amount?: number;
  notes?: string;
}

export interface OwnerInfo {
  owner_name?: string;
  spouse_name?: string;
  contact_info?: string;
  notes?: string;
}

export interface InsuranceInfo {
  company_name?: string;
  policy_number?: string;
  contact_info?: string;
  coverage_amount?: number;
  notes?: string;
}

export interface Location {
  id: number | string;
  name: string;
  parent_id?: number | string | null;
  is_primary_location?: boolean;
  is_container?: boolean;
  friendly_name?: string | null;
  description?: string | null;
  address?: string | null;
  owner_info?: OwnerInfo | null;
  landlord_info?: LandlordInfo | null;
  tenant_info?: TenantInfo | null;
  insurance_info?: InsuranceInfo | null;
  estimated_property_value?: number | null;
  estimated_value_with_items?: number | null;
  location_type?: string | null;
  children?: Location[];
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const res = await fetch(`${API_BASE_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return handleResponse<LoginResponse>(res);
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("NesVentory_token");
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_BASE_URL}/api/items`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Item[]>(res);
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch(`${API_BASE_URL}/api/locations`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Location[]>(res);
}

export interface LocationCreate {
  name: string;
  parent_id?: string | null;
  is_primary_location?: boolean;
  is_container?: boolean;
  friendly_name?: string | null;
  description?: string | null;
  address?: string | null;
  owner_info?: OwnerInfo | null;
  landlord_info?: LandlordInfo | null;
  tenant_info?: TenantInfo | null;
  insurance_info?: InsuranceInfo | null;
  estimated_property_value?: number | null;
  estimated_value_with_items?: number | null;
  location_type?: string | null;
}

export async function createLocation(location: LocationCreate): Promise<Location> {
  const res = await fetch(`${API_BASE_URL}/api/locations/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(location),
  });
  return handleResponse<Location>(res);
}

export async function updateLocation(locationId: string, location: Partial<LocationCreate>): Promise<Location> {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(location),
  });
  return handleResponse<Location>(res);
}

export async function deleteLocation(locationId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/locations/${locationId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
}

export async function createItem(item: ItemCreate): Promise<Item> {
  const res = await fetch(`${API_BASE_URL}/api/items/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(item),
  });
  return handleResponse<Item>(res);
}

export async function fetchItem(itemId: string): Promise<Item> {
  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Item>(res);
}

export async function updateItem(itemId: string, item: Partial<ItemCreate>): Promise<Item> {
  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(item),
  });
  return handleResponse<Item>(res);
}

export async function deleteItem(itemId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
}

// --- Bulk Operations ---

export interface BulkDeleteResponse {
  deleted_count: number;
  message: string;
}

export interface BulkUpdateTagsResponse {
  updated_count: number;
  message: string;
}

export interface BulkUpdateLocationResponse {
  updated_count: number;
  message: string;
}

export async function bulkDeleteItems(itemIds: string[]): Promise<BulkDeleteResponse> {
  const res = await fetch(`${API_BASE_URL}/api/items/bulk-delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ item_ids: itemIds }),
  });
  return handleResponse<BulkDeleteResponse>(res);
}

export async function bulkUpdateTags(
  itemIds: string[],
  tagIds: string[],
  mode: "replace" | "add" | "remove" = "replace"
): Promise<BulkUpdateTagsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/items/bulk-update-tags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ item_ids: itemIds, tag_ids: tagIds, mode }),
  });
  return handleResponse<BulkUpdateTagsResponse>(res);
}

export async function bulkUpdateLocation(
  itemIds: string[],
  locationId: string | null
): Promise<BulkUpdateLocationResponse> {
  const res = await fetch(`${API_BASE_URL}/api/items/bulk-update-location`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ item_ids: itemIds, location_id: locationId }),
  });
  return handleResponse<BulkUpdateLocationResponse>(res);
}

export interface ApplicationStatus {
  name: string;
  version: string;
  status: string;
}

export interface DatabaseStatus {
  status: string;
  version?: string;
  version_full?: string;
  size?: string;
  size_bytes?: number;
  location?: string;
  latest_version?: string | null;
  is_version_current?: boolean | null;
  error?: string;
}

export interface SystemStatus {
  application: ApplicationStatus;
  database: DatabaseStatus;
}

export async function fetchStatus(): Promise<SystemStatus> {
  const res = await fetch(`${API_BASE_URL}/api/status`, {
    headers: {
      "Accept": "application/json",
    },
  });
  return handleResponse<SystemStatus>(res);
}

export async function uploadPhoto(
  itemId: string,
  file: File,
  photoType?: string,
  isPrimary: boolean = false,
  isDataTag: boolean = false
): Promise<Photo> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("is_primary", isPrimary.toString());
  formData.append("is_data_tag", isDataTag.toString());
  if (photoType) {
    formData.append("photo_type", photoType);
  }

  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/photos`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });
  return handleResponse<Photo>(res);
}

export async function deletePhoto(itemId: string, photoId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/photos/${photoId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
}

export async function uploadDocument(
  itemId: string,
  file: File,
  documentType?: string
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  if (documentType) {
    formData.append("document_type", documentType);
  }

  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/documents`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });
  return handleResponse<Document>(res);
}

export async function uploadDocumentFromUrl(
  itemId: string,
  url: string,
  documentType?: string
): Promise<Document> {
  const formData = new FormData();
  formData.append("url", url);
  if (documentType) {
    formData.append("document_type", documentType);
  }

  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/documents/from-url`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });
  return handleResponse<Document>(res);
}

export async function deleteDocument(itemId: string, documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/items/${itemId}/documents/${documentId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
}

// --- User APIs ---

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  allowed_location_ids?: string[] | null;
  api_key?: string | null;
  // AI Valuation Schedule Settings
  ai_schedule_enabled?: boolean;
  ai_schedule_interval_days?: number;
  ai_schedule_last_run?: string | null;
  // UPC Database Configuration
  upc_databases?: { id: string; enabled: boolean; api_key?: string | null }[] | null;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name?: string | null;
}

export interface AdminUserCreate {
  email: string;
  password: string;
  full_name?: string | null;
  role?: string;
  is_approved?: boolean;
}

export interface AIScheduleSettings {
  ai_schedule_enabled: boolean;
  ai_schedule_interval_days: number;
}

export interface AIValuationRunResponse {
  items_processed: number;
  items_updated: number;
  items_skipped: number;
  message: string;
  ai_schedule_last_run?: string | null;
}

export interface AIEnrichmentRunResponse {
  items_processed: number;
  items_updated: number;
  items_skipped: number;
  items_with_data_tags: number;
  quota_exceeded: boolean;
  message: string;
}

export async function registerUser(userCreate: UserCreate): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(userCreate),
  });
  return handleResponse<User>(res);
}

export async function adminCreateUser(userCreate: AdminUserCreate): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(userCreate),
  });
  return handleResponse<User>(res);
}

export async function getCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/me`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<User>(res);
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/api/users`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<User[]>(res);
}

export async function updateUser(userId: string, updates: Partial<{full_name: string, password: string, role: string, is_approved: boolean}>): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(updates),
  });
  return handleResponse<User>(res);
}

export async function deleteUser(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
}

export async function updateUserLocationAccess(userId: string, locationIds: string[]): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}/locations`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ location_ids: locationIds }),
  });
  return handleResponse<User>(res);
}

export async function getUserLocationAccess(userId: string): Promise<Location[]> {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}/locations`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Location[]>(res);
}

// Tag API functions
export async function fetchTags(): Promise<Tag[]> {
  const res = await fetch(`${API_BASE_URL}/api/tags`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Tag[]>(res);
}

export async function createTag(name: string): Promise<Tag> {
  const res = await fetch(`${API_BASE_URL}/api/tags/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ name, is_predefined: false }),
  });
  return handleResponse<Tag>(res);
}

export async function deleteTag(tagId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/tags/${tagId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
}

// --- Encircle Import APIs ---

export interface EncircleImportResult {
  message: string;
  items_created: number;
  photos_attached: number;
  items_without_photos: number;
  locations_created: number;
  sublocations_created: number;
  parent_location_name: string | null;
  log: string[];
  warnings?: string[];
  quota_exceeded?: boolean;
}

export interface EncirclePreviewResult {
  parent_location_name: string | null;
}

export async function previewEncircle(xlsxFile: File): Promise<EncirclePreviewResult> {
  const formData = new FormData();
  formData.append("xlsx_file", xlsxFile);

  const res = await fetch(`${API_BASE_URL}/api/import/encircle/preview`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });

  return handleResponse<EncirclePreviewResult>(res);
}

export async function importEncircle(
  xlsxFile: File,
  images: File[],
  matchByName: boolean = true,
  parentLocationId: string | null = null,
  createParentFromFile: boolean = true
): Promise<EncircleImportResult> {
  const formData = new FormData();
  formData.append("xlsx_file", xlsxFile);
  formData.append("match_by_name", matchByName.toString());
  formData.append("create_parent_from_file", createParentFromFile.toString());
  
  if (parentLocationId) {
    formData.append("parent_location_id", parentLocationId);
  }
  
  for (const image of images) {
    formData.append("images", image);
  }

  const res = await fetch(`${API_BASE_URL}/api/import/encircle`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });

  return handleResponse<EncircleImportResult>(res);
}

// --- API Key Management ---

export async function generateApiKey(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/api-key`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<User>(res);
}

export async function revokeApiKey(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/api-key`, {
    method: "DELETE",
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<User>(res);
}

// --- AI Detection APIs ---

export interface DetectedItem {
  name: string;
  description?: string | null;
  brand?: string | null;
  estimated_value?: number | null;
  confidence?: number | null;
  estimation_date?: string | null;  // Date when AI estimated the value (MM/DD/YY format)
}

export interface DetectionResult {
  items: DetectedItem[];
  raw_response?: string | null;
}

export interface AIStatusResponse {
  enabled: boolean;
  model?: string | null;
  plugins_enabled?: boolean;
  plugin_count?: number;
}

export interface DataTagInfo {
  manufacturer?: string | null;
  brand?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  production_date?: string | null;
  estimated_value?: number | null;
  estimation_date?: string | null;  // Date when AI estimated the value (MM/DD/YY format)
  additional_info?: Record<string, unknown> | null;
  raw_response?: string | null;
}

export interface BarcodeLookupResult {
  found: boolean;
  name?: string | null;
  description?: string | null;
  brand?: string | null;
  model_number?: string | null;
  estimated_value?: number | null;
  estimation_date?: string | null;  // Date when AI estimated the value (MM/DD/YY format)
  category?: string | null;
  raw_response?: string | null;
}

export async function getAIStatus(): Promise<AIStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/status`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<AIStatusResponse>(res);
}

export async function detectItemsFromImage(file: File): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/ai/detect-items`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });
  return handleResponse<DetectionResult>(res);
}

export async function parseDataTagImage(file: File): Promise<DataTagInfo> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/ai/parse-data-tag`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });
  return handleResponse<DataTagInfo>(res);
}

export async function lookupBarcode(upc: string): Promise<BarcodeLookupResult> {
  const res = await fetch(`${API_BASE_URL}/api/ai/barcode-lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ upc }),
  });
  return handleResponse<BarcodeLookupResult>(res);
}

export interface BarcodeScanResult {
  found: boolean;
  upc?: string | null;
  raw_response?: string | null;
}

export async function scanBarcodeImage(file: File): Promise<BarcodeScanResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/ai/scan-barcode`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: formData,
  });
  return handleResponse<BarcodeScanResult>(res);
}

// --- Multi-Database UPC Lookup ---

export interface MultiBarcodeLookupResult {
  found: boolean;
  source: string;  // The database that returned this result (e.g., 'gemini', 'upcdatabase')
  name?: string | null;
  description?: string | null;
  brand?: string | null;
  model_number?: string | null;
  estimated_value?: number | null;
  estimation_date?: string | null;
  category?: string | null;
  raw_response?: string | null;
  has_next_database: boolean;
  next_database_id?: string | null;
  next_database_name?: string | null;
}

export interface UPCDatabaseConfig {
  id: string;
  enabled: boolean;
  api_key?: string | null;
}

export interface AvailableUPCDatabase {
  id: string;
  name: string;
  description: string;
  requires_api_key: boolean;
  api_key_url?: string | null;
}

export interface AvailableUPCDatabasesResponse {
  databases: AvailableUPCDatabase[];
}

export async function lookupBarcodeMulti(upc: string, databaseId?: string | null): Promise<MultiBarcodeLookupResult> {
  const res = await fetch(`${API_BASE_URL}/api/ai/barcode-lookup-multi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ upc, database_id: databaseId || null }),
  });
  return handleResponse<MultiBarcodeLookupResult>(res);
}

export async function getAvailableUPCDatabases(): Promise<AvailableUPCDatabasesResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/upc-databases`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<AvailableUPCDatabasesResponse>(res);
}

export async function getUPCDatabaseSettings(): Promise<{ upc_databases: UPCDatabaseConfig[] }> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/upc-databases`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<{ upc_databases: UPCDatabaseConfig[] }>(res);
}

export async function updateUPCDatabaseSettings(upcDatabases: UPCDatabaseConfig[]): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/upc-databases`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ upc_databases: upcDatabases }),
  });
  return handleResponse<User>(res);
}

// --- Google OAuth ---

export interface GoogleOAuthStatus {
  enabled: boolean;
  client_id?: string | null;
}

export interface GoogleAuthResponse {
  access_token: string;
  token_type: string;
  is_new_user: boolean;
}

export interface RegistrationStatus {
  enabled: boolean;
}

export async function getRegistrationStatus(): Promise<RegistrationStatus> {
  const res = await fetch(`${API_BASE_URL}/api/auth/registration/status`, {
    headers: {
      "Accept": "application/json",
    },
  });
  return handleResponse<RegistrationStatus>(res);
}

export async function getGoogleOAuthStatus(): Promise<GoogleOAuthStatus> {
  const res = await fetch(`${API_BASE_URL}/api/auth/google/status`, {
    headers: {
      "Accept": "application/json",
    },
  });
  return handleResponse<GoogleOAuthStatus>(res);
}

export async function googleAuth(credential: string): Promise<GoogleAuthResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ credential }),
  });
  return handleResponse<GoogleAuthResponse>(res);
}

// --- AI Schedule APIs ---

export async function getAIScheduleSettings(): Promise<AIScheduleSettings> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/ai-schedule`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<AIScheduleSettings>(res);
}

export async function updateAIScheduleSettings(settings: AIScheduleSettings): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/ai-schedule`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(settings),
  });
  return handleResponse<User>(res);
}

export async function runAIValuation(): Promise<AIValuationRunResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/run-valuation`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<AIValuationRunResponse>(res);
}

export async function enrichFromDataTags(): Promise<AIEnrichmentRunResponse> {
  const res = await fetch(`${API_BASE_URL}/api/ai/enrich-from-data-tags`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<AIEnrichmentRunResponse>(res);
}

// --- Google Drive Backup APIs ---

export interface GDriveStatus {
  enabled: boolean;
  connected: boolean;
  last_backup: string | null;
}

export interface GDriveBackupResponse {
  success: boolean;
  message: string;
  backup_id?: string | null;
  backup_name?: string | null;
  backup_date?: string | null;
}

export interface GDriveBackupFile {
  id: string;
  name: string;
  created_time: string;
  size?: string | null;
}

export interface GDriveBackupList {
  backups: GDriveBackupFile[];
}

export async function getGDriveStatus(): Promise<GDriveStatus> {
  const res = await fetch(`${API_BASE_URL}/api/gdrive/status`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<GDriveStatus>(res);
}

export async function connectGDrive(code: string): Promise<GDriveStatus> {
  const res = await fetch(`${API_BASE_URL}/api/gdrive/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ code }),
  });
  return handleResponse<GDriveStatus>(res);
}

export async function disconnectGDrive(): Promise<GDriveStatus> {
  const res = await fetch(`${API_BASE_URL}/api/gdrive/disconnect`, {
    method: "DELETE",
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<GDriveStatus>(res);
}

export async function createGDriveBackup(): Promise<GDriveBackupResponse> {
  const res = await fetch(`${API_BASE_URL}/api/gdrive/backup`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<GDriveBackupResponse>(res);
}

export async function listGDriveBackups(): Promise<GDriveBackupList> {
  const res = await fetch(`${API_BASE_URL}/api/gdrive/backups`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<GDriveBackupList>(res);
}

export async function deleteGDriveBackup(backupId: string): Promise<GDriveBackupResponse> {
  const res = await fetch(`${API_BASE_URL}/api/gdrive/backups/${backupId}`, {
    method: "DELETE",
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<GDriveBackupResponse>(res);
}

// --- Log Settings APIs ---

export interface LogSettings {
  rotation_type: string;  // "schedule" or "size"
  rotation_schedule_hours: number;  // Default 24 hours
  rotation_size_mb: number;  // Default 10 MB
  log_level: string;  // "info", "warn_error", "debug", or "trace"
  retention_days: number;  // Days to keep rotated logs
  auto_delete_enabled: boolean;  // Whether to auto-delete old logs
}

export interface LogFile {
  name: string;
  size_bytes: number;
  size_display: string;
  modified_at: string;
  log_type: string;  // "current", "rotated", "debug", "trace"
}

export interface LogSettingsResponse {
  settings: LogSettings;
  log_files: LogFile[];
}

export interface DeleteLogsResponse {
  deleted_count: number;
  message: string;
}

export interface RotateLogsResponse {
  message: string;
  rotated: boolean;
  rotated_file?: string;
}

export async function getLogSettings(): Promise<LogSettingsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/logs/settings`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<LogSettingsResponse>(res);
}

export async function updateLogSettings(settings: LogSettings): Promise<LogSettingsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/logs/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(settings),
  });
  return handleResponse<LogSettingsResponse>(res);
}

export async function deleteLogFiles(fileNames: string[]): Promise<DeleteLogsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/logs/files`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ file_names: fileNames }),
  });
  return handleResponse<DeleteLogsResponse>(res);
}

export async function rotateLogsNow(): Promise<RotateLogsResponse> {
  const res = await fetch(`${API_BASE_URL}/api/logs/rotate`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<RotateLogsResponse>(res);
}

export async function getLogFiles(): Promise<LogFile[]> {
  const res = await fetch(`${API_BASE_URL}/api/logs/files`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<LogFile[]>(res);
}

export interface LogContentResponse {
  file_name: string;
  content: string;
  truncated: boolean;
  total_lines: number;
  returned_lines: number;
}

export interface IssueReportData {
  app_version: string;
  database_type: string;
  database_version: string;
  log_level: string;
  error_logs: string;
  system_info: string;
  github_issue_url: string;
}

export async function getLogContent(fileName: string, lines: number = 100): Promise<LogContentResponse> {
  const res = await fetch(`${API_BASE_URL}/api/logs/content/${encodeURIComponent(fileName)}?lines=${lines}`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<LogContentResponse>(res);
}

export async function getIssueReportData(): Promise<IssueReportData> {
  const res = await fetch(`${API_BASE_URL}/api/logs/issue-report`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<IssueReportData>(res);
}

// --- Config Status APIs ---

export interface ConfigStatusResponse {
  google_oauth_configured: boolean;
  google_client_id: string | null;
  google_client_secret_masked: string | null;
  gemini_configured: boolean;
  gemini_api_key_masked: string | null;
  gemini_model: string | null;
  gemini_from_env: boolean;
  google_from_env: boolean;
}

export interface ApiKeysUpdate {
  gemini_api_key?: string | null;
  google_client_id?: string | null;
  google_client_secret?: string | null;
}

export interface ApiKeysUpdateResponse {
  success: boolean;
  message: string;
  gemini_configured: boolean;
  google_oauth_configured: boolean;
}

export async function getConfigStatus(): Promise<ConfigStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/api/config-status`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<ConfigStatusResponse>(res);
}

export async function updateApiKeys(apiKeys: ApiKeysUpdate): Promise<ApiKeysUpdateResponse> {
  const res = await fetch(`${API_BASE_URL}/api/config-status/api-keys`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(apiKeys),
  });
  return handleResponse<ApiKeysUpdateResponse>(res);
}

// --- Maintenance Task APIs ---

export async function fetchMaintenanceTasks(): Promise<MaintenanceTask[]> {
  const res = await fetch(`${API_BASE_URL}/api/maintenance/`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<MaintenanceTask[]>(res);
}

export async function fetchMaintenanceTasksForItem(itemId: string): Promise<MaintenanceTask[]> {
  const res = await fetch(`${API_BASE_URL}/api/maintenance/item/${itemId}`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<MaintenanceTask[]>(res);
}

export async function createMaintenanceTask(task: MaintenanceTaskCreate): Promise<MaintenanceTask> {
  const res = await fetch(`${API_BASE_URL}/api/maintenance/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(task),
  });
  return handleResponse<MaintenanceTask>(res);
}

export async function updateMaintenanceTask(taskId: string, task: MaintenanceTaskCreate): Promise<MaintenanceTask> {
  const res = await fetch(`${API_BASE_URL}/api/maintenance/${taskId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(task),
  });
  return handleResponse<MaintenanceTask>(res);
}

export async function deleteMaintenanceTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/maintenance/${taskId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
}

// --- Plugin APIs ---

export interface Plugin {
  id: string;
  name: string;
  description?: string | null;
  plugin_type: string;
  endpoint_url: string;
  api_key?: string | null;
  config?: Record<string, unknown> | null;
  enabled: boolean;
  use_for_ai_scan: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface PluginCreate {
  name: string;
  description?: string | null;
  plugin_type?: string;
  endpoint_url: string;
  api_key?: string | null;
  config?: Record<string, unknown> | null;
  enabled?: boolean;
  use_for_ai_scan?: boolean;
  priority?: number;
}

export interface PluginUpdate {
  name?: string;
  description?: string | null;
  endpoint_url?: string;
  api_key?: string | null;
  config?: Record<string, unknown> | null;
  enabled?: boolean;
  use_for_ai_scan?: boolean;
  priority?: number;
}

export async function fetchPlugins(): Promise<Plugin[]> {
  const res = await fetch(`${API_BASE_URL}/api/plugins/`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Plugin[]>(res);
}

export async function getPlugin(pluginId: string): Promise<Plugin> {
  const res = await fetch(`${API_BASE_URL}/api/plugins/${pluginId}`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Plugin>(res);
}

export async function createPlugin(plugin: PluginCreate): Promise<Plugin> {
  const res = await fetch(`${API_BASE_URL}/api/plugins/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(plugin),
  });
  return handleResponse<Plugin>(res);
}

export async function updatePlugin(pluginId: string, plugin: PluginUpdate): Promise<Plugin> {
  const res = await fetch(`${API_BASE_URL}/api/plugins/${pluginId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(plugin),
  });
  return handleResponse<Plugin>(res);
}

export async function deletePlugin(pluginId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/plugins/${pluginId}`, {
    method: "DELETE",
    headers: {
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const data = JSON.parse(text);
      message = (data.detail as string) || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
}

