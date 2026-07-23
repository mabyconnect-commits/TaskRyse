// Typed fetch client for the Taskryse API.
//
// Base URL resolution:
//   * Default '/api/v1' (relative) — same-origin. Works behind the Vite dev proxy,
//     the nginx proxy in docker-compose, and a Vercel same-project serverless backend.
//   * Set VITE_API_BASE at build time to point at a cross-origin backend, e.g.
//     "https://taskryse-api.onrender.com/api/v1" when the API is hosted separately.
const BASE = import.meta.env.VITE_API_BASE || '/api/v1';
const TOKEN_KEY = 'taskryse.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const code = (data && data.code) || 'error';
    const message = (data && data.message) || res.statusText;
    throw new ApiError(res.status, code, message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
};
