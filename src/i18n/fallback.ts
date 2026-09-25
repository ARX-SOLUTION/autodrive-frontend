type Translator = (key: string, fallback: string) => string;

let translator: Translator | undefined;

export const registerTranslator = (next: Translator) => {
  translator = next;
};

export const translateOrFallback = (key: string, fallback: string) => {
  if (!translator) return fallback;
  const translated = translator(key, fallback);
  return translated.trim() ? translated : fallback;
};
