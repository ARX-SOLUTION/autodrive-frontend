import { useRef, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  LayoutGrid,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const variantIds = ['signal', 'studio', 'operator'] as const;
type VariantId = (typeof variantIds)[number];

type FeatureCard = {
  icon: LucideIcon;
  title: string;
  body: string;
};

type StatCard = {
  label: string;
  value: string;
  detail: string;
};

type VariantConfig = {
  label: string;
  lens: string;
  badge: string;
  accent: string;
  headline: string;
  subheadline: string;
  heroStats: StatCard[];
  heroFeed: { title: string; detail: string }[];
  sectionKicker: string;
  sectionTitle: string;
  sectionDescription: string;
  sectionCards: FeatureCard[];
};

const sharedPilotCards: FeatureCard[] = [
  {
    icon: WalletCards,
    title: 'Qarz nazorati',
    body: 'Bo‘lib to‘lash, kechikkan to‘lov va yopilgan qarzlar bir ko‘rinishda.',
  },
  {
    icon: Users,
    title: 'Davomat',
    body: 'Guruh, o‘quvchi va instruktor harakati bitta oqimda ko‘rinadi.',
  },
  {
    icon: CalendarDays,
    title: 'Amaliy jadval',
    body: 'Mashina va instruktor bandligi ustma-ust kelmaydi, chaos kamayadi.',
  },
];

const variants: Record<VariantId, VariantConfig> = {
  signal: {
    label: 'Signal',
    lens: 'Direct / conversion-first',
    badge: 'Pain-led',
    accent: 'cyan',
    headline: 'Qarzlar, davomat va jadval bir joyda.',
    subheadline:
      'Avtomaktab egasi uchun bitta ekran kunlik chalkashlikni kamaytiradi: kim qarzdor, qaysi guruh kelgan, qaysi instruktor bo‘sh.',
    heroStats: [
      {
        label: 'Pilot sozlash',
        value: '12 daq',
        detail: 'Birinchi demo uchun',
      },
      {
        label: 'Asosiy og‘riq',
        value: '3 ta',
        detail: 'Qarz, davomat, jadval',
      },
      { label: 'CTA', value: '1 oy', detail: 'Bepul pilot' },
    ],
    heroFeed: [
      {
        title: 'Kechikkan to‘lovlar',
        detail: 'Bitta ro‘yxatda ko‘rinadi va eslatma yuboriladi.',
      },
      {
        title: 'Amaliy darslar',
        detail: 'Instruktor va mashina bandligi ustma-ust tushmaydi.',
      },
      {
        title: 'Telegram signal',
        detail: 'Direktor xabarni telefonda darhol ko‘radi.',
      },
    ],
    sectionKicker: 'Nima uchun ishlaydi',
    sectionTitle: 'Landing ochilganda odam uchta muammoni birdan taniydi.',
    sectionDescription:
      'Bu variant eng qisqa yo‘lni sinaydi: avval og‘riq, keyin yechim, keyin pilot.',
    sectionCards: sharedPilotCards,
  },
  studio: {
    label: 'Studio',
    lens: 'Editorial / premium glass',
    badge: 'Brand-first',
    accent: 'emerald',
    headline: 'Avtomaktab uchun premium dark-glass landing.',
    subheadline:
      'Bu kompozitsiya sotuvni yumshoq, lekin jiddiy ko‘rsatadi: ko‘p havo, katta tipografiya, kam shovqin, yuqori ishonch.',
    heroStats: [
      {
        label: 'Vizual ritm',
        value: '1/3',
        detail: 'Bir katta fokus + ikki yordamchi blok',
      },
      {
        label: 'Kutilgan hissiyot',
        value: 'High trust',
        detail: 'Elegance without fluff',
      },
      { label: 'Variant', value: '03', detail: 'Brand-heavy test' },
    ],
    heroFeed: [
      {
        title: 'Bitta katta va’da',
        detail: 'Qarz, davomat, jadval birinchi qatorda.',
      },
      {
        title: 'Proof strip',
        detail: 'Pilot, Telegram, hisobot va tezkor kirish.',
      },
      {
        title: 'Soft motion',
        detail: 'Hero kirishi va scroll reveal aniq, ammo yengil.',
      },
    ],
    sectionKicker: 'Qanday ko‘rinadi',
    sectionTitle: 'Bu variant landingni ko‘proq sahna kabi ishlaydi.',
    sectionDescription:
      'Hero markazda turadi, qo‘shimcha bloklar esa ishonch va ritmni yaratadi.',
    sectionCards: [
      {
        icon: Sparkles,
        title: 'Kuchli ierarxiya',
        body: 'Bitta yirik headline va bir nechta sokin support blok.',
      },
      {
        icon: ShieldCheck,
        title: 'Ishonch signali',
        body: 'Pilot, Telegram va hisobot kabi real foydalar ko‘rinadi.',
      },
      {
        icon: Layers3,
        title: 'Qatlamli yuzalar',
        body: 'Glass surfaces bir-biriga mos radius va chuqurlik bilan ishlaydi.',
      },
    ],
  },
  operator: {
    label: 'Operator',
    lens: 'Dashboard / operational',
    badge: 'Control room',
    accent: 'amber',
    headline: 'Nazorat paneli kabi sotadigan landing.',
    subheadline:
      'Bu ko‘rinish “biz jiddiy tizimmiz” degan signal beradi: raqamlar, statuslar, ritm va operatsion foyda oldinda turadi.',
    heroStats: [
      {
        label: 'Nazorat',
        value: '24/7',
        detail: 'Telefon orqali tez ko‘rinish',
      },
      {
        label: 'Statuslar',
        value: 'Live',
        detail: 'Qarz, davomat, jadval bir safda',
      },
      {
        label: 'To‘plam',
        value: '4 blok',
        detail: 'KPI + workflow + pilot + CTA',
      },
    ],
    heroFeed: [
      {
        title: 'Ochiq holat',
        detail: 'Direktor bugun qaysi guruh ishlayotganini ko‘radi.',
      },
      {
        title: 'Sog‘lom ritm',
        detail: 'CTA va pilot taklifi juda tez topiladi.',
      },
      {
        title: 'Past friction',
        detail: 'Kontakt olishga o‘tish uchun kam bosqich qoladi.',
      },
    ],
    sectionKicker: 'Qanday ishlaydi',
    sectionTitle: 'Landing operatsion jarayonni ko‘rsatib sotadi.',
    sectionDescription:
      'Ko‘rinish dashboardga yaqin, lekin yetakchi CTA hali ham aniq va sodda.',
    sectionCards: [
      {
        icon: Target,
        title: 'Lead → pilot',
        body: 'Bir nechta bosqich emas, qisqa yo‘l: ko‘rish, tushunish, sinash.',
      },
      {
        icon: Gauge,
        title: 'Jadval ritmi',
        body: 'Amaliy mashg‘ulotlar va instruktorga tegishli bandlik ko‘rinadi.',
      },
      {
        icon: TimerReset,
        title: 'Tez qaror',
        body: 'Ustma-ust bo‘lgan holatlarda ham qiymat darhol tushuniladi.',
      },
    ],
  },
};

const buttonBase =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const panelBase =
  'rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_80px_rgba(1,6,20,0.45)] backdrop-blur-2xl transition-[transform,background-color,border-color,box-shadow] duration-300';

const sectionBase = 'space-y-5';

const normalizeVariant = (value: string | null): VariantId => {
  if (variantIds.includes(value as VariantId)) return value as VariantId;
  return 'signal';
};

const AccentChip = ({
  label,
  tone,
}: {
  label: string;
  tone: 'cyan' | 'emerald' | 'amber';
}) => {
  const toneClass = {
    cyan: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  }[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]',
        toneClass,
      )}
    >
      {label}
    </span>
  );
};

