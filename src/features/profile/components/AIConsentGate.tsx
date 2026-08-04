// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> src/features/profile/README.md -> docs/AI_USAGE_INVENTORY.md
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrainCircuit, CheckCircle2, ShieldCheck } from 'lucide-react';
import {
  AI_CONSENT_REQUIRED_EVENT,
  AI_CONSENT_VERSION,
  hasCurrentAiConsent,
} from '../../../lib/aiConsent';
import { useAuthStore } from '../../../store/useAuthStore';
import { cn } from '../../../lib/utils';
import {
  APP_MODAL_CARD_CLASS,
  APP_MODAL_OVERLAY_CLASS,
  APP_MODAL_PRIMARY_BUTTON_CLASS,
  APP_MODAL_SECONDARY_BUTTON_CLASS,
} from '../../../lib/modalTheme';
import { PrivacyPolicyPanel } from './PrivacyPolicyPanel';

function isDevUiPreview(): boolean {
  if (!import.meta.env.DEV) return false;
  const hashQuery = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(hashQuery).get('preview') === 'ui';
}

export const AIConsentGate: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const accountState = useAuthStore((state) => state.accountState);
  const updateAiConsent = useAuthStore((state) => state.updateAiConsent);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);
  const [forcedOpen, setForcedOpen] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);

  React.useEffect(() => {
    const open = () => setForcedOpen(true);
    window.addEventListener(AI_CONSENT_REQUIRED_EVENT, open);
    return () => window.removeEventListener(AI_CONSENT_REQUIRED_EVENT, open);
  }, []);

  const status = accountState?.aiConsentStatus ?? 'unknown';
  const outdatedGrant = status === 'granted' && !hasCurrentAiConsent(accountState);
  const shouldOpen = Boolean(user?.id) && (status === 'unknown' || outdatedGrant || forcedOpen);

  const saveDecision = async (decision: 'granted' | 'declined') => {
    if (decision === 'granted' && !checked) return;
    setSaving(true);
    setError(false);
    const result = await updateAiConsent(decision);
    if (result.error) {
      setError(true);
      setSaving(false);
      return;
    }
    if (decision === 'declined') {
      await updatePreferences({ aiModeEnabled: false });
    }
    setForcedOpen(false);
    setChecked(false);
    setSaving(false);
  };

  if (!shouldOpen || isDevUiPreview()) return null;
  if (showPrivacy) {
    return <PrivacyPolicyPanel onClose={() => setShowPrivacy(false)} />;
  }

  return (
    <div className={cn('fixed inset-0 z-[120] flex items-end justify-center md:items-center', APP_MODAL_OVERLAY_CLASS)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-consent-title"
        className={cn(
          APP_MODAL_CARD_CLASS,
          'app-mobile-sheet-card w-full max-w-[520px] rounded-t-[30px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-6 md:rounded-[30px] md:p-7',
        )}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-2xl bg-[#dff3e8] p-3 text-[#416a52]"><ShieldCheck size={24} /></div>
          <div>
            <p className="app-badge font-bold uppercase text-[#5f7a63]">
              {t('ai_consent_version', { version: AI_CONSENT_VERSION })}
            </p>
            <h2 id="ai-consent-title" className="app-section-title mt-1 font-extrabold text-slate-800">
              {t('ai_consent_title')}
            </h2>
          </div>
        </div>

        <p className="app-body text-slate-600">{t('ai_consent_intro')}</p>
        <div className="mt-5 space-y-4 rounded-2xl border border-[#5f7a63]/10 bg-white/75 p-4">
          <ConsentDetail icon={<BrainCircuit size={17} />} title={t('ai_consent_data_title')} body={t('ai_consent_data_body')} />
          <ConsentDetail icon={<CheckCircle2 size={17} />} title={t('ai_consent_providers_title')} body={t('ai_consent_providers_body')} />
          <ConsentDetail icon={<ShieldCheck size={17} />} title={t('ai_consent_control_title')} body={t('ai_consent_control_body')} />
        </div>

        <button
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="app-body mt-4 font-semibold text-[#4a6b55] underline underline-offset-4"
        >
          {t('ai_consent_read_privacy')}
        </button>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#5f7a63]/15 bg-[#edf7f1] p-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[#4a6b55]"
          />
          <span className="app-body font-semibold text-slate-700">{t('ai_consent_checkbox')}</span>
        </label>

        {error ? <p className="app-body mt-3 font-semibold text-rose-600">{t('ai_consent_save_error')}</p> : null}

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            disabled={!checked || saving}
            onClick={() => { void saveDecision('granted'); }}
            className={cn(APP_MODAL_PRIMARY_BUTTON_CLASS, 'app-body w-full px-4 py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-40')}
          >
            {saving ? t('ai_consent_saving') : t('ai_consent_agree')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => { void saveDecision('declined'); }}
            className={cn(APP_MODAL_SECONDARY_BUTTON_CLASS, 'app-body w-full px-4 py-3.5 font-bold disabled:opacity-40')}
          >
            {t('ai_consent_without_ai')}
          </button>
        </div>
      </section>
    </div>
  );
};

const ConsentDetail: React.FC<{ icon: React.ReactNode; title: string; body: string }> = ({ icon, title, body }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 text-[#5f7a63]">{icon}</div>
    <div>
      <h3 className="app-body font-bold text-slate-700">{title}</h3>
      <p className="app-description mt-0.5 text-slate-500">{body}</p>
    </div>
  </div>
);
