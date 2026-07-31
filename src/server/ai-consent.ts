// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> docs/AI_USAGE_INVENTORY.md -> api/README.md
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AI_CONSENT_VERSION } from '../lib/aiConsent.js';
import { requireSupabaseRequestAuth } from './supabase-request-auth.js';

type RequestAuth = NonNullable<Awaited<ReturnType<typeof requireSupabaseRequestAuth>>>;

type ConsentReadResult = 'granted' | 'not_granted' | 'unavailable';

export async function readCurrentAiConsent(
  db: SupabaseClient,
  userId: string,
): Promise<ConsentReadResult> {
  const { data, error } = await db
    .from('user_account_state')
    .select('ai_consent_status,ai_consent_version')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return 'unavailable';
  if (
    data?.ai_consent_status === 'granted'
    && data.ai_consent_version === AI_CONSENT_VERSION
  ) {
    return 'granted';
  }
  return 'not_granted';
}

export async function requireAiConsentForAuth(
  auth: RequestAuth,
  res: VercelResponse,
): Promise<boolean> {
  const db = auth.adminClient ?? auth.userClient;
  const result = await readCurrentAiConsent(db, auth.user.id);
  if (result === 'granted') return true;

  if (result === 'unavailable') {
    res.status(503).json({
      error: 'ai_consent_verification_failed',
      code: 'ai_consent_verification_failed',
    });
    return false;
  }

  res.status(403).json({
    error: 'ai_consent_required',
    code: 'ai_consent_required',
    consentVersion: AI_CONSENT_VERSION,
  });
  return false;
}

export async function requireSupabaseAiConsent(
  req: VercelRequest,
  res: VercelResponse,
): Promise<RequestAuth | null> {
  const auth = await requireSupabaseRequestAuth(req, res);
  if (!auth) return null;
  return (await requireAiConsentForAuth(auth, res)) ? auth : null;
}
