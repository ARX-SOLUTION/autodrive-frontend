import { useMemo, useState } from 'react';
import { Link, useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Copy, Plus, Trash } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/authStore';
import {
  useCreatePermissionTemplate,
  useDeletePermissionTemplate,
  usePermissionCatalogue,
  useUpdatePermissionTemplate,
} from '@/features/staff/api/userService';
import type { PermissionTemplate } from '@/features/staff/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { extractErrorMessage } from '@/lib/errors';
import PermissionMatrix from '@/features/staff/components/PermissionMatrix';

const samePermissions = (left: string[], right: string[]) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const EMPTY_TEMPLATES: PermissionTemplate[] = [];

export default function PermissionTemplatesPage() {
  const { t } = useTranslation();
  const isOwner = useAuthStore((state) => state.user?.role === 'owner');
  const catalogue = usePermissionCatalogue(isOwner);
  const createTemplate = useCreatePermissionTemplate();
  const updateTemplate = useUpdatePermissionTemplate();
  const deleteTemplate = useDeletePermissionTemplate();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [initialName, setInitialName] = useState('');
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<PermissionTemplate | null>(
    null,
  );
  const [pendingDiscardAction, setPendingDiscardAction] = useState<
    (() => void) | null
  >(null);
  const saving = createTemplate.isPending || updateTemplate.isPending;
  const dirty =
    editing &&
    (name !== initialName || !samePermissions(permissions, initialPermissions));
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || saving,
    enableBeforeUnload: dirty || saving,
    withResolver: true,
  });
  const requestEditorChange = (action: () => void) => {
    if (dirty) setPendingDiscardAction(() => action);
    else action();
  };

  const customTemplates = catalogue.data?.custom_templates ?? EMPTY_TEMPLATES;
  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query
      ? customTemplates.filter((template) =>
          template.name.toLocaleLowerCase().includes(query),
        )
      : customTemplates;
  }, [customTemplates, search]);

  const startEditor = (template?: PermissionTemplate) => {
    const nextName = template?.name ?? '';
    const nextPermissions = template?.permissions ?? [];
    setEditingId(template?.id ?? null);
    setName(nextName);
    setPermissions(nextPermissions);
    setInitialName(nextName);
    setInitialPermissions(nextPermissions);
    setEditing(true);
  };

  const duplicate = (sourceName: string, sourcePermissions: string[]) => {
    const nextName = `${sourceName} ${t('access.template_copy_suffix')}`;
    setEditingId(null);
    setName(nextName.slice(0, 80));
    setPermissions(sourcePermissions);
    setInitialName('');
    setInitialPermissions([]);
    setEditing(true);
  };

  const cancelEditor = () => {
    setEditing(false);
    setEditingId(null);
    setName('');
    setPermissions([]);
    setInitialName('');
    setInitialPermissions([]);
  };

  const save = async () => {
    const payload = { name: name.trim(), permissions };
    try {
      if (editingId)
        await updateTemplate.mutateAsync({ id: editingId, ...payload });
      else await createTemplate.mutateAsync(payload);
      toast.success(
        t(editingId ? 'access.template_updated' : 'access.template_created'),
      );
      cancelEditor();
    } catch (error) {
      toast.error(extractErrorMessage(error, t('common.error')));
    }
  };

  const removeTemplate = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplate.mutateAsync(deleteTarget.id);
      toast.success(t('access.template_deleted'));
      if (editingId === deleteTarget.id) cancelEditor();
      setDeleteTarget(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, t('common.error')));
    }
  };

  if (!isOwner)
    return (
      <div className="glass-card p-5" role="alert">
        {t('access.owner_only_templates')}
      </div>
    );
  if (catalogue.isLoading) return <Skeleton className="h-[32rem] w-full" />;
  if (catalogue.isError || !catalogue.data)
    return (
      <div className="glass-card space-y-3 p-5" role="alert">
        <p>{t('common.error')}</p>
        <Button variant="outline" onClick={() => void catalogue.refetch()}>
          {t('access.reload')}
        </Button>
      </div>
    );

  const builtInTemplates = Object.entries(catalogue.data.templates);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('users.title')}
        title={t('access.templates_title')}
        description={t('access.templates_description')}
        actions={
          <Button variant="outline" asChild>
            <Link to="/users">{t('access.back_to_staff')}</Link>
          </Button>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.5fr)]">
        <aside
          className="glass-card space-y-4 p-4 sm:p-5"
          aria-label={t('access.templates_title')}
        >
          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="font-heading text-base font-semibold">
                {t('access.company_templates')}
              </h2>
              <label className="sr-only" htmlFor="permission-template-search">
                {t('access.search_templates')}
              </label>
              <Input
                id="permission-template-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('access.search_templates')}
              />
            </div>
            {filteredTemplates.length === 0 ? (
              <EmptyState
                title={t(
                  customTemplates.length
                    ? 'access.no_templates_match'
                    : 'access.no_custom_templates',
                )}
                description={t('access.no_custom_templates_help')}
              />
            ) : (
              <ul className="space-y-2">
                {filteredTemplates.map((template) => (
                  <li key={template.id}>
                    <div className="rounded-md border border-border bg-background p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          className="min-h-11 min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() =>
                            requestEditorChange(() => startEditor(template))
                          }
                        >
                          <span className="block break-words font-medium">
                            {template.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {t('access.template_permission_count', {
                              count: template.permissions.length,
                            })}
                          </span>
                        </button>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11"
                            aria-label={t('access.duplicate_template', {
                              name: template.name,
                            })}
                            onClick={() =>
                              requestEditorChange(() =>
                                duplicate(template.name, template.permissions),
                              )
                            }
                          >
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11"
                            aria-label={t('access.delete_template_for', {
                              name: template.name,
                            })}
                            onClick={() => setDeleteTarget(template)}
                          >
                            <Trash
                              className="h-4 w-4 text-destructive"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2 border-t border-border pt-4">
            <h2 className="font-heading text-base font-semibold">
              {t('access.system_templates')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('access.system_templates_help')}
            </p>
            <ul className="space-y-1">
              {builtInTemplates.map(([key, templatePermissions]) => (
                <li
                  key={key}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-md px-2"
                >
                  <span className="min-w-0 break-words text-sm">
                    {t(`roles.${key}`, { defaultValue: key })}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t('access.template_permission_count', {
                        count: templatePermissions.length,
                      })}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 shrink-0"
                    onClick={() =>
                      requestEditorChange(() =>
                        duplicate(
                          t(`roles.${key}`, { defaultValue: key }),
                          templatePermissions,
                        ),
                      )
                    }
                  >
                    <Copy className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('access.copy_template')}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <section
          className="glass-card space-y-4 p-4 sm:p-5"
          aria-label={t('access.template_editor_help')}
        >
          {!editing ? (
            <EmptyState
              title={t('access.choose_template_to_edit')}
              description={t('access.template_editor_help')}
              action={
                <Button
                  onClick={() => requestEditorChange(() => startEditor())}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t('access.create_template')}
                </Button>
              }
            />
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2
                    id="permission-template-editor-title"
                    className="font-heading text-lg font-semibold"
                  >
                    {t(
                      editingId
                        ? 'access.edit_template'
                        : 'access.new_template',
                    )}
                  </h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    {t('access.template_snapshot_help')}
                  </p>
                </div>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11"
                    onClick={() => {
                      const template = customTemplates.find(
                        (item) => item.id === editingId,
                      );
                      if (template)
                        requestEditorChange(() =>
                          duplicate(template.name, template.permissions),
                        );
                    }}
                  >
                    <Copy className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('access.duplicate_template')}
                  </Button>
                )}
              </div>
              <div className="grid gap-1.5">
                <label
                  htmlFor="permission-template-name"
                  className="text-sm font-medium"
                >
                  {t('access.template_name')}
                </label>
                <Input
                  id="permission-template-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  required
                  aria-describedby="permission-template-name-hint"
                />
                <p
                  id="permission-template-name-hint"
                  className="text-xs text-muted-foreground"
                >
                  {t('access.template_name_help')}
                </p>
              </div>
              <PermissionMatrix
                permissions={catalogue.data.permissions}
                selected={permissions}
                disabled={() => saving || deleteTemplate.isPending}
                onToggle={(permission, checked) =>
                  setPermissions((current) =>
                    checked
                      ? [...new Set([...current, permission])]
                      : current.filter((item) => item !== permission),
                  )
                }
              />
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => requestEditorChange(cancelEditor)}
                  disabled={saving}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    saving ||
                    !name.trim() ||
                    name.trim().length > 80 ||
                    permissions.length === 0
                  }
                >
                  {t('common.save')}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void removeTemplate()}
        title={t('access.delete_template_title')}
        description={t('access.delete_template_help', {
          name: deleteTarget?.name ?? '',
        })}
        confirmLabel={t('common.delete')}
        confirmVariant="destructive"
        loading={deleteTemplate.isPending}
      />
      <ConfirmDialog
        open={blocker.status === 'blocked' || !!pendingDiscardAction}
        onClose={() => {
          setPendingDiscardAction(null);
          blocker.reset?.();
        }}
        onConfirm={() => {
          pendingDiscardAction?.();
          setPendingDiscardAction(null);
          if (blocker.status === 'blocked') blocker.proceed?.();
        }}
        title={t('access.discard_title')}
        description={t('access.discard_help')}
        confirmLabel={t('common.discard')}
      />
    </div>
  );
}
