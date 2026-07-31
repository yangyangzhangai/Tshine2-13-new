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
import { PrivacyPolicyPanel } from './PrivacyPolicyPanel';

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

  if (!shouldOpen) return null;
  if (showPrivacy) {
    return <PrivacyPolicyPanel onClose={() => setShowPrivacy(false)} />;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm md:items-center md:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-consent-title"
        className="max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[30px] bg-[#fcfaf7] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-6 shadow-2xl md:rounded-[30px] md:p-7"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-2xl bg-[#dff3e8] p-3 text-[#416a52]"><ShieldCheck size={24} /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5f7a63]">
              {t('ai_consent_version', { version: AI_CONSENT_VERSION })}
            </p>
            <h2 id="ai-consent-title" className="mt-1 text-xl font-extrabold text-slate-800">
              {t('ai_consent_title')}
            </h2>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-600">{t('ai_consent_intro')}</p>
        <div className="mt-5 space-y-4 rounded-2xl border border-[#5f7a63]/10 bg-white/75 p-4">
          <ConsentDetail icon={<BrainCircuit size={17} />} title={t('ai_consent_data_title')} body={t('ai_consent_data_body')} />
          <ConsentDetail icon={<CheckCircle2 size={17} />} title={t('ai_consent_providers_title')} body={t('ai_consent_providers_body')} />
          <ConsentDetail icon={<ShieldCheck size={17} />} title={t('ai_consent_control_title')} body={t('ai_consent_control_body')} />
        </div>

        <button
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="mt-4 text-sm font-semibold text-[#4a6b55] underline underline-offset-4"
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
          <span className="text-sm font-semibold leading-5 text-slate-700">{t('ai_consent_checkbox')}</span>
        </label>

        {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{t('ai_consent_save_error')}</p> : null}

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            disabled={!checked || saving}
            onClick={() => { void saveDecision('granted'); }}
            className="w-full rounded-2xl bg-[#4a5d4c] px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? t('ai_consent_saving') : t('ai_consent_agree')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => { void saveDecision('declined'); }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-600 disabled:opacity-40"
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
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="mt-0.5 text-xs leading-5 text-slate-500">{body}</p>
    </div>
  </div>
);
