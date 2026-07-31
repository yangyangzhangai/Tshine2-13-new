// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> src/store/README.md -> docs/AI_USAGE_INVENTORY.md
import { AI_CONSENT_VERSION } from '../lib/aiConsent';
import type { AiConsentStatus, UserAccountState } from '../types/userAccountState';
import { mergeAccountState } from './authAccountStateHelpers';

export function buildAiConsentState(
  previousState: UserAccountState | null,
  status: Exclude<AiConsentStatus, 'unknown'>,
  nowIso: string = new Date().toISOString(),
): UserAccountState {
  return mergeAccountState(previousState, {
    aiConsentStatus: status,
    aiConsentVersion: AI_CONSENT_VERSION,
    aiConsentUpdatedAt: nowIso,
    ...(status === 'granted' ? { aiConsentGrantedAt: nowIso } : {}),
    ...(status === 'withdrawn' ? { aiConsentWithdrawnAt: nowIso } : {}),
  });
}
