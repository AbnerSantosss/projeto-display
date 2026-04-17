
// ==============================================================================
// API CLIENT - Comunicação com o backend Express
// ==============================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let authToken: string | null = localStorage.getItem('authToken');

// Cache de ETags para suporte a 304 Not Modified
const etagCache = new Map<string, string>();

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
    
    // Envia ETag se tiver em cache para suporte a 304
    const cachedEtag = etagCache.get(path);
    if (cachedEtag) {
      headers['If-None-Match'] = cachedEtag;
    }

    const res = await fetch(`${API_BASE}${path}`, { headers });
    
    // 304 Not Modified — retorna null para indicar "sem mudançãs"
    if (res.status === 304) {
      return null as T;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    
    // Salva o ETag da resposta
    const etag = res.headers.get('etag');
    if (etag) {
      etagCache.set(path, etag);
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
