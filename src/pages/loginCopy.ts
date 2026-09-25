// Login paints before i18next loads. These strings are the critical-path
// subset of the locale catalogs; loginCopy.test.ts keeps them in sync.
const LOGIN_LANGS = ['uz', 'ru', 'en'] as const;
export type LoginLang = (typeof LOGIN_LANGS)[number];

export type LoginCopy = {
  appTitle: string;
  themeDark: string;
  themeLight: string;
  required: string;
  showPassword: string;
  hidePassword: string;
  workspaceLabel: string;
  workspaceTitle: string;
  workspaceDescription: string;
  formDescription: string;
  title: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  error: string;
  rateLimit: string;
  networkError: string;
  companyInactive: string;
  demo: string;
  demoHint: string;
  demoSignIn: string;
  demoSignInHint: string;
  demoRetry: string;
  demoAutoError: string;
};

const copy: Record<LoginLang, LoginCopy> = {
  uz: {
    appTitle: 'Auto Maktab',
    themeDark: 'Tungi rejim',
    themeLight: "Yorug' rejim",
    required: 'Majburiy',
    showPassword: "Parolni ko'rsatish",
    hidePassword: 'Parolni yashirish',
    workspaceLabel: 'Avtomaktab boshqaruv tizimi',
    workspaceTitle: 'Avtomaktabingiz. Bitta tizimda.',
    workspaceDescription:
      'O‘quvchilar, dars jadvali va to‘lovlar. Kundalik ishlaringizni bir joydan boshqaring.',
    formDescription: 'Davom etish uchun hisobingizga kiring.',
    title: 'Tizimga kirish',
    emailLabel: 'Email',
    emailPlaceholder: 'Email manzilingiz',
    passwordLabel: 'Parol',
    passwordPlaceholder: 'Parolingiz',
    submit: 'Kirish',
    submitting: 'Kirilmoqda...',
    success: 'Tizimga muvaffaqiyatli kirdingiz!',
    error: "Email yoki parol noto'g'ri",
    rateLimit: "Ko'p urinishlar. Iltimos 1 daqiqa kuting.",
    networkError: "Server bilan ulanish yo'q.",
    companyInactive:
      "Kompaniyangiz hali faollashtirilmagan. Administrator bilan bog'laning.",
    demo: "Demo emailni to'ldirish",
    demoHint: "Demo parolini kiriting, so'ng tizimga kiring",
    demoSignIn: 'Demo sifatida kirish',
    demoSignInHint: "Namunaviy ma'lumotlar bilan demo markaz ochiladi",
    demoRetry: 'Demo kirishni qayta urinish',
    demoAutoError:
      "Demo avtomatik ochilmadi. Pastdagi tugma bilan qayta urinib ko'ring.",
  },
  ru: {
    appTitle: 'Auto Maktab',
    themeDark: 'Тёмная тема',
    themeLight: 'Светлая тема',
    required: 'Обязательно',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    workspaceLabel: 'Система управления автошколой',
    workspaceTitle: 'Ваша автошкола. Одна система.',
    workspaceDescription:
      'Ученики, расписание и платежи. Управляйте ежедневной работой в одном месте.',
    formDescription: 'Войдите в свой аккаунт, чтобы продолжить.',
    title: 'Вход в систему',
    emailLabel: 'Email',
    emailPlaceholder: 'Ваш email',
    passwordLabel: 'Пароль',
    passwordPlaceholder: 'Ваш пароль',
    submit: 'Войти',
    submitting: 'Вход...',
    success: 'Вы успешно вошли!',
    error: 'Неверный email или пароль',
    rateLimit: 'Слишком много попыток. Подождите 1 минуту.',
    networkError: 'Не удалось подключиться к серверу.',
    companyInactive:
      'Ваша компания ещё не активирована. Свяжитесь с администратором.',
    demo: 'Подставить демо-email',
    demoHint: 'Введите демо-пароль, затем войдите',
    demoSignIn: 'Войти как демо',
    demoSignInHint: 'Открывает демо-центр с примерными данными',
    demoRetry: 'Повторить демо-вход',
    demoAutoError:
      'Демо не открылось автоматически. Повторите попытку кнопкой ниже.',
  },
  en: {
    appTitle: 'Auto Maktab',
    themeDark: 'Dark mode',
    themeLight: 'Light mode',
    required: 'Required',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    workspaceLabel: 'Driving school management',
    workspaceTitle: 'Your driving school. One workspace.',
    workspaceDescription:
      'Students, schedules and payments. Manage your day-to-day work in one place.',
    formDescription: 'Sign in to your account to continue.',
    title: 'Sign in',
    emailLabel: 'Email',
    emailPlaceholder: 'Your email address',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Your password',
    submit: 'Sign in',
    submitting: 'Signing in...',
    success: 'Successfully signed in!',
    error: 'Invalid email or password',
    rateLimit: 'Too many attempts. Please wait 1 minute.',
    networkError: 'Unable to connect to the server.',
    companyInactive:
      'Your company is not activated yet. Contact your administrator.',
    demo: 'Fill demo email',
    demoHint: 'Enter the demo password, then sign in',
    demoSignIn: 'Sign in as demo',
    demoSignInHint: 'Opens the demo center with sample data',
    demoRetry: 'Retry demo sign-in',
    demoAutoError:
      'The demo did not open automatically. Retry with the button below.',
  },
};

export const readLoginLang = (): LoginLang => {
  try {
    const language = window.localStorage.getItem('lang')?.slice(0, 2);
    if (language && (LOGIN_LANGS as readonly string[]).includes(language)) {
      return language as LoginLang;
    }
  } catch {
    // localStorage can throw in private browsing; Uzbek is the product default.
  }
  return 'uz';
};

export const getLoginCopy = (lang: LoginLang = readLoginLang()) => copy[lang];
