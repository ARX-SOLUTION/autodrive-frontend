import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { PasswordField } from '@/components/ui/password-field';

const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<'input'>, 'type'>
>((props, ref) => {
  const { t } = useTranslation();

  return (
    <PasswordField
      ref={ref}
      showLabel={t('common.show_password')}
      hideLabel={t('common.hide_password')}
      {...props}
    />
  );
});
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
