// DOC-DEPS: LLM.md -> api/README.md
import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handlePreflight, jsonError, requireMethod } from '../src/server/http.js';
import { requireSupabaseRequestAuth } from '../src/server/supabase-request-auth.js';

const STORAGE_BUCKET = 'seeday-images';
const STORAGE_PAGE_SIZE = 100;

const USER_TABLES = [
  'moods',
  'messages',
  'todos',
  'bottles',
  'focus_sessions',
  'timing_sessions',
  'reports',
  'annotations',
  'stardust_memories',
  'daily_plant_records',
  'plant_direction_config',
  'user_stats',
  'live_input_events',
  'plant_asset_events',
  'telemetry_events',
  'user_feedback',
  'reminder_responses',
  'user_login_days',
  'user_profiles',
  'user_account_state',
] as const;

interface DeleteAccountRequestBody {
  providerToken?: unknown;
  providerRefreshToken?: unknown;
}

interface AppleRevokeInput {
  providerToken?: string;
  providerRefreshToken?: string;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getRequestBody(req: VercelRequest): DeleteAccountRequestBody {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return {};
  }
  return req.body as DeleteAccountRequestBody;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function buildAppleRevokeClientSecret(): string {
  const teamId = process.env.APPLE_IAP_ISSUER_ID?.trim();
  const keyId = process.env.APPLE_IAP_KEY_ID?.trim();
  const privateKeyRaw = process.env.APPLE_IAP_PRIVATE_KEY?.trim().replace(/\\n/g, '\n');
  const clientId = (process.env.APPLE_SIGN_IN_CLIENT_ID || process.env.APPLE_IAP_BUNDLE_ID || '').trim();
  if (!teamId || !keyId || !privateKeyRaw || !clientId) {
    throw new Error('missing_apple_revoke_config');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const encodedHeader = base64UrlEncode(JSON.stringify({
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT',
  }));
  const encodedPayload = base64UrlEncode(JSON.stringify({
    iss: teamId,
    iat: nowSec,
    exp: nowSec + 300,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  }));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = cryptoSign('sha256', Buffer.from(unsigned), {
    key: createPrivateKey(privateKeyRaw),
    dsaEncoding: 'ieee-p1363',
  });
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

function hasAppleIdentity(user: User): boolean {
  if (Array.isArray(user.identities)) {
    return user.identities.some((identity) => identity?.provider === 'apple');
  }
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes('apple');
}

async function revokeAppleToken(user: User, input: AppleRevokeInput): Promise<void> {
  if (!hasAppleIdentity(user)) {
    return;
  }

  const token = input.providerRefreshToken || input.providerToken;
  if (!token) {
    throw new Error('missing_apple_provider_token');
  }

  const clientId = (process.env.APPLE_SIGN_IN_CLIENT_ID || process.env.APPLE_IAP_BUNDLE_ID || '').trim();
  if (!clientId) {
    throw new Error('missing_apple_client_id');
  }

  const clientSecret = buildAppleRevokeClientSecret();
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    token,
    token_type_hint: input.providerRefreshToken ? 'refresh_token' : 'access_token',
  });
  const response = await fetch('https://appleid.apple.com/auth/revoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!response.ok) {
    throw new Error(`apple_revoke_failed_${response.status}`);
  }
}

async function deleteUserRows(adminClient: SupabaseClient, userId: string): Promise<void> {
  for (const table of USER_TABLES) {
    const { error } = await adminClient.from(table).delete().eq('user_id', userId);
    if (error) {
      throw new Error(`delete_failed:${table}:${error.message}`);
    }
  }
}

async function listStoragePaths(
  adminClient: SupabaseClient,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await adminClient.storage.from(STORAGE_BUCKET).list(prefix, {
      limit: STORAGE_PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) {
      throw new Error(`storage_list_failed:${prefix}:${error.message}`);
    }
    if (!data?.length) {
      break;
    }

    for (const entry of data) {
      if (!entry.name) continue;
      const fullPath = `${prefix}/${entry.name}`;
      if (entry.id) {
        paths.push(fullPath);
        continue;
      }
      paths.push(...await listStoragePaths(adminClient, fullPath));
    }

    if (data.length < STORAGE_PAGE_SIZE) {
      break;
    }
    offset += data.length;
  }

  return paths;
}

async function deleteStorageObjects(adminClient: SupabaseClient, userId: string): Promise<void> {
  const paths = await listStoragePaths(adminClient, userId);
  if (!paths.length) {
    return;
  }

  for (let index = 0; index < paths.length; index += STORAGE_PAGE_SIZE) {
    const batch = paths.slice(index, index + STORAGE_PAGE_SIZE);
    const { error } = await adminClient.storage.from(STORAGE_BUCKET).remove(batch);
    if (error) {
      throw new Error(`storage_remove_failed:${error.message}`);
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handlePreflight(req, res)) return;
  if (!requireMethod(req, res, 'POST')) return;

  const auth = await requireSupabaseRequestAuth(req, res);
  if (!auth) return;

  const { user, adminClient } = auth;
  if (!adminClient) {
    return jsonError(res, 503, 'SUPABASE_SERVICE_ROLE_KEY is required for account deletion');
  }

  const body = getRequestBody(req);
  const appleInput: AppleRevokeInput = {
    providerToken: normalizeOptionalString(body.providerToken) ?? undefined,
    providerRefreshToken: normalizeOptionalString(body.providerRefreshToken) ?? undefined,
  };

  try {
    await revokeAppleToken(user, appleInput);
    await deleteStorageObjects(adminClient, user.id);
    await deleteUserRows(adminClient, user.id);

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      throw new Error(`auth_delete_failed:${authDeleteError.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'delete_account_failed';
    const status = message.startsWith('missing_apple_') ? 409 : 500;
    return jsonError(res, status, message);
  }

  res.status(200).json({ ok: true });
}
