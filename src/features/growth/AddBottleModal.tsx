import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { type BottleType } from '../../store/useGrowthStore';
import { cn } from '../../lib/utils';
import {
  APP_MODAL_CARD_CLASS,
  APP_MODAL_CLOSE_CLASS,
  APP_GREEN_GLASS_BUTTON_STYLE,
  APP_MODAL_INPUT_CLASS,
  APP_MODAL_OVERLAY_CLASS,
  APP_MODAL_TITLE_CLASS,
} from '../../lib/modalTheme';
import { triggerLightHaptic } from '../../lib/haptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, type: BottleType) => void;
  error?: string;
}

export const AddBottleModal = ({ isOpen, onClose, onAdd, error }: Props) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<BottleType>('habit');
  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), type);
    // Note: onClose / reset are handled by the parent after checking for errors
  };

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', APP_MODAL_OVERLAY_CLASS)}>
      <div className={cn(APP_MODAL_CARD_CLASS, 'animate-in zoom-in-95 fade-in w-[min(92vw,420px)] max-h-[86vh] overflow-y-auto rounded-2xl p-6')}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={APP_MODAL_TITLE_CLASS}>{t('growth_add_bottle_modal_title')}</h3>
          <button onClick={onClose} className={cn(APP_MODAL_CLOSE_CLASS, 'p-1')}><X size={24} strokeWidth={1.5} /></button>
        </div>

        <label className="app-body mb-1 block font-medium text-slate-600">
          {t('growth_bottle_name')}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
          enterKeyHint="done"
          placeholder={t('growth_bottle_name_placeholder')}
          className={cn(
            APP_MODAL_INPUT_CLASS,
            'mb-1 w-full p-3',
            error ? "border-red-400" : "border-gray-200"
          )}
        />
        {error && <p className="app-caption mb-3 text-red-500">{error}</p>}

        <label className="app-body mb-2 block font-medium text-slate-600">
          {t('growth_bottle_type')}
        </label>
        <div className="flex gap-3 mb-6">
          {(['habit', 'goal'] as const).map((bt) => (
            <button
              key={bt}
              onClick={() => {
                triggerLightHaptic();
                setType(bt);
              }}
              className={cn(
                'app-body flex-1 rounded-xl border py-2 font-medium transition-all',
                type === bt
                  ? 'text-[#426D56]'
                  : 'border-transparent bg-[rgba(248,251,241,0.82)] text-[#506547]'
              )}
              style={type === bt ? APP_GREEN_GLASS_BUTTON_STYLE : undefined}
            >
              {bt === 'habit' ? t('growth_bottle_type_habit') : t('growth_bottle_type_goal')}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            if (!name.trim()) return;
            triggerLightHaptic();
            handleSubmit();
          }}
          disabled={!name.trim()}
          className={cn(
            'app-body w-full rounded-2xl border py-2.5 font-medium text-[#426D56] transition-opacity disabled:cursor-not-allowed disabled:opacity-40'
          )}
          style={APP_GREEN_GLASS_BUTTON_STYLE}
        >
          {t('confirm')}
        </button>
      </div>
    </div>
  );
};
