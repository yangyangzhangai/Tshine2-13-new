// DOC-DEPS: LLM.md -> docs/SEEDAY_DEV_SPEC.md -> src/features/auth/README.md
import { Capacitor } from '@capacitor/core';

export interface NativeAppleAuthorization {
  authorizationCode: string;
  identityToken: string;
}

export function isNativeAppleSignInAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function authorizeWithNativeApple(
  redirectURI: string,
): Promise<NativeAppleAuthorization> {
  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
  const result = await SignInWithApple.authorize({
    clientId: 'com.seeday.app',
    redirectURI,
    scopes: 'email name',
  });
  const authorizationCode = result.response?.authorizationCode?.trim();
  const identityToken = result.response?.identityToken?.trim();
  if (!authorizationCode) throw new Error('No Apple authorization code');
  if (!identityToken) throw new Error('No Apple identity token');
  return { authorizationCode, identityToken };
}
