// DOC-DEPS: LLM.md -> api/README.md -> docs/AI_USAGE_INVENTORY.md
import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import type { User } from '@supabase/supabase-js';

const APPLE_AUDIENCE = 'https://appleid.apple.com';
const APPLE_TOKEN_URL = `${APPLE_AUDIENCE}/auth/token`;
const APPLE_REVOKE_URL = `${APPLE_AUDIENCE}/auth/revoke`;

interface AppleTokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  id_token?: unknown;
}

interface AppleIdTokenPayload {
  aud?: unknown;
  sub?: unknown;
}

export interface AppleRevokeInput {
  authorizationCode?: string;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function decodeJwtPayload(token: string): AppleIdTokenPayload {
  const encoded = token.split('.')[1];
  if (!encoded) throw new Error('invalid_apple_identity_token');
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AppleIdTokenPayload;
  } catch {
    throw new Error('invalid_apple_identity_token');
  }
}

function getAppleIdentitySubject(user: User): string | null {
  const identity = user.identities?.find((candidate) => candidate?.provider === 'apple');
  const subject = identity?.identity_data?.sub;
  if (typeof subject === 'string' && subject.trim()) return subject.trim();
  return typeof identity?.id === 'string' && identity.id.trim() ? identity.id.trim() : null;
}

export function hasAppleIdentity(user: User): boolean {
  if (Array.isArray(user.identities)) {
    return user.identities.some((identity) => identity?.provider === 'apple');
  }
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes('apple');
}

function getAppleSignInConfig(): {
  teamId: string;
  keyId: string;
  privateKey: string;
  clientId: string;
} {
  const teamId = process.env.APPLE_SIGN_IN_TEAM_ID?.trim();
  const keyId = process.env.APPLE_SIGN_IN_KEY_ID?.trim();
  const privateKey = process.env.APPLE_SIGN_IN_PRIVATE_KEY?.trim().replace(/\\n/g, '\n');
  const clientId = (process.env.APPLE_SIGN_IN_CLIENT_ID || process.env.APPLE_IAP_BUNDLE_ID || '').trim();
  if (!teamId || !keyId || !privateKey || !clientId) {
    throw new Error('missing_apple_revoke_config');
  }
  return { teamId, keyId, privateKey, clientId };
}

export function buildAppleClientSecret(): string {
  const { teamId, keyId, privateKey, clientId } = getAppleSignInConfig();
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: teamId,
    iat: nowSec,
    exp: nowSec + 300,
    aud: APPLE_AUDIENCE,
    sub: clientId,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = cryptoSign('sha256', Buffer.from(unsigned), {
    key: createPrivateKey(privateKey),
    dsaEncoding: 'ieee-p1363',
  });
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

async function postAppleForm(
  url: string,
  params: URLSearchParams,
  fetchImpl: typeof fetch,
): Promise<Response> {
  return fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
}

function assertMatchingAppleIdentity(user: User, idToken: string, clientId: string): void {
  const expectedSubject = getAppleIdentitySubject(user);
  if (!expectedSubject) throw new Error('missing_apple_identity_subject');
  const payload = decodeJwtPayload(idToken);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (payload.sub !== expectedSubject || !audiences.includes(clientId)) {
    throw new Error('apple_reauthorization_identity_mismatch');
  }
}

async function exchangeAuthorizationCode(
  user: User,
  authorizationCode: string,
  fetchImpl: typeof fetch,
): Promise<{ token: string; tokenTypeHint: 'refresh_token' | 'access_token' }> {
  const { clientId } = getAppleSignInConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: buildAppleClientSecret(),
    code: authorizationCode,
    grant_type: 'authorization_code',
  });
  const response = await postAppleForm(APPLE_TOKEN_URL, params, fetchImpl);
  if (!response.ok) throw new Error(`apple_token_exchange_failed_${response.status}`);
  const data = await response.json() as AppleTokenResponse;
  if (typeof data.id_token !== 'string') throw new Error('missing_apple_identity_token');
  assertMatchingAppleIdentity(user, data.id_token, clientId);
  if (typeof data.refresh_token === 'string' && data.refresh_token) {
    return { token: data.refresh_token, tokenTypeHint: 'refresh_token' };
  }
  if (typeof data.access_token === 'string' && data.access_token) {
    return { token: data.access_token, tokenTypeHint: 'access_token' };
  }
  throw new Error('missing_apple_revoke_token');
}

export async function revokeAppleAuthorization(
  user: User,
  input: AppleRevokeInput,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!hasAppleIdentity(user)) return;
  if (!input.authorizationCode) throw new Error('missing_apple_authorization_code');
  const { clientId } = getAppleSignInConfig();
  const credential = await exchangeAuthorizationCode(user, input.authorizationCode, fetchImpl);
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: buildAppleClientSecret(),
    token: credential.token,
    token_type_hint: credential.tokenTypeHint,
  });
  const response = await postAppleForm(APPLE_REVOKE_URL, params, fetchImpl);
  if (!response.ok) throw new Error(`apple_revoke_failed_${response.status}`);
}
