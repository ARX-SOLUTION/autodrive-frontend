import { useTranslation } from 'react-i18next';
import { PAGE_SIZE_OPTIONS, parsePageSize } from '@/lib/listQuery';

interface PageSizeSelectProps {
  value: number;
  onChange: (size: number) => void;
}

export function PageSizeSelect({ value, onChange }: PageSizeSelectProps) {
  const { t } = useTranslation();
  const label = t('common.rows_per_page');
  const selected = parsePageSize(String(value)) ?? PAGE_SIZE_OPTIONS[0];

  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span className="hidden sm:inline">{label}</span>
      <select
        aria-label={label}
        value={String(selected)}
        onChange={(event) => {
          const next = parsePageSize(event.target.value);
          if (next) onChange(next);
        }}
        className="h-9 rounded-md border border-border bg-secondary px-2 text-sm text-foreground"
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={String(size)}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
