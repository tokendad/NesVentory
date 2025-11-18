const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Request failed')
  }
  return res.json()
}

export function getItems() {
  return request('/api/items')
}

export function getHealth() {
  return request('/api/health')
}
