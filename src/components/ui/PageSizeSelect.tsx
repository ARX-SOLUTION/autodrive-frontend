import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE_SIZE_OPTIONS, parsePageSize } from '@/lib/listQuery';

interface PageSizeSelectProps {
  value: number;
  onChange: (size: number) => void;
  disabled?: boolean;
}

export function PageSizeSelect({
  value,
  onChange,
  disabled = false,
}: PageSizeSelectProps) {
  const { t } = useTranslation();
  const label = t('common.rows_per_page');
  const selected = parsePageSize(String(value)) ?? PAGE_SIZE_OPTIONS[0];

  return (
    <div className="inline-flex items-center gap-2">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {label}
      </span>
      <Select
        value={String(selected)}
        disabled={disabled}
        onValueChange={(nextValue) => {
          const next = parsePageSize(nextValue);
          if (next) onChange(next);
        }}
      >
        <SelectTrigger
          aria-label={label}
          className="h-9 w-[4.75rem] shrink-0 border-border bg-secondary px-2.5 text-sm text-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size} value={String(size)}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
