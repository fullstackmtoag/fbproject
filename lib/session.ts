// Session cookie helpers. Safe to import from middleware (Web Crypto only).
// Do not import this from a Client Component — it reads SESSION_SECRET.

export const SESSION_COOKIE = 'session';

/** 7 days, in seconds. Matches the signed expiry inside the cookie. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // Browsers drop Secure cookies on http://localhost. Production (HTTPS) always sets Secure.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Compare two strings without leaking which one matched via an early return.
 * Both values are hashed to a fixed length first, then compared byte by byte.
 */
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const left = new Uint8Array(digestA);
  const right = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid session');
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Session is not configured');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** HMAC-SHA256 signed payload: base64url({"exp": ms}).base64url(signature). */
export async function signSession(now = Date.now()): Promise<string> {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify({ exp: now + SESSION_MAX_AGE_MS })),
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(payload)),
  );
  return `${payload}.${bytesToBase64Url(signature)}`;
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  if (!token || !process.env.SESSION_SECRET) return false;
  const dot = token.indexOf('.');
  if (dot <= 0 || token.indexOf('.', dot + 1) !== -1) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64UrlToBytes(signature);
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      signatureBytes,
      new TextEncoder().encode(payload),
    );
    if (!valid) return false;
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { exp?: unknown };
    return typeof data.exp === 'number' && Number.isFinite(data.exp) && data.exp > Date.now();
  } catch {
    return false;
  }
}
