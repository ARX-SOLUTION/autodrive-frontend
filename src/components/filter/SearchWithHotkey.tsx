import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchWithHotkeyProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const SearchWithHotkey = ({
  value,
  onChange,
  placeholder,
  'aria-label': ariaLabel,
  className,
  inputClassName,
  autoFocus,
  disabled,
}: SearchWithHotkeyProps) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === '/' && !isTyping && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled]);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const resolvedPlaceholder = placeholder ?? t('common.search');
  const accessibleLabel = ariaLabel ?? resolvedPlaceholder;

  return (
    <div
      className={cn(
        'relative flex items-center min-w-[200px] flex-1',
        className,
      )}
      data-testid="search-with-hotkey"
    >
      <MagnifyingGlass
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={resolvedPlaceholder}
        aria-label={accessibleLabel}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'pl-9 pr-9 bg-secondary border-border focus-visible:ring-2 focus-visible:ring-ring',
          inputClassName,
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label={t('common.clear')}
          className="absolute right-1 top-1/2 -translate-y-1/2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <kbd
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex"
          aria-hidden="true"
          title={t('filters.hotkey_tooltip', {
            defaultValue: 'Press / to search',
          })}
        >
          /
        </kbd>
      )}
    </div>
  );
};

export default SearchWithHotkey;
