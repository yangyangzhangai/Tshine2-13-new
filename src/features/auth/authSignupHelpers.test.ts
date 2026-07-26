import { describe, expect, it } from 'vitest';
import {
  getAuthErrorMessage,
  isDuplicateEmailError,
  isObfuscatedDuplicateSignUp,
} from './authSignupHelpers';

describe('authSignupHelpers', () => {
  it('detects duplicate email from decorated auth errors', () => {
    expect(isDuplicateEmailError({
      message: 'Supabase Auth signUp failed. User already registered',
      originalMessage: 'User already registered',
    })).toBe(true);
  });

  it('detects obfuscated duplicate signup payloads', () => {
    expect(isObfuscatedDuplicateSignUp({
      email: 'User@Example.com',
      data: {
        session: null,
        user: {
          email: 'user@example.com',
          identities: [],
        },
      },
      error: null,
    })).toBe(true);
  });

  it('does not treat normal signup responses as duplicates', () => {
    expect(isObfuscatedDuplicateSignUp({
      email: 'user@example.com',
      data: {
        session: null,
        user: {
          email: 'user@example.com',
          identities: [{ provider: 'email' }],
        },
      },
      error: null,
    })).toBe(false);
  });

  it('maps duplicate signup messages before generic diagnostic passthrough', () => {
    const t = (key: string) => key;
    expect(getAuthErrorMessage(t, 'Supabase Auth signUp failed. User already registered')).toBe('auth_error_user_exists');
  });
});
