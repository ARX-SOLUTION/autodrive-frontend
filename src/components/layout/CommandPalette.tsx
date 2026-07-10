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

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
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
