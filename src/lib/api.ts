const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8001";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface Item {
  id: number | string;
  name: string;
  manufacturer?: string | null;
  model_number?: string | null;
  serial_number?: string | null;
  manufacture_date?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  estimated_value?: number | null;
  retailer?: string | null;
  upc?: string | null;
  warranties?: any[] | null;
  custom_fields?: Record<string, any> | null;
  location_id?: number | string | null;
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

  const res = await fetch(`${API_BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return handleResponse<LoginResponse>(res);
}

function authHeaders() {
  const token = localStorage.getItem("NesVentory_token");
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${API_BASE_URL}/items`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Item[]>(res);
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch(`${API_BASE_URL}/locations`, {
    headers: {
      "Accept": "application/json",
      ...authHeaders(),
    },
  });
  return handleResponse<Location[]>(res);
}
