import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

const CRUD = ['read', 'create', 'update', 'delete'];
const RESOURCE_GROUPS: Record<string, string[]> = {
  learning: [
    'students',
    'groups',
    'courses',
    'lessons',
    'attendance',
    'schedule',
    'exams',
    'training_programs',
    'training_enrollments',
    'driving_sessions',
    'questions',
    'question_media',
    'test_templates',
    'test_assignments',
    'test_attempts',
    'tests',
  ],
  finance: ['payments', 'expenses', 'expense_payments', 'reports'],
  fleet: [
    'vehicles',
    'vehicle_documents',
    'vehicle_maintenance',
    'vehicle_transfers',
    'vehicle_defects',
    'vehicle_inspections',
    'fuel',
    'fuel_stations',
  ],
  management: [
    'documents',
    'staff',
    'branches',
    'leads',
    'lead_stages',
    'lead_sources',
    'audit',
    'settings',
  ],
};

interface PermissionMatrixProps {
  permissions: string[];
  selected: string[];
  disabled?: (permission: string) => boolean;
  onToggle: (permission: string, checked: boolean) => void;
}

export default function PermissionMatrix({
  permissions,
  selected,
  disabled,
  onToggle,
}: PermissionMatrixProps) {
  const { t } = useTranslation();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<string[]>(['learning']);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const resources = useMemo(
    () => [
      ...new Set(permissions.map((permission) => permission.split('.')[0])),
    ],
    [permissions],
  );
  const label = (permission: string) => {
    const [resource, ...actions] = permission.split('.');
    const action = actions.join('_');
    return t(`access.permissions.${resource}_${action}`, {
      defaultValue: `${t(`access.resources.${resource}`, { defaultValue: resource })} · ${t(`access.actions.${action}`, { defaultValue: action.replaceAll('_', ' ') })}`,
    });
  };
  const matches = (permission: string) => {
    if (!normalizedQuery) return true;
    const resource = permission.split('.')[0];
    return `${label(permission)} ${t(`access.resources.${resource}`, { defaultValue: resource })}`
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  };
  const groups = Object.entries(RESOURCE_GROUPS).map(
    ([key, groupResources]) => ({
      key,
      resources: resources.filter((resource) =>
        groupResources.includes(resource),
      ),
    }),
  );
  const uncategorized = resources.filter(
    (resource) => !Object.values(RESOURCE_GROUPS).flat().includes(resource),
  );
  if (uncategorized.length)
    groups.push({ key: 'other', resources: uncategorized });

  const groupRows = groups
    .map((group) => ({
      ...group,
      rows: group.resources
        .map((resource) => {
          const resourceLabel = t(`access.resources.${resource}`, {
            defaultValue: resource,
          });
          const rowPermissions = permissions.filter((permission) =>
            permission.startsWith(`${resource}.`),
          );
          const visiblePermissions = rowPermissions.filter(
            (permission) =>
              !normalizedQuery ||
              resourceLabel.toLocaleLowerCase().includes(normalizedQuery) ||
              matches(permission),
          );
          return {
            resource,
            resourceLabel,
            rowPermissions,
            visiblePermissions,
          };
        })
        .filter((row) => row.visiblePermissions.length > 0),
    }))
    .filter((group) => group.rows.length > 0);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_auto] sm:items-end">
        <div className="grid gap-1.5">
          <label htmlFor={searchId} className="text-sm font-medium">
            {t('access.search_permissions')}
          </label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim())
                setOpenGroups([
                  'learning',
                  'finance',
                  'fleet',
                  'management',
                  'other',
                ]);
            }}
            placeholder={t('access.search_placeholder')}
            autoComplete="off"
          />
        </div>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {t('access.selected_count', { count: selected.length })}
        </p>
      </div>
      {!groupRows.length ? (
        <p
          role="status"
          className="rounded-md bg-muted p-4 text-sm text-muted-foreground"
        >
          {t('access.no_permissions_found')}
        </p>
      ) : (
        <Accordion
          type="multiple"
          value={openGroups}
          onValueChange={setOpenGroups}
          className="rounded-md border border-border px-4"
        >
          {groupRows.map((group) => (
            <AccordionItem key={group.key} value={group.key}>
              <AccordionTrigger className="min-h-12 text-left">
                <span className="flex items-center gap-2">
                  {t(`access.groups.${group.key}`, {
                    defaultValue: t('access.groups.other'),
                  })}
                  <span className="text-xs font-normal text-muted-foreground">
                    {group.rows.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="md:overflow-x-auto">
                  <table className="block w-full text-sm md:table">
                    <caption className="sr-only">{t('access.matrix')}</caption>
                    <thead className="hidden md:table-header-group">
                      <tr className="border-b border-border text-left">
                        <th className="py-3 pr-4" scope="col">
                          {t('access.resource')}
                        </th>
                        {CRUD.map((action) => (
                          <th
                            className="p-3 text-center"
                            scope="col"
                            key={action}
                          >
                            {t(`access.actions.${action}`)}
                          </th>
                        ))}
                        <th className="p-3" scope="col">
                          {t('access.business_actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="grid gap-3 md:table-row-group">
                      {group.rows.map(
                        ({
                          resource,
                          resourceLabel,
                          rowPermissions,
                          visiblePermissions,
                        }) => {
                          const visibleSet = new Set(visiblePermissions);
                          const businessActions = rowPermissions.filter(
                            (permission) =>
                              !CRUD.includes(
                                permission.slice(resource.length + 1),
                              ),
                          );
                          return (
                            <tr
                              key={resource}
                              className="grid grid-cols-4 rounded-md border border-border p-3 md:table-row md:rounded-none md:border-0 md:border-b md:p-0 md:last:border-0"
                            >
                              <th
                                className="col-span-4 pb-3 text-left font-medium md:table-cell md:py-3 md:pr-4"
                                scope="row"
                              >
                                {resourceLabel}
                              </th>
                              {CRUD.map((action) => {
                                const permission = `${resource}.${action}`;
                                if (!visibleSet.has(permission)) {
                                  return (
                                    <td
                                      key={action}
                                      className="p-2 text-center md:p-3"
                                    >
                                      <span aria-hidden="true">—</span>
                                    </td>
                                  );
                                }
                                return (
                                  <td
                                    key={action}
                                    className="p-1 text-center md:p-2"
                                  >
                                    <label className="flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-1 text-center focus-within:ring-2 focus-within:ring-ring">
                                      <span className="text-xs text-muted-foreground md:hidden">
                                        {t(`access.actions.${action}`)}
                                      </span>
                                      <Checkbox
                                        aria-label={label(permission)}
                                        checked={selected.includes(permission)}
                                        disabled={
                                          disabled?.(permission) ?? false
                                        }
                                        onCheckedChange={(checked) =>
                                          onToggle(permission, checked === true)
                                        }
                                      />
                                    </label>
                                  </td>
                                );
                              })}
                              <td className="col-span-4 p-2 md:table-cell md:p-3">
                                {businessActions.length > 0 && (
                                  <>
                                    <span className="mb-2 block text-xs text-muted-foreground md:hidden">
                                      {t('access.business_actions')}
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {businessActions
                                        .filter((permission) =>
                                          visibleSet.has(permission),
                                        )
                                        .map((permission) => (
                                          <label
                                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 focus-within:ring-2 focus-within:ring-ring"
                                            key={permission}
                                          >
                                            <Checkbox
                                              aria-label={label(permission)}
                                              checked={selected.includes(
                                                permission,
                                              )}
                                              disabled={
                                                disabled?.(permission) ?? false
                                              }
                                              onCheckedChange={(checked) =>
                                                onToggle(
                                                  permission,
                                                  checked === true,
                                                )
                                              }
                                            />
                                            {label(permission)}
                                          </label>
                                        ))}
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
