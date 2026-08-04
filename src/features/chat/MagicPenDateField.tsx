// DOC-DEPS: LLM.md -> docs/MAGIC_PEN_CAPTURE_SPEC.md -> src/features/chat/README.md
import { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { AppCalendarPicker } from '../../components/AppCalendarPicker';
import { fromDateInputValue, toDateInputValue } from './magicPenSheetHelpers';

interface MagicPenDateFieldProps {
  value?: number;
  disabled: boolean;
  locale: string;
  ariaLabel: string;
  onChange: (value?: number) => void;
}

function formatDisplayDate(value: number | undefined, locale: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function MagicPenDateField({
  value,
  disabled,
  locale,
  ariaLabel,
  onChange,
}: MagicPenDateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (date: Date) => {
    onChange(fromDateInputValue(toDateInputValue(date.getTime())));
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${
          disabled
            ? 'cursor-default border-[#E8E1D7] bg-[#F8F6F2] opacity-60'
            : 'border-[#DED3C3] bg-[#FAF8F4] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] focus-visible:border-[#B9A78E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DCCDB8]/35'
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E8DFD2] bg-white text-[#A58F70] shadow-sm">
          <CalendarDays size={15} strokeWidth={1.8} />
        </span>
        <span className="app-body min-w-0 flex-1 truncate font-medium text-[#66543D]">
          {formatDisplayDate(value, locale)}
        </span>
        <ChevronDown size={15} strokeWidth={1.8} className="shrink-0 text-[#B09D82]" />
      </button>
      {isOpen && value ? (
        <AppCalendarPicker
          value={new Date(value)}
          locale={locale}
          title={ariaLabel}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
