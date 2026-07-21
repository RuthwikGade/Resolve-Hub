import { API_BASE_URL } from '../utils/constants';

/**
 * Thin fetch wrapper with JWT auto-attach and error handling.
 */
async function request(method, path, { body, isFormData = false, signal } = {}) {
  const token = localStorage.getItem('token');
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    method,
    headers,
    signal,
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, config);

  // If unauthorized, redirect to login
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Only redirect if not already on login/register
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  // Try to parse JSON; some responses may be empty
  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ─── Public helpers ──────────────────────────────────────────

export function get(path, opts) {
  return request('GET', path, opts);
}

export function post(path, body, opts) {
  return request('POST', path, { body, ...opts });
}

export function put(path, body, opts) {
  return request('PUT', path, { body, ...opts });
}

export function del(path, opts) {
  return request('DELETE', path, opts);
}

/**
 * Upload file(s) via multipart/form-data.
 * @param {string} path
 * @param {FormData} formData
 */
export function upload(path, formData, opts) {
  return request('POST', path, { body: formData, isFormData: true, ...opts });
}

const api = { get, post, put, del, upload };
export default api;
