import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  CircleDollarSign,
  Clock,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import { track } from '@/lib/umami';

// ponytail: const per spec — swap to real handle when confirmed
const TELEGRAM_LINK = 'https://t.me/automaktab_uz';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// ── Static SVG revenue sparkline (no recharts on landing chunk) ───────────
const MiniRevenueChart = () => (
  <svg
    viewBox="0 0 240 56"
    preserveAspectRatio="none"
    className="h-full w-full"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="mlg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0,52 C20,48 32,42 48,38 C64,34 76,30 92,24 C108,18 120,16 136,13 C152,10 168,8 184,6 C200,4 220,3 240,2"
      fill="none"
      stroke="#22D3EE"
      strokeWidth="1.5"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    />
    <path
      d="M0,52 C20,48 32,42 48,38 C64,34 76,30 92,24 C108,18 120,16 136,13 C152,10 168,8 184,6 C200,4 220,3 240,2 L240,56 L0,56 Z"
      fill="url(#mlg)"
    />
  </svg>
);

// ── Schedule columns (static for vignette) ────────────────────────────────
const SCHEDULE_COLS = [
  {
    day: 'Du',
    lessons: [
      { type: 'T', group: '1-guruh', time: '09:00' },
      { type: 'A', group: '3-guruh', time: '14:00' },
    ],
  },
  {
    day: 'Se',
    lessons: [{ type: 'A', group: '2-guruh', time: '10:30' }],
  },
  {
    day: 'Ch',
    lessons: [
      { type: 'T', group: '1-guruh', time: '09:00' },
      { type: 'A', group: '2-guruh', time: '14:00' },
    ],
  },
  {
    day: 'Pa',
    lessons: [
      { type: 'T', group: '3-guruh', time: '09:00' },
      { type: 'A', group: '1-guruh', time: '14:00' },
    ],
  },
  {
    day: 'Ju',
    lessons: [{ type: 'T', group: '2-guruh', time: '09:00' }],
  },
] as const;

