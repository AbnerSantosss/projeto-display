
// ==============================================================================
// API CLIENT - Comunicação com o backend Express
// ==============================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let authToken: string | null = localStorage.getItem('authToken');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = (): string | null => authToken;

const getHeaders = (isJson = true): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
};

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = getHeaders();

    const res = await fetch(`${API_BASE}${path}`, { headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Erro ${res.status}`);
    }

    return res.json();
  },

  async post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    return res.json();
  },

  async put<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    return res.json();
  },

  async patch<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    return res.json();
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    return res.json();
  },

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    // Não define Content-Type — o browser seta boundary automaticamente
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    return res.json();
  },

  getMediaUrl(filename: string): string {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    // Remove /api do final para construir URL de uploads
    const serverBase = base.replace(/\/api$/, '');
    return `${serverBase}/uploads/${filename}`;
  }
};