const PrimaryButton = ({
  children,
  href,
  tone = 'cyan',
}: {
  children: ReactNode;
  href?: string;
  tone?: 'cyan' | 'emerald' | 'amber';
}) => {
  const toneClass = {
    cyan: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200 shadow-[0_10px_30px_rgba(34,211,238,0.24)]',
    emerald:
      'bg-emerald-300 text-slate-950 hover:bg-emerald-200 shadow-[0_10px_30px_rgba(52,211,153,0.24)]',
    amber:
      'bg-amber-300 text-slate-950 hover:bg-amber-200 shadow-[0_10px_30px_rgba(251,191,36,0.22)]',
  }[tone];

  if (href) {
    const isInternal = href.startsWith('/');
    const sharedClassName = cn(buttonBase, toneClass);

    if (isInternal) {
      return (
        <Link className={sharedClassName} to={href}>
          {children}
        </Link>
      );
    }

    return (
      <a className={sharedClassName} href={href}>
        {children}
      </a>
    );
  }

  return <button className={cn(buttonBase, toneClass)}>{children}</button>;
};

const SecondaryButton = ({
  children,
  href,
}: {
  children: ReactNode;
  href?: string;
}) => {
  if (href) {
    const isInternal = href.startsWith('/');
    const sharedClassName = cn(
      buttonBase,
      'border border-white/12 bg-white/[0.04] text-white/90 hover:border-white/20 hover:bg-white/[0.08]',
    );

    if (isInternal) {
      return (
        <Link className={sharedClassName} to={href}>
          {children}
        </Link>
      );
    }

    return (
      <a className={sharedClassName} href={href}>
        {children}
      </a>
    );
  }

  return (
    <button
      className={cn(
        buttonBase,
        'border border-white/12 bg-white/[0.04] text-white/90 hover:border-white/20 hover:bg-white/[0.08]',
      )}
    >
      {children}
    </button>
  );
};

