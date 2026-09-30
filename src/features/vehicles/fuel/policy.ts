import { z } from 'zod';
export const fuelTypes = ['petrol', 'methane', 'propane'] as const;
const decimal = z
  .string()
  .regex(/^\d{1,9}(\.\d{1,3})?$/)
  .refine((v) => Number(v) > 0);
export const fuelLineSchema = z.object({
  fuel_type: z.enum(fuelTypes),
  unit: z.enum(['litre', 'm3']),
  quantity: decimal,
  unit_price: z
    .string()
    .regex(/^\d{1,9}(\.\d{1,2})?$/)
    .refine((v) => Number(v) > 0),
  line_total: z
    .string()
    .regex(/^\d{1,10}(\.\d{1,2})?$/)
    .refine((v) => Number(v) > 0),
  name: z.string().max(200).optional(),
  mxik: z.string().max(30).optional(),
});
export const fuelSchema = z.object({
  vehicle_id: z.string().min(1),
  station_id: z.string().min(1),
  occurred_at: z.string().min(1),
  odometer_km: z
    .string()
    .regex(/^\d+$/)
    .refine((v) => Number.isSafeInteger(Number(v))),
  funding_source: z.enum([
    'partner_credit',
    'school_card',
    'advance',
    'personal',
  ]),
  qr_url: z.string(),
  lines: z.array(fuelLineSchema).min(1).max(20),
});
export type FuelForm = z.infer<typeof fuelSchema>;
export const canReviewFuel = (role?: string) =>
  ['owner', 'manager', 'accountant'].includes(role ?? '');

export interface ClassifiedFuel {
  fuel_type: (typeof fuelTypes)[number];
  unit: 'litre' | 'm3';
  is_fuel: boolean;
}

export const MAX_RECEIPT_SIZE_BYTES = 8 * 1024 * 1024;

export function classifyFuelLine(name = '', mxik = ''): ClassifiedFuel {
  const cleanName = name.toLowerCase();
  const cleanMxik = mxik.trim();

  if (
    cleanName.includes('metan') ||
    cleanName.includes('methane') ||
    cleanName.includes('cng') ||
    cleanMxik.startsWith('02711002')
  ) {
    return { fuel_type: 'methane', unit: 'm3', is_fuel: true };
  }

  if (
    cleanName.includes('propan') ||
    cleanName.includes('propane') ||
    cleanName.includes('lpg') ||
    cleanMxik.startsWith('02711001')
  ) {
    return { fuel_type: 'propane', unit: 'litre', is_fuel: true };
  }

  const petrolPatterns = [
    'аи-',
    'аи ',
    'ai-',
    'ai ',
    'бензин',
    'benzin',
    'taheko',
    'танеко',
    'evro',
    'евро',
    '92',
    '95',
    '98',
    '80',
    '100',
    'dizel',
    'дизел',
    'diesel',
    'топливо',
  ];

  const isPetrolName = petrolPatterns.some((pattern) =>
    cleanName.includes(pattern),
  );
  const isPetrolMxik = cleanMxik.startsWith('02710');

  if (isPetrolName || isPetrolMxik) {
    return { fuel_type: 'petrol', unit: 'litre', is_fuel: true };
  }

  const nonFuelKeywords = [
    'suv',
    'kofe',
    'choy',
    'shokolad',
    'yuvish',
    'xizmat',
    'water',
    'coffee',
    'snack',
  ];
  const isNonFuel = nonFuelKeywords.some((w) => cleanName.includes(w));

  return {
    fuel_type: 'petrol',
    unit: 'litre',
    is_fuel: !isNonFuel,
  };
}

