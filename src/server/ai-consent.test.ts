// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> docs/AI_USAGE_INVENTORY.md
import { describe, expect, it, vi } from 'vitest';
import { AI_CONSENT_VERSION } from '../lib/aiConsent';
import { readCurrentAiConsent } from './ai-consent';

function createDb(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { db: { from } as never, from, select, eq, maybeSingle };
}

describe('readCurrentAiConsent', () => {
  it('accepts only the current granted consent version', async () => {
    const { db } = createDb({
      data: { ai_consent_status: 'granted', ai_consent_version: AI_CONSENT_VERSION },
      error: null,
    });
    await expect(readCurrentAiConsent(db, 'user-1')).resolves.toBe('granted');
  });

  it('rejects an old consent version', async () => {
    const { db } = createDb({
      data: { ai_consent_status: 'granted', ai_consent_version: 'old-version' },
      error: null,
    });
    await expect(readCurrentAiConsent(db, 'user-1')).resolves.toBe('not_granted');
  });

  it('fails closed when consent cannot be read', async () => {
    const { db } = createDb({ data: null, error: new Error('schema unavailable') });
    await expect(readCurrentAiConsent(db, 'user-1')).resolves.toBe('unavailable');
  });
});
