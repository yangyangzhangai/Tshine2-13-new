// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> src/features/report/README.md
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { reportTelemetryEvent } from '../../../services/input/reportTelemetryEvent';
import { usePlantStore } from '../../../store/usePlantStore';
import { DEFAULT_DIRECTION_ORDER } from '../../../types/plant';
import type { PlantCategoryKey } from '../../../types/plant';
import {
  APP_GREEN_GLASS_TEXT,
  APP_PROFILE_JELLY_BUTTON_STYLE,
} from '../../../lib/modalTheme';
import { AppSelectMenu } from '../../../components/AppSelectMenu';

interface DirectionSettingsPanelProps {
  onClose: () => void;
}

interface DirectionSlot {
  index: 0 | 1 | 2 | 3 | 4;
  positionKey: string;
}

const SLOTS: DirectionSlot[] = [
  { index: 0, positionKey: 'plant_direction_left_bottom' },
  { index: 1, positionKey: 'plant_direction_left_top' },
  { index: 2, positionKey: 'plant_direction_top' },
  { index: 3, positionKey: 'plant_direction_right_top' },
  { index: 4, positionKey: 'plant_direction_right_bottom' },
];

const CATEGORIES: PlantCategoryKey[] = ['work_study', 'exercise', 'social', 'entertainment', 'life'];

function toCategoryLabelKey(category: PlantCategoryKey): string {
  switch (category) {
    case 'work_study':
      return 'plant_category_work_study';
    case 'exercise':
      return 'plant_category_exercise';
    case 'social':
      return 'category_social';
    case 'entertainment':
      return 'category_entertainment';
    default:
      return 'category_life';
  }
}

function buildDirectionTelemetryPayload(order: PlantCategoryKey[]) {
  return {
    order,
    leftBottom: order[0],
    leftTop: order[1],
    top: order[2],
    rightTop: order[3],
    rightBottom: order[4],
  };
}

