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
export function fiscalQr(values: string[]) {
  for (const value of values) {
    try {
      const url = new URL(value);
      if (
        url.protocol === 'https:' &&
        ['ofd.soliq.uz', 'new-ofd.soliq.uz'].includes(url.hostname) &&
        ['/check', '/epi', '/epi/avans', '/epi/kredit'].includes(
          url.pathname,
        ) &&
        ['t', 'r', 'c'].every((k) => url.searchParams.has(k)) &&
        (url.searchParams.has('s') || url.searchParams.has('h'))
      )
        return url.href;
    } catch {
      /* skip non URL codes */
    }
  }
  return null;
}
export async function decodeReceipt(file: File): Promise<string | null> {
  if (file.size > 8 * 1024 * 1024) return null;
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
