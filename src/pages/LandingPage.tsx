import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

const stats = [
  { label: 'Faol talabalar', value: '1 ta CRM' },
  { label: 'Jarayonlar', value: 'Bitta panelda' },
  { label: 'Asosiy fokus', value: 'Dars, to‘lov, jadval' },
];

const features = [
  {
    icon: Users,
    title: 'Talabalar va guruhlar',
    body: 'Ro‘yxat, guruh, instruktor va o‘quvchi oqimini tartibli ushlang.',
  },
  {
    icon: CalendarDays,
    title: 'Jadval va davomat',
    body: 'Amaliy va nazariy darslarni bir joyda rejalashtiring.',
  },
  {
    icon: CircleDollarSign,
    title: 'To‘lov va qarzdorlik',
    body: 'To‘lovlar, bo‘lib to‘lash va qarzdorlikni ko‘rib boring.',
  },
  {
    icon: LayoutDashboard,
    title: 'Rahbar paneli',
    body: 'Kunlik holat, muhim sonlar va tezkor qarorlar uchun overview.',
  },
];

const LandingPage = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const primaryHref = hasHydrated && isAuthenticated ? '/dashboard' : '/login';
  const primaryLabel =
    hasHydrated && isAuthenticated ? 'Dasturni ochish' : 'Kirish';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_24%),linear-gradient(180deg,_rgba(2,6,23,0)_0%,_rgba(2,6,23,0.2)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 shadow-[0_0_40px_rgba(34,211,238,0.16)]">
              <ShieldCheck className="size-5 text-cyan-200" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.34em] text-white/40">
                Auto Maktab CRM
              </div>
              <div className="text-sm text-white/80">
                Avtomaktab boshqaruv tizimi
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="hidden text-white/70 hover:bg-white/5 hover:text-white sm:inline-flex"
              asChild
            >
              <a href="#features">Nimalar bor</a>
            </Button>
            <Button
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              asChild
            >
              <Link to={primaryHref}>
                {primaryLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 pt-10 sm:pt-14 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50/90">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                Public landing ochiq. Appga kirish alohida.
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  Avtomaktabingizdagi dars, to‘lov va jadval bir joyda.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                  Auto Maktab CRM o‘quvchilar, guruhlar, davomat va to‘lovlarni
                  tartibli boshqaradi. Public sahifa endi login ga sakramaydi:
                  mehmonlar avval landingni ko‘radi.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  asChild
                >
                  <Link to={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="#features">Xususiyatlar</a>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur"
                  >
                    <div className="text-sm text-white/55">{stat.label}</div>
                    <div className="mt-2 text-lg font-medium text-white">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
              <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-white/35">
                      Nima bor
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Operatsion panel
                    </h2>
                  </div>
                  <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                    live CRM
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.title}
                        className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                          <Icon className="size-5 text-cyan-200" />
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {feature.title}
                          </div>
                          <p className="mt-1 text-sm leading-6 text-white/62">
                            {feature.body}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <section
            id="features"
            className="mt-10 grid gap-4 md:grid-cols-3 lg:mt-16"
          >
            {[
              'Public sahifa SEO uchun ochiq',
              'Login alohida route orqali ishlaydi',
              'Protected app faqat ichki yo‘llarda qoladi',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white/78 backdrop-blur"
              >
                {item}
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
