export const ensureI18n = () => import('./index').then((mod) => mod.initI18n());
