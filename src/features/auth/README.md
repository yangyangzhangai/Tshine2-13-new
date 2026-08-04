# Auth Module

## Entry

- Page entry: `src/features/auth/AuthPage.tsx`

## Public Interface

- Route: `/auth`
- Main actions:
  - Sign in / sign up
  - Email-code registration verification (`signUp` + `verifyOtp(type='signup')`)
  - OAuth sign-in (Google / Apple) with platform-aware redirect (`web origin` vs `iOS deep link`)
  - Apple-linked deletion reauthorization through the native Apple sheet before token exchange/revocation
  - Auth-only entry for signed-out users (sign-out does not jump to onboarding)
  - Session restore via `useAuthStore.initialize()`
  - Sign out / preference updates are exposed by `useAuthStore` and consumed by other pages such as `/profile`

## Typography Semantics

- Auth and onboarding native text controls use the shared `app-form-text` semantic so visible input text stays at the app-wide `16px` form size.
- Page, modal, and supporting-copy typography uses the global semantic classes; authentication flow, validation, and account-state behavior remain feature-owned.
- Auth's display heading remains at the shared `30px` display tier; subtitles, statuses, secondary actions, social actions, CTA, divider, and agreement copy use the shared body/section/caption/badge tiers.
- Onboarding intentionally preserves its presentation hierarchy: the welcome heading stays at the `30px` display tier, step headings stay at the `24px` page-title tier with black weight, and AI companion names remain independent showcase labels.
- Onboarding subtitles, feature rows, field labels, statuses, secondary actions, primary CTAs, and the active Routine time-picker shell use the shared body/description/caption/badge/section-title/modal semantics without changing illustrations, card geometry, motion, or step behavior.

## Onboarding Gate

- Onboarding route: `/onboarding`
- Local development can preview the real trial-intro step at `/onboarding?preview=trial`; preview mode skips account-state writes and trial activation and is unavailable in production builds
- Welcome trial-intro feature rows use seven locally cropped transparent illustrations from `src/assets/onboarding/trial-features/`, mapped in feature order and rendered in a fixed `48px` contain box
- Trigger rule (in `src/App.tsx`): user is signed in and `useAuthStore.accountState.onboardingStatus` is `required` or `in_progress`
- Signed-out users always enter `/auth`; onboarding is reserved for newly registered users that still need first-time setup
- Session/profile refreshes preserve the in-memory profile only when the authenticated user ID is unchanged; switching accounts never inherits the previous account's onboarding profile
- Auth bootstrap now also ensures a `user_account_state` row exists for signed-in users; OAuth users therefore get the same onboarding gate as email signup instead of relying on `created_at` + profile fallback alone
- The same account-state row now carries versioned third-party AI consent. Consent is not bundled into email/social sign-in or the general Terms links; it is requested separately after onboarding, can be declined, and can later be withdrawn from Profile.
- Email-code registration starts a 60-second resend cooldown after the initial code and after each successful resend; the main auth page and onboarding auth step share the same countdown behavior

## Upstream Dependencies

- Store: `src/store/useAuthStore.ts` (`deleteAccount()` owns reauthorization, server deletion, sign-out, and local cleanup orchestration)
- Native Apple bridge: `src/services/native/appleSignInService.ts`
- Mobile OAuth bridge: `src/lib/mobileAuthBridge.ts` (Capacitor `appUrlOpen` callback handling)
- App routing: `src/App.tsx`
- i18n: `src/i18n/*`

## Downstream Impact

- Auth state controls route access in `src/App.tsx`
- User identity is consumed by chat/growth/report/plant stores for cloud sync and hydration

## Related Docs

- `LLM.md`
- `docs/PROJECT_MAP.md`
- `PROJECT_CONTEXT.md`
- `FEATURE_STATUS.md`
- `docs/CURRENT_TASK.md`
