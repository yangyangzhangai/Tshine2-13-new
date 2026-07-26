// DOC-DEPS: LLM.md -> docs/PROJECT_MAP.md -> src/features/auth/README.md -> src/store/useAuthStore.ts
type AuthLikeError = {
  message?: string;
  originalMessage?: string;
};

type AuthLikeIdentity = {
  provider?: string;
};

type AuthLikeUser = {
  email?: string | null;
  identities?: AuthLikeIdentity[];
};

type AuthLikeSignUpData = {
  session?: unknown;
  user?: AuthLikeUser | null;
};

const DUPLICATE_EMAIL_MARKERS = [
  'user already registered',
  'already registered',
];

function normalizeMessage(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export function isDuplicateEmailError(error: AuthLikeError | null | undefined): boolean {
  const message = normalizeMessage(error?.message);
  const originalMessage = normalizeMessage(error?.originalMessage);
  return DUPLICATE_EMAIL_MARKERS.some((marker) => (
    message.includes(marker) || originalMessage.includes(marker)
  ));
}

export function isObfuscatedDuplicateSignUp(params: {
  email: string;
  data?: AuthLikeSignUpData | null;
  error?: AuthLikeError | null;
}): boolean {
  if (params.error || !params.data || params.data.session) {
    return false;
  }

  const normalizedEmail = params.email.trim().toLowerCase();
  const userEmail = normalizeMessage(params.data.user?.email);
  const identities = params.data.user?.identities;
  return Boolean(
    normalizedEmail
    && userEmail
    && userEmail === normalizedEmail
    && Array.isArray(identities)
    && identities.length === 0
  );
}

export function getAuthErrorMessage(t: (key: string) => string, msg: string): string {
  if (isDuplicateEmailError({ message: msg })) return t('auth_error_user_exists');
  if (msg.includes('email rate limit exceeded')) return t('auth_error_rate_limit');
  if (msg.includes('Invalid login credentials')) return t('auth_error_invalid_credentials');
  if (msg.includes('Password should be at least')) return t('auth_error_password_short');
  if (msg.includes('invalid_grant')) return t('auth_error_invalid_grant');
  if (msg.includes('Token has expired') || msg.includes('token is expired')) return t('auth_error_invalid_grant');
  if (msg.includes('Invalid token') || msg.includes('invalid token')) return t('auth_error_invalid_grant');
  if (msg.includes('错误类型：') || msg.includes('requestId：') || msg.startsWith('Supabase Auth')) return msg;
  return t('auth_error_generic') + msg;
}
