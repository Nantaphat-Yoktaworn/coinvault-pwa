// Shared auth helpers for the single-user cloud sync (Cloudflare Pages Functions).
const enc = new TextEncoder();

function timingSafeEqual(a, b) {
  // ponytail: constant-time-ish compare; pad to equal length so length doesn't leak via early exit.
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Token = base64url(exp) + "." + base64url(hmac(exp)). exp is epoch ms.
async function sign(secret, ttlMs = 30 * 24 * 60 * 60 * 1000) {
  const exp = String(Date.now() + ttlMs);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(exp));
  return `${b64url(enc.encode(exp))}.${b64url(sig)}`;
}

async function verify(secret, token) {
  if (!token || !token.includes('.')) return false;
  const [expPart, sigPart] = token.split('.');
  let exp;
  try { exp = atob(expPart.replace(/-/g, '+').replace(/_/g, '/')); } catch { return false; }
  const key = await hmacKey(secret);
  const expected = b64url(await crypto.subtle.sign('HMAC', key, enc.encode(exp)));
  if (!timingSafeEqual(expected, sigPart)) return false;
  return Number(exp) > Date.now();
}

function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  const m = raw.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? m[1] : null;
}

export async function requireAuth(request, env) {
  return verify(env.SESSION_SECRET, getCookie(request, 'session'));
}

export { timingSafeEqual, sign };
