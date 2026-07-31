// DOC-DEPS: LLM.md -> api/README.md -> src/server/apple-account-revoke.ts
import { generateKeyPairSync } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAppleClientSecret,
  revokeAppleAuthorization,
} from './apple-account-revoke';

const APPLE_SUBJECT = 'apple-user-subject';
const APPLE_CLIENT_ID = 'com.seeday.app';

function makeAppleUser(subject = APPLE_SUBJECT): User {
  return {
    id: 'supabase-user-id',
    app_metadata: { providers: ['apple'] },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-07-30T00:00:00.000Z',
    identities: [{
      id: subject,
      user_id: 'supabase-user-id',
      identity_data: { sub: subject },
      provider: 'apple',
      created_at: '2026-07-30T00:00:00.000Z',
      updated_at: '2026-07-30T00:00:00.000Z',
      last_sign_in_at: '2026-07-30T00:00:00.000Z',
    }],
  };
}

function makeIdToken(subject = APPLE_SUBJECT): string {
  const header = Buffer.from('{}').toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: APPLE_CLIENT_ID,
    sub: subject,
  })).toString('base64url');
  return `${header}.${payload}.signature`;
}

function parseRequestBody(call: unknown[]): URLSearchParams {
  const init = call[1] as RequestInit;
  return new URLSearchParams(String(init.body));
}

describe('Apple account authorization revocation', () => {
  beforeEach(() => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    vi.stubEnv('APPLE_SIGN_IN_TEAM_ID', 'TEAMID1234');
    vi.stubEnv('APPLE_SIGN_IN_KEY_ID', 'SIGNINKEY1');
    vi.stubEnv('APPLE_SIGN_IN_CLIENT_ID', APPLE_CLIENT_ID);
    vi.stubEnv('APPLE_SIGN_IN_PRIVATE_KEY', privateKey.export({
      type: 'pkcs8',
      format: 'pem',
    }).toString());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exchanges a fresh authorization code and revokes the resulting refresh token', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        refresh_token: 'apple-refresh-token',
        id_token: makeIdToken(),
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await revokeAppleAuthorization(
      makeAppleUser(),
      { authorizationCode: 'fresh-authorization-code' },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://appleid.apple.com/auth/token');
    expect(parseRequestBody(fetchMock.mock.calls[0]).get('code')).toBe('fresh-authorization-code');
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://appleid.apple.com/auth/revoke');
    expect(parseRequestBody(fetchMock.mock.calls[1]).get('token')).toBe('apple-refresh-token');
    expect(parseRequestBody(fetchMock.mock.calls[1]).get('token_type_hint')).toBe('refresh_token');
  });

  it('stops before deletion when Apple reauthorization belongs to another identity', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      refresh_token: 'wrong-user-refresh-token',
      id_token: makeIdToken('different-apple-user'),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(revokeAppleAuthorization(
      makeAppleUser(),
      { authorizationCode: 'authorization-code' },
      fetchMock,
    )).rejects.toThrow('apple_reauthorization_identity_mismatch');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires a fresh code for an Apple-linked account', async () => {
    await expect(revokeAppleAuthorization(
      makeAppleUser(),
      {},
      vi.fn(),
    )).rejects.toThrow('missing_apple_authorization_code');
  });

  it('builds a short-lived ES256 client secret from Sign in with Apple credentials', () => {
    const [header, payload, signature] = buildAppleClientSecret().split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    expect(header).toBeTruthy();
    expect(signature).toBeTruthy();
    expect(claims.iss).toBe('TEAMID1234');
    expect(claims.sub).toBe(APPLE_CLIENT_ID);
    expect(claims.exp - claims.iat).toBe(300);
  });
});
