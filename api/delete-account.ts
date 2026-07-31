// DOC-DEPS: LLM.md -> api/README.md
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  deleteStorageObjects,
  deleteUserRows,
} from '../src/server/account-deletion-data.js';
import {
  revokeAppleAuthorization,
  type AppleRevokeInput,
} from '../src/server/apple-account-revoke.js';
import { applyCors, handlePreflight, jsonError, requireMethod } from '../src/server/http.js';
import { requireSupabaseRequestAuth } from '../src/server/supabase-request-auth.js';

interface DeleteAccountRequestBody {
  authorizationCode?: unknown;
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
    authorizationCode: normalizeOptionalString(body.authorizationCode) ?? undefined,
  };

  try {
    await revokeAppleAuthorization(user, appleInput);
    await deleteStorageObjects(adminClient, user.id);
    await deleteUserRows(adminClient, user.id);

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      throw new Error(`auth_delete_failed:${authDeleteError.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'delete_account_failed';
    const status = message.startsWith('missing_apple_')
      || message === 'apple_reauthorization_identity_mismatch'
      ? 409
      : 500;
    return jsonError(res, status, message);
  }

  res.status(200).json({ ok: true });
}
