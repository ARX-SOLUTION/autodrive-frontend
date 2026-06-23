import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUsers } from '@/services/userService';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';
import PaginationControls from '@/components/ui/PaginationControls';
import { ChevronUp, ChevronDown, ChevronsUpDown, UserCog } from 'lucide-react';
import { DataCard } from '@/components/ui/DataCard';
import { EmptyState } from '@/components/ui/EmptyState';

const formatDate = (d?: string) => {
  if (!d) return '—';
  try {
    return format(new Date(d), 'dd.MM.yyyy');
  } catch {
    return d;
  }
};

const roleLabel = (role?: string) => {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    case 'operator':
      return 'Operator';
    case 'teacher':
      return 'Teacher';
    default:
      return role || '—';
  }
};

const UsersPage = () => {
  const { t } = useTranslation();
  const { data: users, isLoading } = useUsers('manager');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...(users || [])].sort((a, b) => {
    const va = a[sortField as keyof typeof a];
    const vb = b[sortField as keyof typeof b];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'string' && typeof vb === 'string') {
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return sortDir === 'asc'
      ? va < vb
        ? -1
        : va > vb
          ? 1
          : 0
      : va > vb
        ? -1
        : va < vb
          ? 1
          : 0;
  });

  const { currentPage, totalPages, paginatedItems, setCurrentPage } =
    usePagination(sorted);

  const startIndex = (currentPage - 1) * 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-balance">
          {t('users.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('users.count', { count: (users || []).length })}
        </p>
      </div>

      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('email')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Email
                    {sortField === 'email' ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('phone')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {t('users.detail.phone')}
                    {sortField === 'phone' ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('role')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                  >
                    {t('users.detail.role')}
                    {sortField === 'role' ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('branch_name')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {t('users.detail.branch')}
                    {sortField === 'branch_name' ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                  {t('common.status')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('created_at')}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {t('users.detail.created')}
                    {sortField === 'created_at' ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={7} className="p-4">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                : paginatedItems.map((u, idx) => (
                    <tr
                      key={u.id}
                      className="table-row-striped border-b border-border/50"
                    >
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {startIndex + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-medium">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.phone || t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'owner' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                        >
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.branch_name || t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                        >
                          {u.is_active
                            ? t('common.active')
                            : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {(users || []).length === 0 && !isLoading && (
            <EmptyState icon={UserCog} title={t('users.not_found')} />
          )}
        </div>
      </div>

      <div className="md:hidden grid gap-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))
        ) : paginatedItems.length === 0 ? (
          <EmptyState icon={UserCog} title={t('users.not_found')} />
        ) : (
          paginatedItems.map((u) => (
            <DataCard
              key={u.id}
              title={u.name || u.email}
              subtitle={u.email}
              fields={[
                { label: t('users.detail.role'), value: roleLabel(u.role) },
                {
                  label: t('users.detail.branch'),
                  value: u.branch_name ?? t('common.na'),
                },
                {
                  label: t('users.detail.phone'),
                  value: u.phone ?? t('common.na'),
                },
                {
                  label: t('users.detail.created'),
                  value: formatDate(u.created_at),
                },
              ]}
            />
          ))
        )}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default UsersPage;
