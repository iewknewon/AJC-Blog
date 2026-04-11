const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

export const ADMIN_SESSION_COOKIE = 'ajc_admin_session';

function encodeBase64Url(input: Uint8Array) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return new Uint8Array(Buffer.from(`${normalized}${padding}`, 'base64'));
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signPayload(payload: string, secret: string) {
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return encodeBase64Url(new Uint8Array(signature));
}

export async function createAdminSessionToken(secret: string, now = Date.now()) {
  const payload = encodeBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        exp: now + SESSION_MAX_AGE_MS,
      }),
    ),
  );

  const signature = await signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyAdminSessionToken(token: string, secret: string, now = Date.now()) {
  const [payload, signature] = token.split('.');

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = await signPayload(payload, secret);

  if (signature !== expectedSignature) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(decodeBase64Url(payload)).toString('utf8')) as { exp?: number };
    return typeof decoded.exp === 'number' && decoded.exp > now;
  } catch {
    return false;
  }
}

export function getAdminSessionMaxAge() {
  return SESSION_MAX_AGE_SECONDS;
}
