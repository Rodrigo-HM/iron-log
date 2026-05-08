const CLIENT_ID = 'ed133540052049508da54d81ee876526';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
].join(' ');

const TOKEN_KEY = 'spotify_token';
const VERIFIER_KEY = 'spotify_verifier';

function getRedirectUri() {
  return window.location.origin + '/';
}

function base64UrlEncode(bytes) {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes).slice(0, length);
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

export async function startLogin() {
  const verifier = randomString(64);
  const challenge = await sha256(verifier);
  localStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleAuthCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (!code) return false;

  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) return false;

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) {
    localStorage.removeItem(VERIFIER_KEY);
    window.history.replaceState({}, '', '/');
    return false;
  }
  const data = await res.json();
  saveToken(data);
  localStorage.removeItem(VERIFIER_KEY);
  window.history.replaceState({}, '', '/');
  return true;
}

function saveToken(data) {
  const token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000) - 30000
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  return token;
}

function getStoredToken() {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function refreshToken(token) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) {
    logout();
    return null;
  }
  const data = await res.json();
  return saveToken({ ...data, refresh_token: data.refresh_token || token.refresh_token });
}

async function getAccessToken() {
  const token = getStoredToken();
  if (!token) return null;
  if (Date.now() < token.expires_at) return token.access_token;
  const refreshed = await refreshToken(token);
  return refreshed?.access_token ?? null;
}

export function isLoggedIn() {
  return !!getStoredToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, status: 401 };
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (res.status === 204) return { ok: true, status: 204, data: null };
  if (!res.ok) return { ok: false, status: res.status };
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: true, status: res.status, data };
}

export async function getPlaybackState() {
  const r = await api('/me/player');
  if (!r.ok || !r.data) return null;
  const t = r.data.item;
  if (!t) return null;
  return {
    isPlaying: r.data.is_playing,
    title: t.name,
    artist: (t.artists || []).map(a => a.name).join(', '),
    image: t.album?.images?.[t.album.images.length - 1]?.url ?? null,
    deviceName: r.data.device?.name ?? null
  };
}

export async function play()  { return api('/me/player/play',     { method: 'PUT' }); }
export async function pause() { return api('/me/player/pause',    { method: 'PUT' }); }
export async function next()  { return api('/me/player/next',     { method: 'POST' }); }
export async function prev()  { return api('/me/player/previous', { method: 'POST' }); }