export function detectFundingSource(
  paymentInfo?: string,
): 'school_card' | 'partner_credit' | 'advance' | 'personal' {
  if (!paymentInfo) return 'school_card';
  const text = paymentInfo.toLowerCase();
  if (
    text.includes('korporativ') ||
    text.includes('korp') ||
    text.includes('uzcard') ||
    text.includes('humo') ||
    text.includes('karta') ||
    text.includes('pl.karta') ||
    text.includes('bank kartasi')
  ) {
    return 'school_card';
  }
  if (
    text.includes('nasiya') ||
    text.includes('qarz') ||
    text.includes('credit')
  ) {
    return 'partner_credit';
  }
  if (text.includes('avans') || text.includes('advance')) {
    return 'advance';
  }
  if (
    text.includes('naqd') ||
    text.includes('cash') ||
    text.includes('shaxsiy')
  ) {
    return 'personal';
  }
  return 'school_card';
}
export function fiscalQr(values: string[]) {
  for (const value of values) {
    try {
      const url = new URL(value);
      const pathIsSupported = [
        '/check',
        '/epi',
        '/epi/avans',
        '/epi/kredit',
      ].includes(url.pathname);
      const oneValue = (key: string, pattern: RegExp) => {
        const values = url.searchParams.getAll(key);
        return values.length === 1 && pattern.test(values[0]);
      };
      const hasFiscalSign = url.searchParams.has('s');
      const hasFiscalHash = url.searchParams.has('h');
      if (
        value.length <= 2048 &&
        url.protocol === 'https:' &&
        url.hostname === 'ofd.soliq.uz' &&
        !url.port &&
        !url.username &&
        !url.password &&
        !url.hash &&
        pathIsSupported &&
        oneValue('t', /^[A-Z0-9]{1,32}$/) &&
        oneValue('r', /^\d{1,20}$/) &&
        oneValue('c', /^\d{14}$/) &&
        hasFiscalSign !== hasFiscalHash &&
        (hasFiscalSign
          ? oneValue('s', /^\d{12}$/)
          : oneValue('h', /^[A-Za-z0-9_+/=-]{1,256}$/))
      ) {
        const date = url.searchParams.get('c') ?? '';
        const localDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(8, 10)}:${date.slice(10, 12)}:${date.slice(12, 14)}`;
        const calendar = new Date(`${localDate}Z`);
        if (
          Number.isNaN(calendar.getTime()) ||
          calendar.toISOString().slice(0, 19) !== localDate
        ) {
          continue;
        }
        return url.href;
      }
    } catch {
      /* skip non URL codes */
    }
  }
  return null;
}
export async function decodeReceipt(file: File): Promise<string | null> {
  if (file.size > MAX_RECEIPT_SIZE_BYTES) return null;
  const Detector = (
    globalThis as unknown as {
      BarcodeDetector?: new (options: { formats: string[] }) => {
        detect: (image: ImageBitmap) => Promise<{ rawValue: string }[]>;
      };
    }
  ).BarcodeDetector;
  const bitmap = await createImageBitmap(file);
  try {
    if (Detector) {
      try {
        const result = fiscalQr(
          (await new Detector({ formats: ['qr_code'] }).detect(bitmap)).map(
            (v) => v.rawValue,
          ),
        );
        if (result) return result;
      } catch {
        /* use image decoder when native format is unavailable */
      }
    }
    const { default: jsQR } = await import('jsqr');
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (let attempt = 0; attempt < 5; attempt++) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(pixels.data, pixels.width, pixels.height);
      if (!code) return null;
      const result = fiscalQr([code.data]);
      if (result) return result;
      const corners = [
        code.location.topLeftCorner,
        code.location.topRightCorner,
        code.location.bottomLeftCorner,
        code.location.bottomRightCorner,
      ];
      const left = Math.min(...corners.map((p) => p.x)) - 8,
        top = Math.min(...corners.map((p) => p.y)) - 8;
      context.fillStyle = '#fff';
      context.fillRect(
        left,
        top,
        Math.max(...corners.map((p) => p.x)) - left + 8,
        Math.max(...corners.map((p) => p.y)) - top + 8,
      );
    }
    return null;
  } finally {
    bitmap.close();
  }
}

export function extractFiscalQrDate(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    const c = url.searchParams.get('c');
    if (!c || c.length !== 14 || !/^\d{14}$/.test(c)) return null;
    const year = c.slice(0, 4);
    const month = c.slice(4, 6);
    const day = c.slice(6, 8);
    const hour = c.slice(8, 10);
    const minute = c.slice(10, 12);
    return `${year}-${month}-${day}T${hour}:${minute}`;
  } catch {
    return null;
  }
}
