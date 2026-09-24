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
import { Input } from '@/components/ui/input';
import { extractErrorMessage } from '@/lib/errors';
import { useIssueLearnerInvitation } from '@/services/studentService';
import { buildLearnerInvitationUrl } from './studentPortalInvitationUrl';

export function StudentPortalInvitationDialog({
  studentId,
  open,
  onClose,
}: {
  studentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [invitationUrl, setInvitationUrl] = useState('');
  const invitation = useIssueLearnerInvitation();
  const portalUrl = import.meta.env.VITE_STUDENT_PORTAL_URL;

  const close = () => {
    if (invitation.isPending) return;
    setEmail('');
    setInvitationUrl('');
    invitation.reset();
    onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!portalUrl) {
      toast.error(t('students.detail.invite_config_error'));
      return;
    }
    invitation.mutate(
      { id: studentId, email: email.trim() },
      {
        onSuccess: ({ token }) => {
          setInvitationUrl(buildLearnerInvitationUrl(token, portalUrl));
        },
        onError: (error) =>
          toast.error(extractErrorMessage(error, t('common.error'))),
      },
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      toast.success(t('students.detail.invite_copied'));
    } catch {
      toast.error(t('students.detail.invite_copy_error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
      <DialogContent
        className="glass-card border-border sm:max-w-md"
        onEscapeKeyDown={(event) =>
          invitation.isPending && event.preventDefault()
        }
        onPointerDownOutside={(event) =>
          invitation.isPending && event.preventDefault()
        }
      >
        <DialogHeader>
          <DialogTitle>{t('students.detail.invite_title')}</DialogTitle>
          <DialogDescription>
            {t('students.detail.invite_description')}
          </DialogDescription>
        </DialogHeader>
        {invitationUrl ? (
          <div className="space-y-3">
            <label
              htmlFor="student-portal-link"
              className="text-sm font-medium"
            >
              {t('students.detail.invite_link')}
            </label>
            <Input
              id="student-portal-link"
              value={invitationUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            <p className="text-sm text-muted-foreground">
              {t('students.detail.invite_link_warning')}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                {t('common.close')}
              </Button>
              <Button onClick={() => void copyLink()}>
                {t('students.detail.invite_copy')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label
              htmlFor="student-portal-email"
              className="block text-sm font-medium"
            >
              {t('students.detail.invite_email')}
            </label>
            <Input
              id="student-portal-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={invitation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={invitation.isPending}>
                {t('students.detail.invite_create')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
