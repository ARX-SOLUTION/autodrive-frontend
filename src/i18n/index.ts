import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './locales/uz.json';

export const SUPPORTED_LANGS = ['uz', 'ru', 'en'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

type TranslationResource = Record<string, unknown>;

const translationLoaders: Record<AppLang, () => Promise<TranslationResource>> =
  {
    uz: async () => uz,
    ru: async () => (await import('./locales/ru.json')).default,
    en: async () => (await import('./locales/en.json')).default,
  };

const normalizeLanguage = (value: string | null): AppLang => {
  const language = value?.slice(0, 2) as AppLang | undefined;
  return language && SUPPORTED_LANGS.includes(language) ? language : 'uz';
};

const loadLanguageResource = async (language: AppLang) => {
  if (i18n.hasResourceBundle(language, 'translation')) return;

  const translation = await translationLoaders[language]();
  i18n.addResourceBundle(language, 'translation', translation, true, true);
};

let initialization: Promise<void> | undefined;

export const initI18n = () => {
  initialization ??= (async () => {
    const storedLanguage =
      typeof window === 'undefined'
        ? null
        : window.localStorage.getItem('lang');
    let language = normalizeLanguage(storedLanguage);
    const resources: Record<string, { translation: TranslationResource }> = {
      uz: { translation: uz },
    };

    if (language !== 'uz') {
      try {
        resources[language] = {
          translation: await translationLoaders[language](),
        };
      } catch {
        language = 'uz';
      }
    }

    await i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'uz',
      supportedLngs: [...SUPPORTED_LANGS],
      interpolation: { escapeValue: false },
    });

    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  })();

  return initialization;
};

export const changeAppLanguage = async (language: AppLang) => {
  await loadLanguageResource(language);
  await i18n.changeLanguage(language);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('lang', language);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
};

export default i18n;
