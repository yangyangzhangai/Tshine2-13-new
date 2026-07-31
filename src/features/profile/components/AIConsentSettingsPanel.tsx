// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> src/features/profile/README.md -> docs/AI_USAGE_INVENTORY.md
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AI_CONSENT_VERSION, hasCurrentAiConsent } from '../../../lib/aiConsent';
import { useAuthStore } from '../../../store/useAuthStore';
import { InfoSheetPanel } from './InfoSheetPanel';
import { PrivacyPolicyPanel } from './PrivacyPolicyPanel';

interface Props {
  onClose: () => void;
}

export const AIConsentSettingsPanel: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const accountState = useAuthStore((state) => state.accountState);
  const updateAiConsent = useAuthStore((state) => state.updateAiConsent);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);
  const [checked, setChecked] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const granted = hasCurrentAiConsent(accountState);

  const updateConsent = async (status: 'granted' | 'withdrawn') => {
    if (status === 'granted' && !checked) return;
    setSaving(true);
    setError(false);
    const result = await updateAiConsent(status);
    if (!result.error && status === 'withdrawn') {
      await updatePreferences({ aiModeEnabled: false });
    }
    setError(Boolean(result.error));
    setChecked(false);
    setSaving(false);
  };

  if (showPrivacy) return <PrivacyPolicyPanel onClose={() => setShowPrivacy(false)} />;

  return (
    <InfoSheetPanel title={t('ai_consent_settings_title')} onClose={onClose}>
      <div className="rounded-2xl border border-[#5f7a63]/10 bg-[#edf7f1] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#5f7a63]">
          {t('ai_consent_status_label')}
        </p>
        <p className="mt-1 text-base font-extrabold text-slate-800">
          {granted ? t('ai_consent_status_granted') : t('ai_consent_status_off')}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {t('ai_consent_version', { version: accountState?.aiConsentVersion ?? AI_CONSENT_VERSION })}
        </p>
      </div>

      <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
        <div><h3 className="font-bold text-slate-700">{t('ai_consent_data_title')}</h3><p>{t('ai_consent_data_body')}</p></div>
        <div><h3 className="font-bold text-slate-700">{t('ai_consent_providers_title')}</h3><p>{t('ai_consent_providers_body')}</p></div>
        <div><h3 className="font-bold text-slate-700">{t('ai_consent_control_title')}</h3><p>{t('ai_consent_control_body')}</p></div>
      </div>

      <button
        type="button"
        onClick={() => setShowPrivacy(true)}
        className="mt-5 text-sm font-semibold text-[#4a6b55] underline underline-offset-4"
      >
        {t('ai_consent_read_privacy')}
      </button>

      {!granted ? (
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#5f7a63]/15 bg-white p-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 h-5 w-5 accent-[#4a6b55]"
          />
          <span className="text-sm font-semibold leading-5 text-slate-700">{t('ai_consent_checkbox')}</span>
        </label>
      ) : null}

      {error ? <p className="mt-3 text-sm font-semibold text-rose-600">{t('ai_consent_save_error')}</p> : null}

      <button
        type="button"
        disabled={saving || (!granted && !checked)}
        onClick={() => { void updateConsent(granted ? 'withdrawn' : 'granted'); }}
        className={`mt-5 w-full rounded-2xl px-4 py-3.5 text-sm font-bold disabled:opacity-40 ${
          granted ? 'border border-rose-200 bg-white text-rose-600' : 'bg-[#4a5d4c] text-white'
        }`}
      >
        {saving
          ? t('ai_consent_saving')
          : granted
            ? t('ai_consent_withdraw')
            : t('ai_consent_agree')}
      </button>

      <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 112px)' }} />
    </InfoSheetPanel>
  );
};
