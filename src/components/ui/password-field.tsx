import * as React from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const PasswordField = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'type'> & {
    showLabel: string;
    hideLabel: string;
  }
>(({ className, showLabel, hideLabel, ...props }, ref) => {
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
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center text-muted-foreground transition-transform hover:text-foreground active:scale-[0.96] motion-reduce:transition-none motion-reduce:transform-none disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? (
          <EyeSlash className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
});
PasswordField.displayName = 'PasswordField';

export { PasswordField };
