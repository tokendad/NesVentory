const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8001";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  role?: string;
}

export interface PasswordUpdate {
  current_password: string;
  new_password: string;
}

export interface SystemHealth {
  status: string;
  database: string;
  counts: {
    users: number;
    items: number;
    locations: number;
  };
}

export interface DatabaseSize {
  total_size_bytes: number;
  total_size_pretty: string;
  tables: Array<{
    table: string;
    size: string;
    size_bytes: number;
  }>;
  media: {
    photos: number;
    documents: number;
    note: string;
  };
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
  uploaded_at: string;
}

export interface Document {
  id: string;
  item_id: string;
  filename: string;
  mime_type?: string | null;
  path: string;
  uploaded_at: string;
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
  retailer?: string | null;
  upc?: string | null;
  location_id?: number | string | null;
  warranties?: Warranty[];
  photos?: Photo[];
  documents?: Document[];
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
  retailer?: string | null;
  upc?: string | null;
  location_id?: number | string | null;
  warranties?: Warranty[];
}

export interface Location {
  id: number | string;
  name: string;
  parent_id?: number | string | null;
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

export async function createItem(item: ItemCreate): Promise<Item> {
  const res = await fetch(`${API_BASE_URL}/api/items`, {
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

// User endpoints

export async function getCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/me`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<User>(res);
}

export async function updateCurrentUser(update: UserUpdate): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(update),
  });
  return handleResponse<User>(res);
}

export async function updatePassword(passwordUpdate: PasswordUpdate): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/me/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(passwordUpdate),
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

// Admin endpoints

export async function getAllUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/api/users`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<User[]>(res);
}

export async function updateUser(userId: string, update: UserUpdate): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(update),
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

export async function getSystemHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE_URL}/api/admin/health`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<SystemHealth>(res);
}

export async function getDatabaseSize(): Promise<DatabaseSize> {
  const res = await fetch(`${API_BASE_URL}/api/admin/database-size`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<DatabaseSize>(res);
}

