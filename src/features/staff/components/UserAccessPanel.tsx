import { useState } from 'react';
import { Link, useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import {
  usePermissionCatalogue,
  useStaffAccess,
  useUpdateStaffAccess,
} from '@/features/staff/api/userService';
import type { PermissionAssignment, User } from '@/features/staff/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { extractErrorMessage } from '@/lib/errors';
import PermissionMatrix from './PermissionMatrix';

const scopeKey = (grant: Pick<PermissionAssignment, 'scope' | 'branch_id'>) =>
  `${grant.scope}:${grant.branch_id ?? ''}`;
const same = (a: string[], b: string[]) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export default function UserAccessPanel({ user }: { user: User }) {
  const { t } = useTranslation();
  const actor = useAuthStore((s) => s.user);
  const protectedRole = user.role === 'owner' || user.role === 'dev';
  const catalogue = usePermissionCatalogue(!protectedRole);
  const access = useStaffAccess(user.id, !protectedRole);
  const [delegation, setDelegation] = useState(false);
  const [pendingMode, setPendingMode] = useState<boolean | null>(null);
  const [scope, setScope] = useState('company:');
  const [templateSkipped, setTemplateSkipped] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [memberships, setMemberships] = useState<Record<string, boolean>>({});
  const [saveOpen, setSaveOpen] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const mutation = useUpdateStaffAccess(user.id, delegation);
  const assignments = delegation
    ? (access.data?.delegations ?? [])
    : (access.data?.permissions ?? []);
  const original = (key: string) =>
    assignments
      .filter((grant) => scopeKey(grant) === key)
      .map((grant) => grant.permission);
  const changed = Object.entries(drafts).filter(
    ([key, permissions]) => !same(permissions, original(key)),
  );
  const branchChanges = Object.entries(memberships).filter(
    ([id, active]) =>
      active !== (access.data?.branch_ids.includes(id) ?? false),
  );
  const dirty = changed.length > 0 || branchChanges.length > 0;
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || mutation.isPending,
    enableBeforeUnload: dirty || mutation.isPending,
    withResolver: true,
  });

  if (protectedRole)
    return (
      <p className="glass-card p-5 text-sm text-muted-foreground">
        {t('access.protected_role')}
      </p>
    );
  if (catalogue.isLoading || access.isLoading)
    return <Skeleton className="h-64 w-full" />;
  if (catalogue.isError || access.isError || !catalogue.data || !access.data)
    return (
      <div className="glass-card space-y-3 p-5" role="alert">
        <p>{t('common.error')}</p>
        <Button
          variant="outline"
          onClick={() => {
            void catalogue.refetch();
            void access.refetch();
          }}
        >
          {t('access.reload')}
        </Button>
      </div>
    );

  const branches = catalogue.data.branches;
  const allPermissions = catalogue.data.permissions;
  const customTemplates = catalogue.data.custom_templates ?? [];
  const selected = drafts[scope] ?? original(scope);
  const label = (permission: string) => {
    const [resource, ...actions] = permission.split('.');
    const action = actions.join('_');
    return t(`access.permissions.${resource}_${action}`, {
      defaultValue: `${t(`access.resources.${resource}`, { defaultValue: resource })} · ${t(`access.actions.${action}`, { defaultValue: action.replaceAll('_', ' ') })}`,
    });
  };
  const [scopeType, branchId] = scope.split(':') as [
    PermissionAssignment['scope'],
    string,
  ];
  const isOwner = actor?.role === 'owner';
  const canDelegate = (permission: string, key = scope) => {
    const [kind, branch] = key.split(':');
    if (
      kind === 'own' &&
      !catalogue.data!.own_resources?.includes(permission.split('.')[0])
    )
      return false;
    if (isOwner) return true;
    return catalogue.data!.delegations.some(
      (grant) =>
        grant.permission === permission &&
        (grant.scope === 'company' ||
          ((grant.scope === kind ||
            (grant.scope === 'branch' && kind === 'own')) &&
            (grant.branch_id ?? '') === branch)),
    );
  };
  const scopeOptions = [
    { key: 'company:', label: t('access.company') },
    ...branches.map((branch) => ({
      key: `branch:${branch.id}`,
      label: branch.name,
    })),
    ...branches.map((branch) => ({
      key: `own:${branch.id}`,
      label: `${t('access.own')} · ${branch.name}`,
    })),
  ];
  // Keep every existing own-at-branch scope visible; it must not disappear on save.
  for (const grant of assignments) {
    const key = scopeKey(grant);
    if (grant.scope === 'own' && !grant.branch_id) continue;
    if (!scopeOptions.some((option) => option.key === key))
      scopeOptions.push({
        key,
        label: `${t('access.own')} · ${branches.find((branch) => branch.id === grant.branch_id)?.name ?? grant.branch_id}`,
      });
  }
  const toggle = (permission: string, checked: boolean) =>
    setDrafts((value) => ({
      ...value,
      [scope]: checked
        ? [...new Set([...selected, permission])]
        : selected.filter((key) => key !== permission),
    }));
  const applyTemplate = (permissionSet: string[]) => {
    const allowed = permissionSet.filter((permission) =>
      canDelegate(permission),
    );
    setTemplateSkipped(permissionSet.length - allowed.length);
    setDrafts((value) => ({
      ...value,
      [scope]: [
        ...new Set([
          ...selected.filter((permission) => !canDelegate(permission)),
          ...allowed,
        ]),
      ],
    }));
  };
  const reset = () => {
    setDrafts({});
    setMemberships({});
    setTemplateSkipped(0);
    setConflict(false);
  };
  const save = async () => {
    try {
      await mutation.mutateAsync({
        version: access.data!.access_version,
        ...(branchChanges.length && !delegation
          ? {
              branches: branchChanges.map(([branchId, active]) => ({
                branchId,
                active,
              })),
            }
          : {}),
        scopes: changed.map(([key, permissions]) => {
          const [scope, branchId] = key.split(':') as [
            PermissionAssignment['scope'],
            string,
          ];
          return { scope, ...(branchId ? { branchId } : {}), permissions };
        }),
      });
      reset();
      setSaveOpen(false);
      toast.success(t('access.saved'));
    } catch (error) {
      setSaveOpen(false);
      if ((error as AxiosError).response?.status === 409) setConflict(true);
      else toast.error(extractErrorMessage(error, t('common.error')));
    }
  };

  return (
    <div className="glass-card space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-semibold">
            {t('access.title')}
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t(delegation ? 'access.delegation_help' : 'access.help')}
          </p>
        </div>
        {isOwner && (
          <Button variant="outline" asChild>
            <Link to="/permission-templates">
              {t('access.manage_templates')}
            </Link>
          </Button>
        )}
      </div>
      {isOwner && user.role === 'manager' && (
        <div className="flex flex-wrap gap-2">
          {[false, true].map((mode) => (
            <Button
              key={String(mode)}
              variant={delegation === mode ? 'default' : 'outline'}
              disabled={mutation.isPending}
              onClick={() => {
                if (mode === delegation) return;
                if (dirty) setPendingMode(mode);
                else setDelegation(mode);
              }}
            >
              {t(mode ? 'access.delegation' : 'access.permissions_tab')}
            </Button>
          ))}
        </div>
      )}
      {!delegation && (
        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-medium">
            {t('access.membership')}
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {branches.map((branch) => (
              <label
                key={branch.id}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={
                    memberships[branch.id] ??
                    access.data!.branch_ids.includes(branch.id)
                  }
                  disabled={
                    mutation.isPending ||
                    (!isOwner &&
                      !catalogue.data!.delegations.some(
                        (grant) =>
                          grant.scope === 'company' ||
                          grant.branch_id === branch.id,
                      ))
                  }
                  onCheckedChange={(checked) =>
                    setMemberships((value) => ({
                      ...value,
                      [branch.id]: checked === true,
                    }))
                  }
                />
                {branch.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1 text-sm">
          {t('access.scope')}
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value);
              setTemplateSkipped(0);
            }}
            disabled={mutation.isPending}
          >
            {scopeOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          {t('access.template')}
          <select
            className="h-10 rounded-md border border-input bg-background px-3"
            value=""
            disabled={mutation.isPending}
            onChange={(event) => {
              const [kind, id] = event.target.value.split(':');
              const template =
                kind === 'system'
                  ? catalogue.data!.templates[id]
                  : customTemplates.find((item) => item.id === id)?.permissions;
              if (template) applyTemplate(template);
            }}
          >
            <option value="">{t('access.choose_template')}</option>
            <optgroup label={t('access.system_templates')}>
              {Object.keys(catalogue.data.templates).map((key) => (
                <option key={key} value={`system:${key}`}>
                  {t(`roles.${key}`, { defaultValue: key })}
                </option>
              ))}
            </optgroup>
            {customTemplates.length > 0 && (
              <optgroup label={t('access.company_templates')}>
                {customTemplates.map((template) => (
                  <option key={template.id} value={`custom:${template.id}`}>
                    {template.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>
      {templateSkipped > 0 && (
        <p
          role="status"
          className="rounded-md border border-border bg-muted p-3 text-sm"
        >
          {t('access.template_limited', { count: templateSkipped })}
        </p>
      )}
      {scopeType === 'own' && (
        <p className="rounded-md bg-muted p-3 text-sm">
          {t('access.own_help')}
        </p>
      )}
      {scopeType === 'branch' &&
        !(
          memberships[branchId] ?? access.data.branch_ids.includes(branchId)
        ) && (
          <p className="text-sm text-muted-foreground">
            {t('access.inactive_branch')}
          </p>
        )}
      <PermissionMatrix
        permissions={allPermissions}
        selected={selected}
        disabled={(permission) =>
          mutation.isPending || !canDelegate(permission)
        }
        onToggle={toggle}
      />
      {conflict && (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-destructive p-3"
        >
          <p>{t('access.conflict')}</p>
          <Button variant="outline" onClick={() => setReloadOpen(true)}>
            {t('access.reload')}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {t(dirty ? 'access.unsaved' : 'access.no_changes')}
        </p>
        <Button
          disabled={!dirty || mutation.isPending || conflict}
          onClick={() => setSaveOpen(true)}
        >
          {t('common.save')}
        </Button>
      </div>
      <ConfirmDialog
        open={saveOpen}
        onClose={() => {
          if (!mutation.isPending) setSaveOpen(false);
        }}
        onConfirm={() => void save()}
        title={t('access.confirm_title')}
        description={t('access.summary', {
          scopes: changed.length,
          added: changed.reduce(
            (n, [key, values]) =>
              n +
              values.filter((value) => !original(key).includes(value)).length,
            0,
          ),
          removed: changed.reduce(
            (n, [key, values]) =>
              n +
              original(key).filter((value) => !values.includes(value)).length,
            0,
          ),
          branches: branchChanges.length,
        })}
        confirmLabel={t('common.save')}
        confirmVariant="default"
        loading={mutation.isPending}
      >
        <div className="max-h-64 space-y-4 overflow-y-auto text-sm">
          {changed.map(([key, permissions]) => (
            <section key={key} className="space-y-2">
              <h3 className="font-medium">
                {scopeOptions.find((option) => option.key === key)?.label ??
                  key}
              </h3>
              <ul className="space-y-1">
                {permissions
                  .filter((permission) => !original(key).includes(permission))
                  .map((permission) => (
                    <li key={`added:${permission}`}>
                      {t('access.added')} · {label(permission)}
                    </li>
                  ))}
                {original(key)
                  .filter((permission) => !permissions.includes(permission))
                  .map((permission) => (
                    <li key={`removed:${permission}`}>
                      {t('access.removed')} · {label(permission)}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
          {branchChanges.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-medium">{t('access.membership')}</h3>
              <ul className="space-y-1">
                {branchChanges.map(([branchId, active]) => (
                  <li key={branchId}>
                    {branches.find((branch) => branch.id === branchId)?.name ??
                      branchId}{' '}
                    · {t(active ? 'common.active' : 'common.inactive')}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={blocker.status === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title={t('access.discard_title')}
        description={t('access.discard_help')}
        confirmLabel={t('common.discard')}
      />
      <ConfirmDialog
        open={pendingMode !== null}
        onClose={() => setPendingMode(null)}
        onConfirm={() => {
          reset();
          setDelegation(pendingMode!);
          setPendingMode(null);
        }}
        title={t('access.discard_title')}
        description={t('access.discard_help')}
        confirmLabel={t('common.discard')}
      />
      <ConfirmDialog
        open={reloadOpen}
        onClose={() => setReloadOpen(false)}
        onConfirm={() => {
          reset();
          setReloadOpen(false);
          void access.refetch();
        }}
        title={t('access.discard_title')}
        description={t('access.discard_help')}
        confirmLabel={t('access.reload')}
      />
    </div>
  );
}
