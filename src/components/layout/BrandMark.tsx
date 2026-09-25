import { cn } from '@/lib/utils';

interface BrandMarkProps {
  size?: 'sm' | 'lg';
  title: string;
}

export const BrandMark = ({ size = 'sm', title }: BrandMarkProps) => (
  <span className={cn('flex items-center', size === 'lg' ? 'gap-3' : 'gap-2')}>
    <span aria-hidden className="w-1 self-stretch rounded-full bg-primary" />
    <span
      className={cn(
        'font-heading font-semibold tracking-tight text-foreground',
        size === 'lg' ? 'text-3xl' : 'text-lg',
      )}
    >
      {title}
    </span>
  </span>
);
