import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EVENTS, Joyride, STATUS } from 'react-joyride';
import type { EventHandler, Step, TooltipRenderProps } from 'react-joyride';
import {
  crmTourTargetSelector,
  normalizeTourPath,
  OWNER_CRM_TOUR_STEPS,
  type OwnerCrmTourStepId,
} from '@/lib/ownerCrmTour';
import { persistCrmTourCompletion } from './persistCrmTourCompletion';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const waitFor = async (ready: () => boolean) => {
  const started = Date.now();
  while (Date.now() - started < 6000) {
    if (ready()) return;
    await sleep(40);
  }
};

const isTourTargetVisible = (selector: string) => {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) return false;
  let node: HTMLElement | null = element;
  while (node && node !== document.body) {
    const { display, visibility } = getComputedStyle(node);
    if (display === 'none' || visibility === 'hidden') return false;
    node = node.parentElement;
  }
  return element.getClientRects().length > 0;
};

const popoverFill = () => {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--popover')
    .trim();
  return raw ? `hsl(${raw})` : 'hsl(45 45% 99%)';
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover';

const CrmTourTooltip = ({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) => {
  const { t } = useTranslation();
  const id = (step.data as { id?: OwnerCrmTourStepId } | undefined)?.id;
  const titleKey = id ? `crm_tour.${id}_title` : 'crm_tour.sidebar_title';
  const bodyKey = id ? `crm_tour.${id}_body` : 'crm_tour.sidebar_body';

  return (
    <div
      {...tooltipProps}
      className="w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-warm"
    >
      <h2 className="font-heading text-base font-bold tracking-tight text-balance">
        {t(titleKey)}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-pretty">{t(bodyKey)}</p>
      <p className="mt-3 text-xs tabular-nums text-muted-foreground">
        {t('crm_tour.progress', { current: index + 1, total: size })}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          {...skipProps}
          className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground ${focusRing}`}
        >
          {t('crm_tour.skip')}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {index > 0 ? (
            <button
              type="button"
              {...backProps}
              className={`inline-flex min-h-11 items-center rounded-md border border-border bg-popover px-3 text-sm font-medium text-foreground ${focusRing}`}
            >
              {t('crm_tour.back')}
            </button>
          ) : null}
          <button
            type="button"
            {...primaryProps}
            className={`inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground ${focusRing}`}
          >
            {t(isLastStep ? 'crm_tour.done' : 'crm_tour.next')}
          </button>
        </div>
      </div>
    </div>
  );
};

interface OwnerCrmTourProps {
  onFinished: () => void;
  prepareChrome: (stepId: OwnerCrmTourStepId) => void;
  releaseChrome: () => void;
}

const OwnerCrmTour = ({
  onFinished,
  prepareChrome,
  releaseChrome,
}: OwnerCrmTourProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [run, setRun] = useState(true);
  const [arrowColor, setArrowColor] = useState(popoverFill);
  const pathnameRef = useRef(pathname);
  const navigateRef = useRef(navigate);
  const prepareRef = useRef(prepareChrome);
  const releaseRef = useRef(releaseChrome);
  const onFinishedRef = useRef(onFinished);
  const finishedRef = useRef(false);
  const sawTooltipRef = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
    navigateRef.current = navigate;
    prepareRef.current = prepareChrome;
    releaseRef.current = releaseChrome;
    onFinishedRef.current = onFinished;
  }, [navigate, onFinished, pathname, prepareChrome, releaseChrome]);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setArrowColor(popoverFill());
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const finish = useCallback((persist: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setRun(false);
    releaseRef.current();
    if (persist) void persistCrmTourCompletion();
    onFinishedRef.current();
  }, []);

  useEffect(() => {
    if (!run) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      finish(true);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [finish, run]);

  const steps = useMemo<Step[]>(
    () =>
      OWNER_CRM_TOUR_STEPS.map((step) => ({
        id: step.id,
        target:
          step.id === 'sidebar'
            ? () =>
                document.querySelector(
                  crmTourTargetSelector('sidebar'),
                ) as HTMLElement | null
            : crmTourTargetSelector(step.id),
        content: step.id,
        title: step.id,
        data: { id: step.id },
        placement: 'auto',
        skipBeacon: true,
        before: async () => {
          if (normalizeTourPath(pathnameRef.current) !== step.route) {
            await navigateRef.current({ to: step.route });
          }
          await waitFor(
            () => normalizeTourPath(pathnameRef.current) === step.route,
          );
          prepareRef.current(step.id);
          await waitFor(() =>
            isTourTargetVisible(crmTourTargetSelector(step.id)),
          );
          await nextFrame();
        },
      })),
    [],
  );

  const onEvent: EventHandler = (data) => {
    if (data.type === EVENTS.TOOLTIP) {
      sawTooltipRef.current = true;
      return;
    }
    if (data.type !== EVENTS.TOUR_END) return;
    if (
      data.status === STATUS.SKIPPED ||
      (data.status === STATUS.FINISHED && sawTooltipRef.current)
    ) {
      finish(true);
      return;
    }
    if (data.status === STATUS.FINISHED) finish(false);
  };

  return (
    <Joyride
      continuous
      run={run}
      scrollToFirstStep
      steps={steps}
      tooltipComponent={CrmTourTooltip}
      onEvent={onEvent}
      locale={{
        back: t('crm_tour.back'),
        close: t('crm_tour.skip'),
        last: t('crm_tour.done'),
        next: t('crm_tour.next'),
        skip: t('crm_tour.skip'),
      }}
      options={{
        arrowColor,
        backgroundColor: arrowColor,
        beforeTimeout: 16000,
        blockTargetInteraction: true,
        buttons: ['skip', 'back', 'primary'],
        dismissKeyAction: false,
        overlayClickAction: false,
        overlayColor: 'hsl(192 43% 13% / 0.55)',
        primaryColor: 'hsl(39 76% 53%)',
        scrollDuration: 200,
        scrollOffset: 96,
        skipBeacon: true,
        spotlightPadding: 6,
        spotlightRadius: 8,
        targetWaitTimeout: 2000,
        zIndex: 100,
      }}
    />
  );
};

export default OwnerCrmTour;
