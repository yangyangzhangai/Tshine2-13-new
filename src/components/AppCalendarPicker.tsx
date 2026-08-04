// DOC-DEPS: LLM.md -> docs/CURRENT_TASK.md -> docs/PROJECT_MAP.md
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import {
  APP_MODAL_CARD_CLASS,
  APP_MODAL_CLOSE_CLASS,
  APP_MODAL_OVERLAY_CLASS,
} from '../lib/modalTheme';

interface AppCalendarPickerProps {
  value: Date;
  locale: string;
  title: string;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

interface AppCalendarDialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

function CalendarPanel({ value, locale, onSelect }: Pick<AppCalendarPickerProps, 'value' | 'locale' | 'onSelect'>) {
  return (
    <div className="calendar-wrapper app-calendar-picker flex justify-center">
      <Calendar
        value={value}
        locale={locale}
        minDetail="month"
        maxDetail="month"
        showNeighboringMonth={false}
        formatDay={(_, date) => String(date.getDate())}
        onClickDay={onSelect}
        className="w-full border-none bg-transparent text-[13px] font-medium"
      />
    </div>
  );
}

export function AppCalendarDialog({ title, children, onClose }: AppCalendarDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className={cn('fixed inset-0 z-[70] flex items-center justify-center p-5', APP_MODAL_OVERLAY_CLASS)} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(APP_MODAL_CARD_CLASS, 'w-full max-w-xs rounded-[28px] p-4 animate-in fade-in zoom-in-95')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="app-section-title text-slate-700">{title}</h3>
          <button type="button" onClick={onClose} aria-label={t('close')} className={cn(APP_MODAL_CLOSE_CLASS, 'p-1')}>
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function AppCalendarPicker({ value, locale, title, onSelect, onClose }: AppCalendarPickerProps) {
  return (
    <AppCalendarDialog title={title} onClose={onClose}>
      <CalendarPanel value={value} locale={locale} onSelect={onSelect} />
    </AppCalendarDialog>
  );
}
