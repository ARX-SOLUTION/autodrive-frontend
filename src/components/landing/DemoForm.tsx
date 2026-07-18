import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDemoRequest } from '@/services/demoService';
import { track } from '@/lib/umami';

// ── Canonical Uzbekistan regions (display & value) ────────────────────────
const UZ_REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Andijon',
  "Farg'ona",
  'Namangan',
  'Samarqand',
  'Buxoro',
  'Xorazm',
  'Qashqadaryo',
  'Surxondaryo',
  'Jizzax',
  'Sirdaryo',
  'Navoiy',
  "Qoraqalpog'iston",
] as const;

const STUDENT_BUCKETS = ['<50', '50-150', '150-300', '300+'] as const;

// ── Zod schema ─────────────────────────────────────────────────────────────
const demoSchema = z.object({
  full_name: z.string().min(2, 'demo_form.validation.full_name_required'),
  phone: z
    .string()
    .min(1, 'demo_form.validation.phone_required')
    .regex(
      /^\+998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/,
      'demo_form.validation.phone_invalid',
    ),
  region: z.string().min(1, 'demo_form.validation.region_required'),
  center_name: z.string().optional(),
  student_count: z.string().optional(),
  note: z.string().optional(),
});

type DemoFormValues = z.infer<typeof demoSchema>;

// ── Success SVG checkmark (GSAP-drawn) ────────────────────────────────────
const CheckmarkSvg = ({
  drawRef,
}: {
  drawRef: React.RefObject<SVGCircleElement>;
}) => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    className="mx-auto mb-5"
  >
    <circle
      cx="32"
      cy="32"
      r="28"
      stroke="rgba(34,211,238,0.25)"
      strokeWidth="2"
    />
    <circle
      ref={drawRef}
      cx="32"
      cy="32"
      r="28"
      stroke="hsl(var(--primary))"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeDasharray="175.93"
      strokeDashoffset="175.93"
      transform="rotate(-90 32 32)"
    />
    <polyline
      points="20,33 28,41 44,24"
      stroke="hsl(var(--primary))"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="36"
      strokeDashoffset="36"
      className="check-tick"
    />
  </svg>
);

