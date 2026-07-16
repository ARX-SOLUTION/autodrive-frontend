import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { track } from '@/lib/umami';

// ponytail: no new backend — dev gets console, umami gets the event (already
// a safe no-op if the script hasn't loaded), that's the whole harness.
const report = (metric: Metric): void => {
  if (import.meta.env.DEV) {
    console.log(`[web-vitals] ${metric.name}`, metric.value.toFixed(2), metric);
  }
  track(`web_vitals_${metric.name.toLowerCase()}`, {
    value: Math.round(metric.value),
    rating: metric.rating,
  });
};

export const initWebVitals = (): void => {
  onLCP(report);
  onINP(report);
  onCLS(report);
};
