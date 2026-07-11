/* eslint-disable react-refresh/only-export-components */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  CreditCard,
  Headphones,
  Users,
  User,
  Layers,
  UserCog,
  ShieldCheck,
  Calendar,
  ClipboardCheck,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useCan } from '@/hooks/useCan';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useGlobalSearch,
  type SearchResultItem,
} from '@/services/searchService';
import type { Capability } from '@/lib/permissions';

type NavEntry = {
  labelKey: string;
  path: string;
  icon: typeof LayoutDashboard;
  cap?: Capability;
};

const NAV_ENTRIES: NavEntry[] = [
  { labelKey: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard },
  {
    labelKey: 'nav.branches',
    path: '/branches',
    icon: Building2,
    cap: 'manageBranches',
  },
  { labelKey: 'nav.schedule', path: '/schedule', icon: Calendar },
  { labelKey: 'nav.attendance', path: '/attendance', icon: ClipboardCheck },
  { labelKey: 'nav.groups', path: '/groups', icon: Layers },
  { labelKey: 'nav.students', path: '/students', icon: GraduationCap },
  { labelKey: 'nav.payments', path: '/payments', icon: CreditCard },
  {
    labelKey: 'nav.operators',
    path: '/operators',
    icon: Headphones,
    cap: 'manageStaff',
  },
  {
    labelKey: 'nav.teachers',
    path: '/teachers',
    icon: Users,
    cap: 'manageStaff',
  },
  {
    labelKey: 'nav.users',
    path: '/users',
    icon: UserCog,
    cap: 'manageUsers',
  },
  {
    labelKey: 'nav.audit',
    path: '/audit',
    icon: ShieldCheck,
    cap: 'viewAudit',
  },
  { labelKey: 'nav.profile', path: '/profile', icon: User },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette = ({ open, onOpenChange }: CommandPaletteProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const gate: Record<string, boolean> = {
    manageBranches: useCan('manageBranches'),
    manageStaff: useCan('manageStaff'),
    manageUsers: useCan('manageUsers'),
    viewAudit: useCan('viewAudit'),
  };

  const visibleNav = NAV_ENTRIES.filter((n) => !n.cap || gate[n.cap]);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data: results } = useGlobalSearch(debouncedQuery);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleOpenChange = (o: boolean) => {
    onOpenChange(o);
    if (!o) setQuery('');
  };

  // autodrive-cdy: backend already groups results by entity type
  // ({ students, groups, staff } — see searchService.ts), so render each
  // key as its own CommandGroup instead of re-bucketing a flat list.
  const searchGroups: {
    key: string;
    heading: string;
    icon: typeof GraduationCap;
    route: string;
    items: SearchResultItem[];
  }[] = [
    {
      key: 'students',
      heading: t('nav.students'),
      icon: GraduationCap,
      route: '/students',
      items: results?.students ?? [],
    },
    {
      key: 'groups',
      heading: t('nav.groups'),
      icon: Layers,
      route: '/groups',
      items: results?.groups ?? [],
    },
    {
      key: 'staff',
      heading: t('actions.search_group_staff', 'Xodimlar') as string,
      icon: UserCog,
      route: '/users',
      items: results?.staff ?? [],
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder={
          t('actions.search_placeholder', 'Sahifa qidirish...') as string
        }
      />
      <CommandList>
        <CommandEmpty>
          {t('actions.search_empty', 'Hech narsa topilmadi') as string}
        </CommandEmpty>
        <CommandGroup
          heading={t('actions.search_pages', 'Sahifalar') as string}
        >
          {visibleNav.map((n) => {
            const label = t(n.labelKey);
            return (
              <CommandItem
                key={n.path}
                value={`${label} ${n.path}`}
                onSelect={() => go(n.path)}
              >
                <n.icon className="mr-2 h-4 w-4" />
                {label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {searchGroups.map((g) =>
          g.items.length === 0 ? null : (
            <CommandGroup key={g.key} heading={g.heading}>
              {g.items.map((item) => (
                <CommandItem
                  key={`${g.key}-${item.id}`}
                  // ponytail: prefix with the live query so cmdk's own
                  // fuzzy filter never hides a result the server already
                  // matched (e.g. phone-number search where the label is
                  // just a name) — see autodrive-cdy.
                  value={`${query} ${item.label} ${item.subtitle ?? ''}`}
                  onSelect={() => go(`${g.route}/${item.id}`)}
                >
                  <g.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  {item.subtitle && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ),
        )}
      </CommandList>
    </CommandDialog>
  );
};

/** Owns open state + binds cmd+k / ctrl+k globally. */
export const useCommandPalette = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return { open, setOpen };
};
