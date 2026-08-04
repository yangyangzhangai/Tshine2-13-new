/**
 * DOC-DEPS: docs/CURRENT_TASK.md, src/index.css
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface AppSelectOption {
  value: string;
  label: string;
}

interface AppSelectMenuProps {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  placement?: 'top' | 'bottom';
  size?: 'default' | 'compact';
  placeholder?: string;
  invalid?: boolean;
  triggerClassName?: string;
}

export const AppSelectMenu = ({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  disabled = false,
  placement = 'bottom',
  size = 'default',
  placeholder,
  invalid = false,
  triggerClassName,
}: AppSelectMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find(option => option.value === value) ?? (placeholder ? undefined : options[0]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const selectedOption = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    selectedOption?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, value]);

  const chooseOption = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={cn('relative', isOpen && 'z-[80]', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen(current => !current)}
        className={cn(
          'flex min-h-11 w-full items-center justify-between gap-3 rounded-[50px] border px-3.5 py-2.5 text-left outline-none transition focus:ring-2 focus:ring-[#8FAF92]/45 disabled:cursor-not-allowed disabled:opacity-50',
          invalid ? 'border-red-300 bg-red-50/60 text-slate-700' : 'border-[#8FAF92]/40 bg-white/85 text-slate-700',
          size === 'compact' ? 'app-body' : 'app-form-text',
          triggerClassName,
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-slate-400')}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={cn('shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen ? (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'absolute left-0 right-0 max-h-56 overflow-y-auto rounded-2xl border border-white/80 bg-[#F7F9F8]/95 p-1 shadow-[0_18px_40px_rgba(82,105,91,0.18)] backdrop-blur-xl',
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => chooseOption(option.value)}
                className={cn(
                  'app-body flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                  isSelected
                    ? 'bg-[#EAF2E7] font-semibold text-[#355643]'
                    : 'text-slate-700 hover:bg-white/80',
                )}
              >
                <span className="min-w-0 flex-1 break-words">{option.label}</span>
                {isSelected ? <Check size={16} strokeWidth={2.2} className="shrink-0 text-[#6E8B62]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
