import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PasswordInput } from '@/components/ui/password-input';
import { extractErrorMessage } from '@/lib/errors';
import { useUpsertLearnerAccount } from '@/services/studentService';

const learnerPasswordOk = (password: string) =>
  password.length >= 8 && /[0-9]/.test(password);

export function StudentLearnerLoginDialog({
  studentId,
  hasLearnerAccount,
  open,
  onClose,
}: {
  studentId: string;
  hasLearnerAccount: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const upsert = useUpsertLearnerAccount();

  const close = () => {
    if (upsert.isPending) return;
    setPassword('');
    upsert.reset();
    onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!learnerPasswordOk(password)) {
      toast.error(t('students.detail.login_password_requirements'));
      return;
    }
    upsert.mutate(
      { id: studentId, password },
      {
        onSuccess: () => {
          toast.success(
            hasLearnerAccount
              ? t('students.detail.login_password_updated')
              : t('students.detail.login_created'),
          );
          close();
        },
        onError: (error) =>
          toast.error(extractErrorMessage(error, t('common.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent
        className="glass-card border-border sm:max-w-md"
        onEscapeKeyDown={(event) => upsert.isPending && event.preventDefault()}
        onPointerDownOutside={(event) =>
          upsert.isPending && event.preventDefault()
        }
      >
        <DialogHeader>
          <DialogTitle>{t('students.detail.login_title')}</DialogTitle>
          <DialogDescription>
            {hasLearnerAccount
              ? t('students.detail.login_description_reset')
              : t('students.detail.login_description_create')}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="learner-password">
              {t('students.detail.login_password')}
            </label>
            <PasswordInput
              id="learner-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              {t('students.detail.login_password_requirements')}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending
                ? t('common.saving')
                : hasLearnerAccount
                  ? t('students.detail.login_reset')
                  : t('students.detail.login_create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