export const DirectionSettingsPanel: React.FC<DirectionSettingsPanelProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const directionOrder = usePlantStore(state => state.directionOrder);
  const setDirectionOrder = usePlantStore(state => state.setDirectionOrder);
  const [draft, setDraft] = useState<PlantCategoryKey[]>(() => [...directionOrder]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const language = i18n.language?.toLowerCase() ?? 'en';
  const selectionWidthClass = language.startsWith('zh')
    ? 'w-[110px]'
    : language.startsWith('it')
      ? 'w-[155px]'
      : 'w-[155px]';

  const stableDraft = useMemo(
    () => (draft.length === 5 ? draft : [...DEFAULT_DIRECTION_ORDER]),
    [draft],
  );

  const duplicateCategories = useMemo(() => {
    const counts = new Map<PlantCategoryKey, number>();
    stableDraft.forEach(category => {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([category]) => category),
    );
  }, [stableDraft]);

  const hasDuplicateSelection = duplicateCategories.size > 0;

  useEffect(() => {
    const prev = document.body.style.overflow;
    const scrollContainers = Array.from(document.querySelectorAll<HTMLElement>('.app-scroll-container'));
    const prevScrollStyles = scrollContainers.map((element) => ({
      element,
      overflowY: element.style.overflowY,
      touchAction: element.style.touchAction,
    }));

    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('profile-sheet-open');
    document.body.classList.add('profile-sheet-open');
    scrollContainers.forEach((element) => {
      element.style.overflowY = 'hidden';
      element.style.touchAction = 'none';
    });

    const preventBackgroundTouchMove = (event: TouchEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-root-direction-card="true"]')) return;
      event.preventDefault();
    };
    document.addEventListener('touchmove', preventBackgroundTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = prev;
      document.documentElement.classList.remove('profile-sheet-open');
      document.body.classList.remove('profile-sheet-open');
      prevScrollStyles.forEach(({ element, overflowY, touchAction }) => {
        element.style.overflowY = overflowY;
        element.style.touchAction = touchAction;
      });
      document.removeEventListener('touchmove', preventBackgroundTouchMove);
    };
  }, []);

  const updateSlot = (slotIndex: 0 | 1 | 2 | 3 | 4, value: PlantCategoryKey) => {
    const next = [...stableDraft];
    const previous = next[slotIndex];
    next[slotIndex] = value;
    setDraft(next);
    setSaveError(null);
    if (previous !== value) {
      void reportTelemetryEvent('root_direction_changed', {
        slotIndex,
        from: previous,
        to: value,
        order: next,
      });
    }
  };

  const handleSave = async () => {
    if (hasDuplicateSelection) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      await setDirectionOrder(stableDraft);
      void reportTelemetryEvent('root_direction_saved', buildDirectionTelemetryPayload(stableDraft));
      onClose();
    } catch {
      void reportTelemetryEvent('root_direction_save_failed', buildDirectionTelemetryPayload(stableDraft));
      setSaveError(t('profile_root_direction_save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const panel = (
    <div className="app-viewport-fixed z-[9999] flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/45 backdrop-blur-[4px]"
        onClick={onClose}
      />
      <div
        data-root-direction-card="true"
        className="app-mobile-sheet-card relative flex min-h-0 w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[30px]"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
          <h3 className="app-section-title font-bold text-[#1C2E24]">{t('profile_root_direction_settings')}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="app-hit-target-44 rounded-full p-2 transition hover:bg-black/5"
          >
            <X size={18} className="text-[#1C2E24]" />
          </button>
        </div>

        <div className="app-modal-scroll min-h-0 flex-1 px-5 pb-4">
          <p className="app-description font-medium text-[#5F7A63]">{t('profile_root_direction_settings_desc')}</p>

          <div className="mt-4 space-y-2.5">
            {SLOTS.map(slot => {
              const isDuplicate = duplicateCategories.has(stableDraft[slot.index]);
              return (
                <div
                  key={slot.positionKey}
                  className={`relative flex min-h-[58px] items-center justify-between gap-3 rounded-2xl px-4 py-3 transition ${
                    isDuplicate ? 'bg-red-50/80' : 'bg-[#F7F9F8] active:bg-[#EEF5F0]'
                  }`}
                >
                  <span className={`app-item-title font-medium ${isDuplicate ? 'text-red-600' : 'text-[#1C2E24]'}`}>
                    {t(slot.positionKey)}
                  </span>
                  <AppSelectMenu
                    value={stableDraft[slot.index]}
                    options={CATEGORIES.map(category => ({
                      value: category,
                      label: t(toCategoryLabelKey(category)),
                    }))}
                    onChange={value => updateSlot(slot.index, value as PlantCategoryKey)}
                    ariaLabel={t(slot.positionKey)}
                    className={`${selectionWidthClass} shrink-0`}
                    placement={slot.index >= 3 ? 'top' : 'bottom'}
                    size="compact"
                    invalid={isDuplicate}
                  />
                </div>
              );
            })}
          </div>

          {hasDuplicateSelection && (
            <p className="app-caption mt-2 text-red-500">{t('profile_root_direction_duplicate_error')}</p>
          )}
          {saveError && (
            <p className="app-caption mt-2 text-red-500">{saveError}</p>
          )}
        </div>

        <div
          className="flex shrink-0 items-center gap-2 border-t border-black/5 bg-white px-5 pt-3"
          style={{ paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 10px))' }}
        >
          <button
            type="button"
            onClick={() => {
              setDraft([...DEFAULT_DIRECTION_ORDER]);
              setSaveError(null);
              void reportTelemetryEvent('root_direction_reset', buildDirectionTelemetryPayload(DEFAULT_DIRECTION_ORDER));
            }}
            className="app-body min-h-11 flex-1 rounded-[50px] border border-[#CBE7D7] bg-white px-4 font-semibold text-[#355643] transition hover:bg-[#F7F9F8]"
          >
            {t('profile_root_direction_reset')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || hasDuplicateSelection}
            className="app-body min-h-11 flex-1 rounded-[50px] border border-transparent px-4 font-semibold text-[#355643] disabled:opacity-60"
            style={{
              ...APP_PROFILE_JELLY_BUTTON_STYLE,
              color: APP_GREEN_GLASS_TEXT,
            }}
          >
            {isSaving ? t('profile_root_direction_saving') : t('profile_root_direction_save')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
};
