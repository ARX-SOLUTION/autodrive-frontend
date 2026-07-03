import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  ArrowRight,
  CalendarCheck2,
  CircleDollarSign,
  Clock,
  Send,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

// ponytail: const per spec — swap to real handle when confirmed
const TELEGRAM_LINK = 'https://t.me/automaktab_uz';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const LandingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasHydrated, isAuthenticated, navigate]);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          reduce: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const { motion } = ctx.conditions as {
            motion: boolean;
            reduce: boolean;
          };

          if (!motion) return;

          // ── Hero entrance timeline ──────────────────────────────────────
          const tl = gsap.timeline({
            defaults: { ease: 'power3.out', duration: 0.7 },
          });

          tl.from('.hero-badge', { y: 24, opacity: 0, duration: 0.5 })
            .from('.hero-title', { y: 36, opacity: 0, duration: 0.8 }, '-=0.2')
            .from('.hero-sub', { y: 24, opacity: 0, duration: 0.6 }, '-=0.4')
            .from('.hero-ctas', { y: 20, opacity: 0, duration: 0.5 }, '-=0.35');

          // ── Parallax: hero glow orb (transform-only, scrub) ─────────────
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

          // ── Benefit cards: stagger reveal ───────────────────────────────
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

          // ── Dashboard mock reveal ────────────────────────────────────────
          gsap.from('.dashboard-mock', {
            y: 56,
            opacity: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: '.dashboard-mock',
              start: 'top 82%',
              once: true,
            },
          });

          // ── FAQ reveal ──────────────────────────────────────────────────
          gsap.from('.faq-section', {
            y: 36,
            opacity: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '.faq-section',
              start: 'top 88%',
              once: true,
            },
          });

          // ── Bottom CTA reveal ───────────────────────────────────────────
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

  const benefits = [
    {
      icon: CircleDollarSign,
      titleKey: 'landing.benefit1_title',
      bodyKey: 'landing.benefit1_body',
      gradient: 'from-cyan-400/20 to-cyan-400/0',
      iconColor: 'text-cyan-300',
      hoverBorder: 'hover:border-cyan-400/30',
    },
    {
      icon: CalendarCheck2,
      titleKey: 'landing.benefit2_title',
      bodyKey: 'landing.benefit2_body',
      gradient: 'from-violet-400/20 to-violet-400/0',
      iconColor: 'text-violet-300',
      hoverBorder: 'hover:border-violet-400/30',
    },
    {
      icon: Clock,
      titleKey: 'landing.benefit3_title',
      bodyKey: 'landing.benefit3_body',
      gradient: 'from-emerald-400/20 to-emerald-400/0',
      iconColor: 'text-emerald-300',
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

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white"
      style={{ WebkitFontSmoothing: 'antialiased' } as React.CSSProperties}
    >
      {/* ── Background glows ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="hero-glow-orb absolute -top-40 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.13)_0%,transparent_70%)]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────── */}
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 shadow-[0_0_32px_rgba(34,211,238,0.18)]">
            <ShieldCheck className="size-5 text-cyan-200" />
          </div>
          <span className="text-sm font-medium tracking-tight text-white/80">
            Auto Maktab <span className="text-white/35">CRM</span>
          </span>
        </div>

        <Button
          className="active:scale-[0.96] bg-cyan-400 text-slate-950 transition-transform hover:bg-cyan-300"
          asChild
        >
          <Link to="/login">
            {t('landing.nav_cta')}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="hero-section relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="hero-badge mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-100/80 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            {t('landing.hero_badge')}
          </div>

          <h1 className="hero-title font-heading mb-6 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
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

          <p className="hero-sub mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/55 sm:text-xl">
            {t('landing.hero_sub')}
          </p>

          <div className="hero-ctas flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="active:scale-[0.96] h-12 gap-2 bg-cyan-400 px-8 text-slate-950 transition-transform hover:bg-cyan-300"
              asChild
            >
              <Link to="/login">
                {t('landing.cta_demo')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="active:scale-[0.96] h-12 gap-2 border-white/15 bg-white/5 px-8 text-white transition-all hover:bg-white/10 hover:text-white"
              asChild
            >
              <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
                <Send className="size-4" />
                {t('landing.cta_free')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="font-heading mb-3 text-2xl font-semibold sm:text-3xl">
            {t('landing.benefits_title')}
          </h2>
          <p className="text-white/45">{t('landing.benefits_sub')}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.titleKey}
                className={`benefit-card group relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.025] p-7 transition-colors duration-300 ${b.hoverBorder}`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${b.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />
                <div className="relative">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                    <Icon className={`size-6 ${b.iconColor}`} />
                  </div>
                  <h3 className="mb-3 text-lg font-semibold text-white">
                    {t(b.titleKey)}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/50">
                    {t(b.bodyKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Dashboard Mock ───────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="font-heading mb-3 text-2xl font-semibold sm:text-3xl">
            {t('landing.mock_title')}
          </h2>
          <p className="text-white/45">{t('landing.mock_subtitle')}</p>
        </div>

        <div className="dashboard-mock overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/60 shadow-[0_32px_96px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {/* Fake browser chrome */}
          <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/40" />
            <div className="mx-auto flex h-5 w-48 items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-white/25">
              app.automaktab.uz
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {/* Stat cards */}
            <div className="mb-5 grid grid-cols-3 gap-3">
              {[
                {
                  labelKey: 'landing.mock_income',
                  value: '4 800 000',
                  color: 'text-cyan-300',
                  Icon: TrendingUp,
                },
                {
                  labelKey: 'landing.mock_debt',
                  value: '1 250 000',
                  color: 'text-rose-300',
                  Icon: CircleDollarSign,
                },
                {
                  labelKey: 'landing.mock_students',
                  value: '147',
                  color: 'text-emerald-300',
                  Icon: CalendarCheck2,
                },
              ].map((card) => (
                <div
                  key={card.labelKey}
                  className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] text-white/35">
                    <card.Icon className="size-3" />
                    {t(card.labelKey)}
                  </div>
                  <div
                    className={`font-heading tabular-nums text-xl font-semibold ${card.color}`}
                  >
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Debtors list */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-white/65">
                  {t('landing.mock_debtors_title')}
                </span>
                <span className="rounded-full border border-rose-400/25 bg-rose-400/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-300">
                  3
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    nameKey: 'landing.mock_debtor1',
                    amount: '450 000',
                    days: 12,
                  },
                  {
                    nameKey: 'landing.mock_debtor2',
                    amount: '280 000',
                    days: 7,
                  },
                  {
                    nameKey: 'landing.mock_debtor3',
                    amount: '520 000',
                    days: 21,
                  },
                ].map((d) => (
                  <div
                    key={d.nameKey}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/60">
                        {t(d.nameKey)[0]}
                      </div>
                      <span className="text-sm text-white/65">
                        {t(d.nameKey)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-heading tabular-nums text-sm font-medium text-rose-300">
                        {d.amount}
                      </span>
                      <span className="text-xs text-white/25">{d.days}k</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="faq-section relative z-10 mx-auto max-w-3xl px-4 pb-28 sm:px-6 lg:px-8">
        <h2 className="font-heading mb-10 text-center text-2xl font-semibold sm:text-3xl">
          {t('landing.faq_title')}
        </h2>
        <Accordion type="single" collapsible className="space-y-2.5">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`faq-${i}`}
              className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] px-5"
            >
              <AccordionTrigger className="py-5 text-left text-sm font-medium text-white/80 hover:no-underline sm:text-base [&>svg]:shrink-0 [&>svg]:text-white/35">
                {t(faq.q)}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-white/50">
                {t(faq.a)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="cta-section relative z-10 mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.07] via-white/[0.015] to-blue-400/[0.07] p-12 text-center sm:p-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.12),transparent_60%)]"
          />
          <h2 className="font-heading relative mb-4 text-2xl font-semibold sm:text-4xl">
            {t('landing.cta2_title')}
          </h2>
          <p className="relative mb-8 text-white/50">{t('landing.cta2_sub')}</p>
          <div className="relative flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="active:scale-[0.96] h-12 gap-2 bg-cyan-400 px-8 text-slate-950 transition-transform hover:bg-cyan-300"
              asChild
            >
              <Link to="/login">
                {t('landing.cta_demo')}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="active:scale-[0.96] h-12 gap-2 border-white/15 bg-white/5 px-8 text-white transition-all hover:bg-white/10 hover:text-white"
              asChild
            >
              <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
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
            <span className="font-medium text-white/45">Auto Maktab CRM</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a
              href={TELEGRAM_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white/55"
            >
              Telegram
            </a>
            <span>+998 90 000 00 00</span>
            <span>{t('landing.footer_copy')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
