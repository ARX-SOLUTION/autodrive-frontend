import { useTranslation } from 'react-i18next';
import { Translate } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LANGS } from '@/i18n';

const labels: Record<string, string> = {
  uz: "O'zbek",
  ru: 'Русский',
  en: 'English',
};

export const LanguageSwitcher = ({
  collapsed,
}: { collapsed?: boolean } = {}) => {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'uz').slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('actions.language')}
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground transition-colors"
      >
        <Translate className="h-4 w-4" />
        {!collapsed && <span className="uppercase">{current}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        {SUPPORTED_LANGS.map((code) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => i18n.changeLanguage(code)}
            className={current === code ? 'bg-accent' : ''}
          >
            <span className="mr-2 inline-block w-6 uppercase text-muted-foreground">
              {code}
            </span>
            <span>{labels[code]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