const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasHydrated, isAuthenticated, navigate]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          isDesktop: '(min-width: 1024px)',
        },
        (ctx) => {
          const { motion, isDesktop } = ctx.conditions as {
            motion: boolean;
            isDesktop: boolean;
          };
          if (!motion) return;

          // ── Sticky nav glass-on-scroll ──────────────────────────────
          ScrollTrigger.create({
            start: 'top -80px',
            onEnter: () => navRef.current?.classList.add('nav-scrolled'),
            onLeaveBack: () =>
              navRef.current?.classList.remove('nav-scrolled'),
          });

          // ── Hero entrance ───────────────────────────────────────────
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

          if (isDesktop) {
            // SplitText word-mask reveal — each word rises from behind clip
            const heroSplit = SplitText.create('.hero-title', {
              type: 'words',
              mask: 'words',
            });
            tl.from('.hero-badge', { y: 24, opacity: 0, duration: 0.5 })
              .from(
                heroSplit.words,
                {
                  yPercent: 110,
                  stagger: 0.07,
                  duration: 0.65,
                  ease: 'power4.out',
                },
                '-=0.2',
              )
              .from(
                '.hero-sub',
                { y: 24, opacity: 0, duration: 0.6 },
                '-=0.35',
              )
              .from(
                '.hero-ctas > *',
                {
                  y: 18,
                  opacity: 0,
                  scale: 0.92,
                  stagger: 0.12,
                  duration: 0.5,
                  ease: 'back.out(1.7)',
                },
                '-=0.35',
              )
              .from(
                '.hero-mock-wrapper',
                { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out' },
                '-=0.25',
              );

            // ── Mock: slow float after entry (6–8s yoyo) ─────────────
            // ponytail: delay matches approx. timeline end (~2.2s)
            gsap.to('.hero-mock-wrapper', {
              y: -10,
              duration: 7,
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
              delay: 2.5,
            });

            // ── Mock: gentle parallax scrub (one tasteful scrub moment)
            gsap.to('.hero-mock-wrapper', {
              yPercent: 8,
              ease: 'none',
              scrollTrigger: {
                trigger: '.hero-mock-section',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.5,
              },
            });
          } else {
            // Mobile: simple block entrance, no split/float/scrub
            tl.from('.hero-badge', { y: 24, opacity: 0, duration: 0.5 })
              .from(
                '.hero-title',
                { y: 36, opacity: 0, duration: 0.8 },
                '-=0.2',
              )
              .from(
                '.hero-sub',
                { y: 24, opacity: 0, duration: 0.6 },
                '-=0.4',
              )
              .from(
                '.hero-ctas',
                { y: 20, opacity: 0, duration: 0.5 },
                '-=0.35',
              )
              .from(
                '.hero-mock-wrapper',
                { y: 56, opacity: 0, duration: 0.9, ease: 'power3.out' },
                '-=0.25',
              );
          }

          // ── Hero glow: parallax scrub + breathing pulse ─────────────
          gsap.to('.hero-glow-orb', {
            y: -80,
            ease: 'none',
            scrollTrigger: {
              trigger: '.hero-section',
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
          gsap.to('.hero-glow-orb', {
            scale: 1.08,
            duration: 4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });

          // ── Stats count-up (eases out, fires once) ──────────────────
          if (containerRef.current) {
            containerRef.current
              .querySelectorAll<HTMLElement>('[data-count-target]')
              .forEach((el) => {
                const target = parseFloat(
                  el.getAttribute('data-count-target') || '0',
                );
                const counter = { val: 0 };
                gsap.to(counter, {
                  val: target,
                  duration: 1.8,
                  ease: 'power2.out',
                  onUpdate() {
                    el.textContent = Math.round(counter.val).toLocaleString(
                      'uz-UZ',
                    );
                  },
                  scrollTrigger: {
                    trigger: el,
                    start: 'top 90%',
                    once: true,
                  },
                });
              });
          }

          // ── Benefit cards: y-rise stagger ───────────────────────────
          ScrollTrigger.batch('.benefit-card', {
            onEnter: (els) =>
              gsap.from(els, {
                y: 48,
                opacity: 0,
                stagger: 0.12,
                duration: 0.7,
                ease: 'power3.out',
              }),
            start: 'top 88%',
            once: true,
          });

          // ── Feature rows: fade + y stagger ──────────────────────────
          ScrollTrigger.batch('.feature-row', {
            onEnter: (els) =>
              gsap.from(els, {
                y: 48,
                opacity: 0,
                stagger: 0.15,
                duration: 0.8,
                ease: 'power3.out',
              }),
            start: 'top 85%',
            once: true,
          });

          // ── Feature vignettes: alternating x-slide + rotation settle ─
          gsap.utils.toArray<HTMLElement>('.vignette-right').forEach((el) =>
            gsap.from(el, {
              x: 48,
              rotation: 1.5,
              opacity: 0,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                once: true,
              },
            }),
          );
          gsap.utils.toArray<HTMLElement>('.vignette-left').forEach((el) =>
            gsap.from(el, {
              x: -48,
              rotation: -1.5,
              opacity: 0,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                once: true,
              },
            }),
          );

          // ── FAQ items: subtle fade only, staggered ──────────────────
          ScrollTrigger.batch('.faq-item', {
            onEnter: (els) =>
              gsap.from(els, {
                opacity: 0,
                stagger: 0.1,
                duration: 0.5,
                ease: 'power2.out',
              }),
            start: 'top 90%',
            once: true,
          });

          // ── Bottom CTA section ───────────────────────────────────────
          gsap.from('.cta-section', {
            y: 36,
            opacity: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '.cta-section',
              start: 'top 88%',
              once: true,
            },
          });
        },
      );
      return () => mm.revert();
    },
    { scope: containerRef },
  );

  // ── Static data ──────────────────────────────────────────────────────────
  const benefits = [
    {
      icon: CircleDollarSign,
      titleKey: 'landing.benefit1_title',
      bodyKey: 'landing.benefit1_body',
      gradient: 'from-cyan-400/20 to-cyan-400/0',
      iconColor: 'text-cyan-300',
      iconBg: 'bg-cyan-400/10 border-cyan-400/20',
      hoverBorder: 'hover:border-cyan-400/30',
    },
    {
      icon: CalendarCheck2,
      titleKey: 'landing.benefit2_title',
      bodyKey: 'landing.benefit2_body',
      gradient: 'from-violet-400/20 to-violet-400/0',
      iconColor: 'text-violet-300',
      iconBg: 'bg-violet-400/10 border-violet-400/20',
      hoverBorder: 'hover:border-violet-400/30',
    },
    {
      icon: Clock,
      titleKey: 'landing.benefit3_title',
      bodyKey: 'landing.benefit3_body',
      gradient: 'from-emerald-400/20 to-emerald-400/0',
      iconColor: 'text-emerald-300',
      iconBg: 'bg-emerald-400/10 border-emerald-400/20',
      hoverBorder: 'hover:border-emerald-400/30',
    },
  ];

  const faqs = [
    { q: 'landing.faq1_q', a: 'landing.faq1_a' },
    { q: 'landing.faq2_q', a: 'landing.faq2_a' },
    { q: 'landing.faq3_q', a: 'landing.faq3_a' },
    { q: 'landing.faq4_q', a: 'landing.faq4_a' },
    { q: 'landing.faq5_q', a: 'landing.faq5_a' },
  ];

  const heroTitle = t('landing.hero_title');
  const heroAccent = t('landing.hero_title_accent');
  const accentIdx = heroTitle.lastIndexOf(heroAccent);
  const titleBefore =
    accentIdx >= 0 ? heroTitle.slice(0, accentIdx) : heroTitle;
  const titleAfter =
    accentIdx >= 0 ? heroTitle.slice(accentIdx + heroAccent.length) : '';

  const kpiCards = [
    {
      label: t('landing.mock_income'),
      value: '4 800 000',
      unit: "so'm",
      Icon: Wallet,
      tone: 'text-cyan-300',
      iconBg: 'bg-cyan-400/10 text-cyan-300',
      delta: '+12.4%',
      deltaUp: true,
    },
    {
      label: t('landing.mock_students'),
      value: '147',
      unit: '',
      Icon: Users,
      tone: 'text-blue-300',
      iconBg: 'bg-blue-400/10 text-blue-300',
      delta: '+8 yangi',
      deltaUp: true,
    },
    {
      label: t('landing.mock_debt'),
      value: '1 250 000',
      unit: "so'm",
      Icon: AlertTriangle,
      tone: 'text-amber-300',
      iconBg: 'bg-amber-400/10 text-amber-300',
      delta: '3 ta talaba',
      deltaUp: false,
    },
    {
      label: t('dashboard.hero_graduates'),
      value: '38',
      unit: '',
      Icon: BadgeCheck,
      tone: 'text-emerald-300',
      iconBg: 'bg-emerald-400/10 text-emerald-300',
      delta: "94% o'tish",
      deltaUp: true,
    },
  ];

  const debtors = [
    { nameKey: 'landing.mock_debtor1', amount: '450 000', days: 12 },
    { nameKey: 'landing.mock_debtor2', amount: '280 000', days: 7 },
    { nameKey: 'landing.mock_debtor3', amount: '520 000', days: 21 },
  ];

  const debtVignette = [
    { name: 'S. Toshmatov', course: 'Avto maktab', debt: '450 000', paid: false, days: 12 },
    { name: 'A. Karimov', course: 'Tezkor', debt: '280 000', paid: false, days: 7 },
    { name: 'N. Yusupova', course: 'Avto maktab', debt: '520 000', paid: false, days: 21 },
    { name: 'M. Umarov', course: 'Tezkor', debt: '—', paid: true, days: 0 },
  ];

  const attendanceVignette = [
    { name: 'Hasan Karimov', status: 'present' },
    { name: 'Aziz Toshmatov', status: 'absent' },
    { name: 'Malika Umarova', status: 'present' },
    { name: 'Bobur Nazarov', status: 'late' },
    { name: 'Zulfiya Hasanova', status: 'present' },
  ] as { name: string; status: 'present' | 'absent' | 'late' }[];

  const statusLabel = (s: 'present' | 'absent' | 'late') =>
    s === 'present' ? 'Keldi' : s === 'absent' ? 'Kelmadi' : 'Kechikdi';

  const statusCls = (s: 'present' | 'absent' | 'late') =>
    s === 'present'
      ? 'bg-emerald-400/10 text-emerald-300'
      : s === 'absent'
        ? 'bg-rose-400/10 text-rose-300'
        : 'bg-amber-400/10 text-amber-300';

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white"
      style={{ WebkitFontSmoothing: 'antialiased' } as React.CSSProperties}
    >
      {/* ── Background glows ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="hero-glow-orb will-change-transform absolute -top-40 left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.12)_0%,transparent_70%)]" />
        <div className="absolute right-[-5%] top-1/3 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.07)_0%,transparent_70%)]" />
        <div className="absolute bottom-1/4 left-[-5%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      {/* ── Sticky nav ───────────────────────────────────────────────── */}
      <header
        ref={navRef}
        className="sticky top-0 z-30 transition-all duration-300"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 shadow-[0_0_28px_rgba(34,211,238,0.16)]">
              <ShieldCheck className="size-4 text-cyan-200" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/85">
              Auto Maktab{' '}
              <span className="font-normal text-white/35">CRM</span>
            </span>
          </div>
          <Button
            className="active:scale-[0.96] h-9 gap-1.5 bg-cyan-400 px-5 text-sm text-slate-950 transition-all hover:bg-cyan-300"
            asChild
          >
            <Link to="/login" onClick={() => track('login_click')}>
              {t('landing.nav_cta')}
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="hero-section relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="hero-badge mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-1.5 text-xs font-medium text-cyan-100/80 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            {t('landing.hero_badge')}
          </div>

          <h1 className="hero-title font-heading mb-5 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            {titleBefore}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-cyan-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                {heroAccent}
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/60 to-cyan-400/0"
              />
            </span>
            {titleAfter}
          </h1>

          <p className="hero-sub mx-auto mb-8 max-w-lg text-base leading-relaxed text-white/50 sm:text-lg">
            {t('landing.hero_sub')}
          </p>

          <div className="hero-ctas flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="active:scale-[0.96] h-12 gap-2 bg-cyan-400 px-8 text-slate-950 transition-all hover:bg-cyan-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.30)]"
              asChild
            >
              <Link to="/login" onClick={() => track('demo_click')}>
                {t('landing.cta_demo')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="active:scale-[0.96] h-12 gap-2 border-white/12 bg-white/5 px-8 text-white transition-all hover:bg-white/10 hover:text-white"
              asChild
            >
              <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" onClick={() => track('telegram_click')}>
                <Send className="size-4" />
                {t('landing.cta_free')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Dashboard Mock ───────────────────────────────────────────── */}
      <section className="hero-mock-section relative z-10 mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="hero-mock-wrapper will-change-transform overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/70 shadow-[0_40px_100px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/8 bg-white/[0.015] px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />
            <div className="mx-auto flex h-5 w-52 items-center justify-center rounded-full bg-white/[0.06] text-[10px] tracking-wide text-white/25">
              app.automaktab.uz
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* Dashboard header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-heading text-sm font-bold text-white/90">
                  Xayrli kun, Mansur
                </p>
                <p className="mt-0.5 text-[11px] text-white/35">
                  {t('dashboard.hero_subtitle')}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {t('dashboard.live_label')}
              </span>
            </div>

            {/* KPI row — mirrors real DashboardPage KpiCard */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className="relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.035] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                      {card.label}
                    </p>
                    <div
                      className={`grid h-6 w-6 place-items-center rounded-md ${card.iconBg}`}
                    >
                      <card.Icon className="size-3" />
                    </div>
                  </div>
                  <p
                    className={`font-heading tabular-nums text-base font-bold leading-tight sm:text-lg ${card.tone}`}
                  >
                    {card.value}
                    {card.unit && (
                      <span className="ml-0.5 text-[10px] font-normal text-white/30">
                        {card.unit}
                      </span>
                    )}
                  </p>
                  <p
                    className={`mt-1 text-[10px] font-semibold ${card.deltaUp ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {card.delta}
                  </p>
                </div>
              ))}
            </div>

            {/* Revenue trend + debtors */}
            <div className="grid gap-3 sm:grid-cols-5">
              {/* Mini area chart */}
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:col-span-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white/65">
                      {t('landing.mock_chart_title')}
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/30">
                      {t('landing.mock_chart_sub')}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
                    <TrendingUp className="size-3" />
                    +18%
                  </span>
                </div>
                <div className="h-14">
                  <MiniRevenueChart />
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/25">
                  <span className="inline-block h-1.5 w-4 rounded-full bg-cyan-400/60" />
                  {t('landing.mock_chart_period')}
                </div>
              </div>

              {/* Debtors list */}
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/65">
                    {t('landing.mock_debtors_title')}
                  </span>
                  <span className="rounded-full border border-rose-400/25 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    3
                  </span>
                </div>
                <div className="space-y-1.5">
                  {debtors.map((d) => (
                    <div
                      key={d.nameKey}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-400/15 text-[10px] font-semibold text-rose-300">
                          {t(d.nameKey)[0]}
                        </div>
                        <span className="text-xs text-white/60">
                          {t(d.nameKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading tabular-nums text-xs font-semibold text-rose-300">
                          {d.amount}
                        </span>
                        <span className="text-[10px] text-white/25">
                          {d.days}k
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar (count-up on scroll) ───────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {(
            [
              { target: 50, suffix: '+', labelKey: 'landing.stats_schools_label' },
              { target: 5000, suffix: '+', labelKey: 'landing.stats_students_label' },
              { target: 12, suffix: ' oy', labelKey: 'landing.stats_months_label' },
            ] as const
          ).map((stat, i) => (
            <div
              key={i}
              className="bg-white/[0.02] px-8 py-7 text-center"
            >
              <p className="font-heading tabular-nums text-3xl font-bold text-white sm:text-4xl">
                <span data-count-target={stat.target}>0</span>
                <span className="text-cyan-300">{stat.suffix}</span>
              </p>
              <p className="mt-2 text-sm text-white/40">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="font-heading mb-3 text-2xl font-bold sm:text-3xl">
            {t('landing.benefits_title')}
          </h2>
          <p className="text-sm text-white/40">{t('landing.benefits_sub')}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.titleKey}
                className={`benefit-card group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition-colors duration-300 ${b.hoverBorder}`}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
                }}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${b.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />
                {/* ponytail: CSS var trick — no per-frame GSAP, just a repaint on mouse move */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle 140px at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.06), transparent)' }}
                />
                <div className="relative">
                  <div
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl border ${b.iconBg}`}
                  >
                    <Icon className={`size-5 ${b.iconColor}`} />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">
                    {t(b.titleKey)}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/45">
                    {t(b.bodyKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Feature alternating sections ─────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="font-heading mb-3 text-2xl font-bold sm:text-3xl">
            {t('landing.features_title')}
          </h2>
          <p className="text-sm text-white/40">{t('landing.features_sub')}</p>
        </div>

        <div className="space-y-20 sm:space-y-28">
          {/* ── Feature 1: Debt tracking ──────────────────────────────── */}
          <div className="feature-row grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
                {t('landing.feature_debt_eyebrow')}
              </p>
              <h3 className="font-heading mb-4 text-xl font-bold leading-tight sm:text-2xl">
                {t('landing.feature_debt_title')}
              </h3>
              <p className="text-sm leading-relaxed text-white/45">
                {t('landing.feature_debt_body')}
              </p>
            </div>
            {/* Debt vignette — mirrors StudentsPage table patterns */}
            <div className="vignette-right rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/60">
                  {t('landing.mock_debtors_title')}
                </span>
                <span className="rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                  4 ta qarzdor
                </span>
              </div>
              <div className="space-y-1.5">
                {debtVignette.map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-bold text-white/50">
                      {row.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white/80">
                        {row.name}
                      </p>
                      <p className="text-[10px] text-white/35">{row.course}</p>
                    </div>
                    <div className="text-right">
                      {row.paid ? (
                        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          To&apos;liq
                        </span>
                      ) : (
                        <div>
                          <p className="font-heading tabular-nums text-xs font-semibold text-rose-300">
                            {row.debt}
                          </p>
                          <p className="text-[10px] text-white/25">
                            {row.days}k
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Feature 2: Attendance ─────────────────────────────────── */}
          <div className="feature-row grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="order-last lg:order-first">
              {/* Attendance vignette — mirrors AttendancePage patterns */}
              <div className="vignette-left rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white/65">
                      1-guruh · Teoriya
                    </p>
                    <p className="mt-0.5 text-[10px] text-white/30">
                      15.06.2026 — 09:00
                    </p>
                  </div>
                  <button
                    type="button"
                    className="min-h-[44px] rounded-lg bg-cyan-400/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    Saqlash
                  </button>
                </div>
                <div className="space-y-1.5">
                  {attendanceVignette.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-[10px] font-bold text-white/50">
                          {s.name[0]}
                        </div>
                        <span className="text-xs text-white/70">{s.name}</span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusCls(s.status)}`}
                      >
                        {statusLabel(s.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-400">
                {t('landing.feature_att_eyebrow')}
              </p>
              <h3 className="font-heading mb-4 text-xl font-bold leading-tight sm:text-2xl">
                {t('landing.feature_att_title')}
              </h3>
              <p className="text-sm leading-relaxed text-white/45">
                {t('landing.feature_att_body')}
              </p>
            </div>
          </div>

          {/* ── Feature 3: Schedule ───────────────────────────────────── */}
          <div className="feature-row grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-400">
                {t('landing.feature_sch_eyebrow')}
              </p>
              <h3 className="font-heading mb-4 text-xl font-bold leading-tight sm:text-2xl">
                {t('landing.feature_sch_title')}
              </h3>
              <p className="text-sm leading-relaxed text-white/45">
                {t('landing.feature_sch_body')}
              </p>
            </div>
            {/* Schedule vignette — mirrors SchedulePage week calendar */}
            <div className="vignette-right rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-white/65">
                  Haftalik jadval
                </span>
                <div className="flex gap-1.5">
                  <span className="flex items-center gap-1 rounded-md bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-sm bg-cyan-400" />
                    Teoriya
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-sm bg-amber-400" />
                    Amaliy
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {SCHEDULE_COLS.map((col) => (
                  <div key={col.day}>
                    <p className="mb-1.5 text-center text-[10px] font-semibold text-white/30">
                      {col.day}
                    </p>
                    <div className="space-y-1.5">
                      {col.lessons.map((lesson) => (
                        <div
                          key={`${col.day}-${lesson.time}`}
                          className={`rounded-md p-1.5 ${
                            lesson.type === 'T'
                              ? 'border border-cyan-400/15 bg-cyan-400/10'
                              : 'border border-amber-400/15 bg-amber-400/10'
                          }`}
                        >
                          <p
                            className={`text-[9px] font-semibold ${lesson.type === 'T' ? 'text-cyan-300' : 'text-amber-300'}`}
                          >
                            {lesson.group}
                          </p>
                          <p className="text-[9px] text-white/30">
                            {lesson.time}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="faq-section relative z-10 mx-auto max-w-2xl px-4 pb-24 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-10 text-center text-2xl font-bold sm:text-3xl">
          {t('landing.faq_title')}
        </h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`faq-${i}`}
              className="faq-item overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] px-5"
            >
              <AccordionTrigger className="py-4 text-left text-sm font-semibold text-white/80 hover:no-underline sm:text-base [&>svg]:shrink-0 [&>svg]:text-white/30">
                {t(faq.q)}
              </AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-relaxed text-white/45">
                {t(faq.a)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="cta-section relative z-10 mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.07] via-white/[0.01] to-blue-400/[0.07] p-10 text-center sm:p-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.12),transparent_60%)]"
          />
          <h2 className="font-heading relative mb-4 text-2xl font-bold sm:text-4xl">
            {t('landing.cta2_title')}
          </h2>
          <p className="relative mb-8 text-sm text-white/45 sm:text-base">
            {t('landing.cta2_sub')}
          </p>
          <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="active:scale-[0.96] h-12 gap-2 bg-cyan-400 px-8 text-slate-950 transition-all hover:bg-cyan-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.30)]"
              asChild
            >
              <Link to="/login" onClick={() => track('demo_click')}>
                {t('landing.cta_demo')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="active:scale-[0.96] h-12 gap-2 border-white/12 bg-white/5 px-8 text-white transition-all hover:bg-white/10 hover:text-white"
              asChild
            >
              <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer" onClick={() => track('telegram_click')}>
                <Send className="size-4" />
                {t('landing.cta_free')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-white/30 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
              <ShieldCheck className="size-3.5 text-cyan-200" />
            </div>
            <span className="font-semibold text-white/45">Auto Maktab CRM</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link
              to="/login"
              className="relative transition-colors hover:text-white/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-current after:transition-[width] after:duration-300 hover:after:w-full"
              onClick={() => track('login_click')}
            >
              {t('landing.nav_cta')}
            </Link>
            <a
              href={TELEGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white/55"
            >
              Telegram
            </a>
            <span>{t('landing.footer_copy')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