// ── Main component ─────────────────────────────────────────────────────────
export const DemoForm = () => {
  const { t } = useTranslation();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const mutation = useCreateDemoRequest();

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      region: '',
      center_name: '',
      student_count: '',
      note: '',
    },
  });

  // ── Success animation: ring draw + tick ──────────────────────────────────
  useGSAP(
    () => {
      if (!isSuccess || !ringRef.current) return;
      const tick = successRef.current?.querySelector('.check-tick');
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline();
        // fade out form content
        tl.to(contentRef.current, {
          opacity: 0,
          y: -16,
          duration: 0.3,
          ease: 'power2.in',
        })
          // fade in success panel
          .set(successRef.current, { display: 'flex' })
          .from(successRef.current, {
            opacity: 0,
            y: 20,
            duration: 0.4,
            ease: 'power3.out',
          })
          // draw ring
          .to(
            ringRef.current,
            { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' },
            '-=0.1',
          )
          // draw tick
          .to(
            tick ?? null,
            { strokeDashoffset: 0, duration: 0.35, ease: 'power2.out' },
            '-=0.2',
          );
        return () => mm.revert();
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(contentRef.current, { display: 'none' });
        gsap.set(successRef.current, { display: 'flex', opacity: 1 });
        if (ringRef.current) gsap.set(ringRef.current, { strokeDashoffset: 0 });
        if (tick) gsap.set(tick, { strokeDashoffset: 0 });
      });
    },
    { dependencies: [isSuccess] },
  );

  const onSubmit = async (values: DemoFormValues) => {
    try {
      await mutation.mutateAsync({
        full_name: values.full_name,
        phone: values.phone,
        region: values.region,
        center_name: values.center_name || undefined,
        student_count: values.student_count || undefined,
        note: values.note || undefined,
      });
      track('demo_form_submit');
      toast.success(t('demo_form.success_title'));
      setIsSuccess(true);
    } catch {
      toast.error(t('demo_form.error_generic'));
    }
  };

  // ── Shared focus handlers ────────────────────────────────────────────────
  const onFocus = () => setIsFocused(true);
  const onBlur = () => setIsFocused(false);

  return (
    <div
      ref={cardRef}
      // ponytail: CSS-only glow via transition-shadow — no per-frame GSAP needed here
      className={[
        'relative overflow-hidden rounded-[24px] border bg-white/90 backdrop-blur-xl',
        'transition-all duration-500',
        'dark:bg-slate-900/70',
        isFocused
          ? 'border-cyan-400/40 shadow-[0_0_0_1.5px_rgba(34,211,238,0.25),0_8px_80px_rgba(34,211,238,0.10),0_40px_80px_rgba(0,0,0,0.10)]'
          : 'border-slate-200 shadow-[0_40px_80px_rgba(0,0,0,0.08)] dark:border-white/10 dark:shadow-[0_40px_80px_rgba(0,0,0,0.45)]',
      ].join(' ')}
    >
      {/* Ambient glow orb — activates with focus */}
      <div
        aria-hidden="true"
        className={[
          'pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full',
          'bg-[radial-gradient(circle,rgba(34,211,238,0.12)_0%,transparent_70%)]',
          'transition-opacity duration-700',
          isFocused ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* ── Form content ──────────────────────────────────────────────── */}
      <div ref={contentRef} className="p-6 sm:p-8 lg:p-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Full name */}
              <FormField
                control={form.control}
                name="full_name"
                render={({ field, fieldState }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="text-sm font-medium text-slate-700 dark:text-white/70">
                      {t('demo_form.full_name_label')}{' '}
                      <span className="text-rose-500" aria-hidden="true">
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('demo_form.full_name_placeholder')}
                        autoComplete="name"
                        onFocus={onFocus}
                        onBlur={() => {
                          field.onBlur();
                          onBlur();
                        }}
                        aria-invalid={!!fieldState.error}
                        className={[
                          'h-11 border-slate-200 bg-slate-50 transition-all duration-200',
                          'focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25 focus:scale-[1.005]',
                          'dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30',
                          fieldState.error
                            ? 'border-rose-400/60 focus:ring-rose-400/25'
                            : '',
                        ].join(' ')}
                      />
                    </FormControl>
                    <FormMessage>
                      {fieldState.error &&
                        t(fieldState.error.message as string)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="text-sm font-medium text-slate-700 dark:text-white/70">
                      {t('demo_form.phone_label')}{' '}
                      <span className="text-rose-500" aria-hidden="true">
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        inputMode="tel"
                        placeholder={t('demo_form.phone_placeholder')}
                        autoComplete="tel"
                        onFocus={onFocus}
                        onBlur={() => {
                          field.onBlur();
                          onBlur();
                        }}
                        aria-invalid={!!fieldState.error}
                        className={[
                          'h-11 border-slate-200 bg-slate-50 font-mono transition-all duration-200',
                          'focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25 focus:scale-[1.005]',
                          'dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30',
                          fieldState.error
                            ? 'border-rose-400/60 focus:ring-rose-400/25'
                            : '',
                        ].join(' ')}
                      />
                    </FormControl>
                    <FormMessage>
                      {fieldState.error &&
                        t(fieldState.error.message as string)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Region */}
              <FormField
                control={form.control}
                name="region"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700 dark:text-white/70">
                      {t('demo_form.region_label')}{' '}
                      <span className="text-rose-500" aria-hidden="true">
                        *
                      </span>
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => (open ? onFocus() : onBlur())}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={[
                            'h-11 border-slate-200 bg-slate-50 transition-all duration-200',
                            'focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25',
                            'dark:border-white/10 dark:bg-white/[0.04] dark:text-white',
                            fieldState.error ? 'border-rose-400/60' : '',
                          ].join(' ')}
                        >
                          <SelectValue
                            placeholder={t('demo_form.region_placeholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UZ_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage>
                      {fieldState.error &&
                        t(fieldState.error.message as string)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Student count */}
              <FormField
                control={form.control}
                name="student_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700 dark:text-white/70">
                      {t('demo_form.student_count_label')}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      onOpenChange={(open) => (open ? onFocus() : onBlur())}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-slate-200 bg-slate-50 transition-all duration-200 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                          <SelectValue
                            placeholder={t(
                              'demo_form.student_count_placeholder',
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STUDENT_BUCKETS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Center name */}
              <FormField
                control={form.control}
                name="center_name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="text-sm font-medium text-slate-700 dark:text-white/70">
                      {t('demo_form.center_name_label')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('demo_form.center_name_placeholder')}
                        onFocus={onFocus}
                        onBlur={() => {
                          field.onBlur();
                          onBlur();
                        }}
                        className="h-11 border-slate-200 bg-slate-50 transition-all duration-200 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25 focus:scale-[1.005] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Note */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="text-sm font-medium text-slate-700 dark:text-white/70">
                      {t('demo_form.note_label')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder={t('demo_form.note_placeholder')}
                        onFocus={onFocus}
                        onBlur={() => {
                          field.onBlur();
                          onBlur();
                        }}
                        className="resize-none border-slate-200 bg-slate-50 transition-all duration-200 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/30"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={mutation.isPending}
              className="active:scale-[0.96] mt-6 h-12 w-full gap-2 bg-cyan-400 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.30)] disabled:opacity-60"
            >
              {mutation.isPending
                ? t('demo_form.submitting')
                : t('demo_form.submit')}
            </Button>

            <p className="mt-3 text-center text-xs text-slate-400 dark:text-white/30">
              {t('demo_form.disclaimer')}
            </p>
          </form>
        </Form>
      </div>

      {/* ── Success state (hidden until submitted) ─────────────────── */}
      <div
        ref={successRef}
        className="absolute inset-0 hidden flex-col items-center justify-center p-8 text-center"
      >
        <CheckmarkSvg drawRef={ringRef} />
        <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
          {t('demo_form.success_title')}
        </h3>
        <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-white/50">
          {t('demo_form.success_body')}
        </p>
      </div>
    </div>
  );
};
