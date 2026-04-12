/**
 * Shiparoo API client
 * Reads base URL from app.json extra.apiUrl, falls back to localhost.
 * All requests attach the JWT access token from SecureStore.
 * Handles 401s by attempting a token refresh automatically.
 */
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// When running in iOS Simulator, localhost on the Mac = 127.0.0.1
// For a real device on the same WiFi, replace with your Mac's LAN IP
const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

const TOKEN_KEY   = 'shiparoo_access_token';
const REFRESH_KEY = 'shiparoo_refresh_token';

// ── Token storage ─────────────────────────────────────────────────────────────
export const storeTokens = async ({ accessToken, refreshToken }) => {
  await SecureStore.setItemAsync(TOKEN_KEY,   accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
};

export const clearTokens = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
};

export const getAccessToken  = () => SecureStore.getItemAsync(TOKEN_KEY);
export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_KEY);

// ── Core fetch wrapper ────────────────────────────────────────────────────────
let _isRefreshing = false;

async function request(path, options = {}, retry = true) {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && retry && !_isRefreshing) {
    _isRefreshing = true;
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken }),
      });
      if (!refreshRes.ok) {
        await clearTokens();
        throw new Error('Session expired');
      }
      const { tokens } = await refreshRes.json();
      await storeTokens(tokens);
      _isRefreshing = false;
      return request(path, options, false); // retry once with new token
    } catch (err) {
      _isRefreshing = false;
      throw err;
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error?.message ?? `HTTP ${res.status}`), {
      code:   body?.error?.code,
      status: res.status,
    });
  }

  if (res.status === 204) return null;
  return res.json();
}

const get    = (path, opts)   => request(path, { method: 'GET',    ...opts });
const post   = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) });
const patch  = (path, body)   => request(path, { method: 'PATCH',  body: JSON.stringify(body) });
const del    = (path)         => request(path, { method: 'DELETE' });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  register: (data)       => post('/api/v1/auth/register', data),
  login:    (email, pw)  => post('/api/v1/auth/login', { email, password: pw }),
  logout:   async ()     => {
    const refreshToken = await getRefreshToken();
    await post('/api/v1/auth/logout', { refreshToken }).catch(() => {});
    await clearTokens();
  },
  me:       ()           => get('/api/v1/auth/me'),
};

// ── Loads ─────────────────────────────────────────────────────────────────────
export const loads = {
  board:   (params = {}) => get('/api/v1/loads?' + new URLSearchParams(params)),
  mine:    (params = {}) => get('/api/v1/loads/mine?' + new URLSearchParams(params)),
  get:     (id)          => get(`/api/v1/loads/${id}`),
  create:  (data)        => post('/api/v1/loads', data),
  update:  (id, data)    => patch(`/api/v1/loads/${id}`, data),
  publish: (id)          => post(`/api/v1/loads/${id}/publish`, {}),
  cancel:  (id)          => post(`/api/v1/loads/${id}/cancel`, {}),
  bids:    (id)          => get(`/api/v1/loads/${id}/bids`),
  award:   (id, bidId)   => post(`/api/v1/loads/${id}/award/${bidId}`, {}),
  book:    (id, data)    => post(`/api/v1/loads/${id}/book`, data),
  payment: (id)          => get(`/api/v1/loads/${id}/payment`),
};

// ── Bids ──────────────────────────────────────────────────────────────────────
export const bids = {
  place:    (data)        => post('/api/v1/bids', data),
  mine:     (params = {}) => get('/api/v1/bids/mine?' + new URLSearchParams(params)),
  withdraw: (id)          => del(`/api/v1/bids/${id}`),
  counter:  (id, data)    => post(`/api/v1/bids/${id}/counter`, data),
};

// ── Tracking ──────────────────────────────────────────────────────────────────
export const tracking = {
  ping:  (data)   => post('/api/v1/tracking/ping', data),
  batch: (data)   => post('/api/v1/tracking/batch', data),
  trail: (loadId) => get(`/api/v1/tracking/load/${loadId}`),
};

// ── Fleet ─────────────────────────────────────────────────────────────────────
export const fleet = {
  vehicles:      ()       => get('/api/v1/fleet/vehicles'),
  addVehicle:    (data)   => post('/api/v1/fleet/vehicles', data),
  updateVehicle: (id, d)  => patch(`/api/v1/fleet/vehicles/${id}`, d),
};

// ── POD ───────────────────────────────────────────────────────────────────────
export const pod = {
  get:     (loadId)       => get(`/api/v1/pod/${loadId}`),
  approve: (loadId)       => post(`/api/v1/pod/${loadId}/approve`, {}),
  reject:  (loadId, data) => post(`/api/v1/pod/${loadId}/reject`, data),

  // Multipart upload for photos + signature
  submit: async (loadId, { photos = [], notes, recipientName, location }) => {
    const token = await getAccessToken();
    const form  = new FormData();
    form.append('notes',         notes ?? '');
    form.append('recipientName', recipientName ?? '');
    if (location) {
      form.append('deliveryLat', String(location.latitude));
      form.append('deliveryLon', String(location.longitude));
    }
    photos.forEach((uri, i) => {
      const name = `photo_${i}.jpg`;
      form.append('photos', { uri, name, type: 'image/jpeg' });
    });
    const res = await fetch(`${BASE_URL}/api/v1/pod/submit/${loadId}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    form,
    });
    if (!res.ok) throw new Error((await res.json())?.error?.message ?? 'Upload failed');
    return res.json();
  },
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = {
  profile:       ()       => get('/api/v1/users/profile'),
  update:        (data)   => patch('/api/v1/users/profile', data),
  notifications: ()       => get('/api/v1/users/notifications'),
  markRead:      (ids=[]) => patch('/api/v1/users/notifications/read', { ids }),
};
