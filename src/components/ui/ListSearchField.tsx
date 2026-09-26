import { MagnifyingGlass } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';

interface ListSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ListSearchField({
  value,
  onChange,
  placeholder,
}: ListSearchFieldProps) {
  const { t } = useTranslation();
  const label = t('common.search');

  return (
    <div className="relative max-w-sm">
      <MagnifyingGlass
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? label}
        aria-label={label}
        className="border-border bg-secondary pl-9"
      />
    </div>
  );
}
