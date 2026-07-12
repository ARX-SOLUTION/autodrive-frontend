import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'type'>
>(({ className, ...props }, ref) => {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        ref={ref}
        {...props}
      />
      {/* ponytail: bottom-anchored (input is h-10) so mt-* in className can't misalign the button */}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={props.disabled}
        aria-label={
          visible ? t('common.hide_password') : t('common.show_password')
        }
        aria-pressed={visible}
        className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