const MetricTile = ({ stat }: { stat: StatCard }) => (
  <div className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
    <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">
      {stat.label}
    </div>
    <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
      {stat.value}
    </div>
    <div className="mt-1 text-sm text-white/68">{stat.detail}</div>
  </div>
);

const FeatureTile = ({ card }: { card: FeatureCard }) => {
  const Icon = card.icon;

  return (
    <div
      className={cn(
        panelBase,
        'group h-full hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]',
      )}
      data-reveal
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
          <Icon className="size-5 text-cyan-200" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">{card.title}</h3>
          <p className="text-sm leading-6 text-white/70">{card.body}</p>
        </div>
      </div>
    </div>
  );
};

const SectionHeading = ({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) => (
  <div className="max-w-3xl space-y-3">
    <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-200/70">
      {kicker}
    </div>
    <h2 className="text-3xl font-semibold text-balance text-white sm:text-4xl">
      {title}
    </h2>
    <p className="max-w-2xl text-base leading-7 text-pretty text-white/70">
      {description}
    </p>
  </div>
);

const SignalHero = ({ variant }: { variant: VariantConfig }) => (
  <section className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
    <div className="space-y-6" data-hero-item>
      <AccentChip label={`${variant.label} · ${variant.lens}`} tone="cyan" />
      <div className="space-y-4">
        <h1 className="max-w-3xl text-5xl font-semibold leading-[0.92] tracking-[-0.04em] text-balance text-white sm:text-6xl lg:text-7xl">
          {variant.headline}
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-pretty text-white/72">
          {variant.subheadline}
        </p>
      </div>
      <div className="flex flex-wrap gap-3" data-hero-item>
        <PrimaryButton href="#pilot" tone="cyan">
          Bepul pilotni ko‘rish
          <ArrowRight className="size-4" />
        </PrimaryButton>
        <SecondaryButton href="/login">Appga kirish</SecondaryButton>
      </div>
      <div className="grid gap-3 sm:grid-cols-3" data-hero-item>
        {variant.heroStats.map((stat) => (
          <MetricTile key={stat.label} stat={stat} />
        ))}
      </div>
    </div>

    <div className={panelBase + ' relative overflow-hidden'} data-hero-item>
      <div
        data-orb
        className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-400/15 blur-3xl"
      />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              Kontrol xonasi
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              Bugungi status
            </div>
          </div>
          <AccentChip label={variant.badge} tone="cyan" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {variant.heroStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[22px] border border-white/10 bg-slate-950/40 p-4"
            >
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
                {stat.value}
              </div>
              <div className="mt-1 text-xs leading-5 text-white/60">
                {stat.detail}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
          {variant.heroFeed.map((item, index) => (
            <div
              key={item.title}
              className={cn(
                'flex items-start gap-3 rounded-2xl border border-white/0 bg-transparent px-2 py-2',
                index !== variant.heroFeed.length - 1 &&
                  'border-b border-white/6 pb-4',
              )}
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan-300" />
              <div>
                <div className="font-medium text-white">{item.title}</div>
                <p className="text-sm leading-6 text-white/64">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const StudioHero = ({ variant }: { variant: VariantConfig }) => (
  <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
    <div className="space-y-6" data-hero-item>
      <AccentChip label={`${variant.label} · ${variant.lens}`} tone="emerald" />
      <div className="space-y-5">
        <h1 className="max-w-4xl text-5xl font-semibold leading-[0.9] tracking-[-0.05em] text-balance text-white sm:text-6xl lg:text-7xl">
          {variant.headline}
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-pretty text-white/70">
          {variant.subheadline}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <PrimaryButton href="#pilot" tone="emerald">
          Pilotga o‘tish
          <ArrowRight className="size-4" />
        </PrimaryButton>
        <SecondaryButton href="/login">Appga kirish</SecondaryButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-3" data-hero-item>
        {variant.heroStats.map((stat) => (
          <MetricTile key={stat.label} stat={stat} />
        ))}
      </div>
    </div>

    <div className="grid gap-4" data-hero-item>
      <div className={panelBase + ' relative overflow-hidden'}>
        <div
          data-orb
          className="absolute -left-10 -top-8 h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl"
        />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              Editorial board
            </div>
            <AccentChip label={variant.badge} tone="emerald" />
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5">
            <div className="text-[11px] uppercase tracking-[0.32em] text-white/45">
              Tagline
            </div>
            <p className="mt-3 text-2xl leading-8 text-balance text-white">
              Qarz, davomat va jadvalni uzoq izohsiz ko‘rsatish kerak.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {variant.heroFeed.map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4"
              >
                <div className="font-medium text-white">{item.title}</div>
                <p className="mt-1 text-sm leading-6 text-white/64">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            icon: LayoutGrid,
            title: 'Bitta katta fokus',
            body: 'H1, bir paragraf, bir CTA. Hech narsa ortiqcha emas.',
          },
          {
            icon: Sparkles,
            title: 'Yumshoq motion',
            body: 'Hero kirishi va scroll reveal ko‘zni charchatmaydi.',
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={panelBase + ' flex items-start gap-3'}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Icon className="size-4 text-emerald-200" />
              </div>
              <div>
                <div className="font-medium text-white">{item.title}</div>
                <p className="mt-1 text-sm leading-6 text-white/64">
                  {item.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

const OperatorHero = ({ variant }: { variant: VariantConfig }) => (
  <section className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
    <div className="space-y-6" data-hero-item>
      <AccentChip label={`${variant.label} · ${variant.lens}`} tone="amber" />
      <div className="space-y-4">
        <h1 className="max-w-3xl text-5xl font-semibold leading-[0.92] tracking-[-0.045em] text-balance text-white sm:text-6xl lg:text-7xl">
          {variant.headline}
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-pretty text-white/70">
          {variant.subheadline}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <PrimaryButton href="#pilot" tone="amber">
          Pilot rejasi
          <ArrowRight className="size-4" />
        </PrimaryButton>
        <SecondaryButton href="/login">Appga kirish</SecondaryButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {variant.heroStats.map((stat) => (
          <MetricTile key={stat.label} stat={stat} />
        ))}
      </div>
    </div>

    <div className={panelBase + ' space-y-4'} data-hero-item>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.34em] text-white/45">
            Operator view
          </div>
          <div className="mt-1 text-xl font-semibold text-white">
            Bugungi oqim
          </div>
        </div>
        <AccentChip label={variant.badge} tone="amber" />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1.15fr]">
        <div className="space-y-3 rounded-[26px] border border-white/10 bg-slate-950/40 p-4">
          {variant.heroFeed.map((item, index) => (
            <div
              key={item.title}
              className={cn(
                'flex items-start gap-3 rounded-2xl px-2 py-2',
                index !== variant.heroFeed.length - 1 &&
                  'border-b border-white/6 pb-4',
              )}
            >
              <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-200" />
              <div>
                <div className="font-medium text-white">{item.title}</div>
                <p className="text-sm leading-6 text-white/64">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Qarz', value: '18', detail: 'kutilayotgan to‘lov' },
              { label: 'Davomat', value: '92%', detail: 'bugungi o‘rtacha' },
              { label: 'Guruh', value: '7', detail: 'hozir faol' },
              { label: 'Telegram', value: '24/7', detail: 'signal kanali' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-white/10 bg-slate-950/45 p-4"
              >
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums text-white">
                  {item.value}
                </div>
                <div className="mt-1 text-xs leading-5 text-white/60">
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

const LandingPrototype = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const variantId = normalizeVariant(searchParams.get('variant'));
  const variant = variants[variantId];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-hero-item], [data-reveal], [data-orb]', {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          clearProps: 'transform',
        });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-hero-item]', {
          opacity: 0,
          y: 24,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.09,
        });

        const revealItems = gsap.utils.toArray<HTMLElement>('[data-reveal]');
        revealItems.forEach((item) => {
          gsap.fromTo(
            item,
            { opacity: 0, y: 26, scale: 0.985 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: item,
                start: 'top 84%',
                once: true,
              },
            },
          );
        });

        gsap.to('[data-orb]', {
          y: -16,
          duration: 5.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [variantId], revertOnUpdate: true },
  );

  const setVariant = (next: VariantId) => {
    setSearchParams({ variant: next }, { replace: true });
  };

  return (
    <div
      id="top"
      ref={rootRef}
      className="relative min-h-dvh overflow-hidden bg-[#050b14] text-white"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.95),transparent_0%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:52px_52px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-7xl flex-col px-5 pb-32 pt-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_12px_28px_rgba(0,0,0,0.25)]">
              <Bot className="size-5 text-cyan-200" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-white/40">
                Autodrive
              </div>
              <div className="text-sm font-medium text-white/92">
                Landing prototype
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <AccentChip
              label={`Current lens: ${variant.label}`}
              tone={variant.accent as 'cyan' | 'emerald' | 'amber'}
            />
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/66">
              /prototype/landing?variant={variantId}
            </span>
          </div>
        </header>

        <main className="flex-1 space-y-20 pb-10 pt-10 lg:space-y-24">
          {variantId === 'signal' && <SignalHero variant={variant} />}
          {variantId === 'studio' && <StudioHero variant={variant} />}
          {variantId === 'operator' && <OperatorHero variant={variant} />}

          <section className={sectionBase} data-reveal>
            <SectionHeading
              kicker={variant.sectionKicker}
              title={variant.sectionTitle}
              description={variant.sectionDescription}
            />

            <div
              className={cn(
                'grid gap-4',
                variantId === 'studio'
                  ? 'md:grid-cols-[1.1fr_0.9fr]'
                  : variantId === 'operator'
                    ? 'md:grid-cols-[0.95fr_1.05fr]'
                    : 'md:grid-cols-3',
              )}
            >
              {variant.sectionCards.map((card) => (
                <FeatureTile key={card.title} card={card} />
              ))}
            </div>
          </section>

          <section
            id="pilot"
            className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]"
            data-reveal
          >
            <div className={panelBase + ' space-y-4'}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.34em] text-white/45">
                    Pilot offer
                  </div>
                  <h2 className="mt-2 text-3xl font-semibold text-white">
                    Bepul 1 oylik pilot
                  </h2>
                </div>
                <MessageSquareMore className="size-5 text-cyan-200" />
              </div>

              <p className="max-w-2xl text-base leading-7 text-white/70">
                Bu blok keyingi price page uchun ham sinov qiladi: qisqa va’da,
                kuchli foyda, minimal friction.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {sharedPilotCards.map((card) => (
                  <div
                    key={card.title}
                    className="rounded-[22px] border border-white/10 bg-slate-950/40 p-4"
                  >
                    <card.icon className="size-5 text-cyan-200" />
                    <div className="mt-3 font-medium text-white">
                      {card.title}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-white/64">
                      {card.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={panelBase + ' space-y-4'}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.34em] text-white/45">
                  Prototype verdict
                </div>
                <AccentChip
                  label={variant.badge}
                  tone={
                    variantId === 'operator'
                      ? 'amber'
                      : variantId === 'studio'
                        ? 'emerald'
                        : 'cyan'
                  }
                />
              </div>

              <div className="space-y-3 rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                    <ShieldCheck className="size-5 text-cyan-200" />
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      What this tests
                    </div>
                    <div className="text-sm text-white/62">
                      Qaysi visual yo‘l eng tez ishonch va aniqlik beradi.
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    'Hero kirishi va scroll reveal',
                    'Bitta yadro va’da',
                    'Past friction CTA',
                    'Dark-glass brand ritmi',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-3 text-sm text-white/76"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-cyan-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-white/10 bg-cyan-400/10 px-4 py-4 text-sm leading-6 text-cyan-50/90">
                  Verdict: landing public surface should stay separate from the
                  protected SPA; this prototype is the visual layer for that
                  decision.
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <PrimaryButton
                  href="/login"
                  tone={
                    variantId === 'operator'
                      ? 'amber'
                      : variantId === 'studio'
                        ? 'emerald'
                        : 'cyan'
                  }
                >
                  Appni ochish
                  <ArrowRight className="size-4" />
                </PrimaryButton>
                <SecondaryButton href="#top">Yuqoriga qaytish</SecondaryButton>
              </div>
            </div>
          </section>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#050b14]/85 px-4 py-3 backdrop-blur-2xl"
          aria-label="Landing prototype variants"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
              <Sparkles className="size-4 text-cyan-200" />
              <div className="text-sm text-white/78">
                Variant:{' '}
                <span className="font-semibold text-white">
                  {variant.label}
                </span>
                <span className="ml-2 text-white/40">•</span>
                <span className="ml-2 text-white/55">{variant.badge}</span>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {variantIds.map((id) => {
                const meta = variants[id];
                const active = id === variantId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVariant(id)}
                    aria-pressed={active}
                    className={cn(
                      'min-h-[56px] rounded-[18px] border px-4 py-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-200 ease-out active:scale-[0.96]',
                      active
                        ? 'border-cyan-300/40 bg-cyan-300/[0.12] shadow-[0_0_0_1px_rgba(103,232,249,0.2)]'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/[0.18] hover:bg-white/[0.06]',
                    )}
                  >
                    <div className="text-sm font-medium text-white">
                      {meta.label}
                    </div>
                    <div className="text-xs text-white/52">{meta.lens}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default LandingPrototype;
