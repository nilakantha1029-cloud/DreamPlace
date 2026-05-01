/* ============================================================
   Dream Place — api.js
   Central API helper with token management
   ============================================================ */

const API = (() => {

  const BASE = 'http://localhost:5000/api';
  const TOKEN_KEY = 'dp_token';
  const USER_KEY  = 'dp_user';

  // ── Token helpers ──────────────────────────────────────────
  function getToken()  { return localStorage.getItem(TOKEN_KEY); }
  function getUser()   {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
    catch { return null; }
  }
  function saveAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function requireAuth() {
    if (!getToken()) { window.location.href = 'login.html'; return false; }
    return true;
  }

  // ── Core fetch wrapper ─────────────────────────────────────
  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(BASE + path, { ...options, headers });

    // Handle 401 — token expired
    if (res.status === 401) {
      clearAuth();
      window.location.href = 'login.html';
      return;
    }

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      const err = new Error(data.error || data.message || 'Request failed.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ── Auth ───────────────────────────────────────────────────
  async function login(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async function register({ full_name, email, phone, password }) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, phone, password })
    });
  }

  async function logout() {
    try { await request('/auth/logout', { method: 'POST' }); } catch {}
    clearAuth();
  }

  // ── User ───────────────────────────────────────────────────
  async function getProfile()  { return request('/user/profile'); }
  async function updateProfile(data) {
    return request('/user/profile', { method: 'PUT', body: JSON.stringify(data) });
  }

  // ── Destinations ───────────────────────────────────────────
  async function getDestinations(region = '') {
    const qs = region && region !== 'all' ? `?region=${region}` : '';
    return request('/destinations' + qs);
  }

  // ── Packages ───────────────────────────────────────────────
  async function getPackages(category = '') {
    const qs = category && category !== 'all' ? `?category=${category}` : '';
    return request('/packages' + qs);
  }

  // ── Bookings ───────────────────────────────────────────────
  async function createBooking({ package_id, travellers, travel_date, special_req }) {
    return request('/bookings', {
      method: 'POST',
      body: JSON.stringify({ package_id, travellers, travel_date, special_req })
    });
  }
  async function getBookings()         { return request('/bookings'); }
  async function cancelBooking(id)     { return request(`/bookings/${id}`, { method: 'DELETE' }); }

  // ── Dashboard stats ────────────────────────────────────────
  async function getDashStats() { return request('/dashboard/stats'); }

  // ── Expose ────────────────────────────────────────────────
  return {
    BASE,
    getToken, getUser, saveAuth, clearAuth, requireAuth,
    login, register, logout,
    getProfile, updateProfile,
    getDestinations,
    getPackages,
    createBooking, getBookings, cancelBooking,
    getDashStats,
  };
})();