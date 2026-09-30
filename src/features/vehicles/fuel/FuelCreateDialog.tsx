import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  CheckCircle,
  Warning,
  GasPump,
  Car,
  Speedometer,
  ArrowClockwise,
  Check,
  Receipt,
  Plus,
  Trash,
  ArrowLeft,
  ArrowRight,
  FloppyDisk,
  Paperclip,
  CalendarBlank,
  CreditCard,
  CheckFat,
} from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { extractErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/authStore';
import {
  decodeReceipt,
  classifyFuelLine,
  detectFundingSource,
  extractFiscalQrDate,
  fiscalQr,
  fuelTypes,
  MAX_RECEIPT_SIZE_BYTES,
  type FuelForm,
} from './policy';
import {
  useFuelVehicles,
  useStations,
  useVehicleLastFuel,
  lookupReceipt,
  submitFuelComplete,
  saveFuel,
  type Lookup,
  type SubmitFuelProgress,
} from './service';

const localDate = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const blankLine = (
  defaultType: FuelForm['lines'][number]['fuel_type'] = 'petrol',
): FuelForm['lines'][number] => ({
  fuel_type: defaultType,
  unit: defaultType === 'methane' ? 'm3' : 'litre',
  quantity: '',
  unit_price: '',
  line_total: '',
});

interface FuelCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
  initialVehicleId?: string;
}

export type FuelFlowStep = 1 | 2 | 3 | 4 | 5;

export default function FuelCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  initialVehicleId,
}: FuelCreateDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // 5-Step Clean UX Flow:
  // 1: Moshina tanlash (Vehicle Selection)
  // 2: Chek yuklash (Receipt upload & Soliq scan)
  // 3: Chek ma'lumotlarini ko'rish (Receipt details & lines)
  // 4: Odometr (Odometer reading & attachment)
  // 5: Tasdiqlash full (Full review & confirmation)
  const [step, setStep] = useState<FuelFlowStep>(1);

  // Step 1: Vehicle
  const [vehicleId, setVehicleId] = useState(initialVehicleId ?? '');

  // Step 2: Receipt upload & lookup
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [manualQr, setManualQr] = useState('');
  const [showManualQrInput, setShowManualQrInput] = useState(false);
  const [qrStatus, setQrStatus] = useState<
    | 'idle'
    | 'decoding'
    | 'fetching'
    | 'success'
    | 'decode-failed'
    | 'lookup-failed'
    | 'too-large'
  >('idle');
  const [lookupData, setLookupData] = useState<Lookup | null>(null);
  const [qrErrorDetail, setQrErrorDetail] = useState<string | null>(null);

  // Step 3: Receipt details & lines
  const [stationId, setStationId] = useState('');
  const [fundingSource, setFundingSource] =
    useState<FuelForm['funding_source']>('school_card');
  const [occurredAt, setOccurredAt] = useState(() =>
    localDate(new Date().toISOString()),
  );
  const [lines, setLines] = useState<FuelForm['lines']>([blankLine()]);

  // Step 4: Odometer
  const [odometerKm, setOdometerKm] = useState('');
  const [odometerFile, setOdometerFile] = useState<File | null>(null);
  const [odometerPreview, setOdometerPreview] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] =
    useState<SubmitFuelProgress | null>(null);

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const odometerInputRef = useRef<HTMLInputElement>(null);
  const qrOperationRef = useRef(0);

  const vehiclesQuery = useFuelVehicles({ limit: 100 });
  const stationsQuery = useStations({ limit: 100, active: true });

  // Derived, not stored in an effect: writing vehicleId from an effect made
  // every mount a setState-in-effect (react-doctor). Step 1 commits the value
  // on Next via handleNext.
  const teacherVehicleId =
    currentUser?.role === 'teacher'
      ? vehiclesQuery.data?.data?.find(
          (v) => v.current_custodian_id === currentUser.id,
        )?.id
      : undefined;

  const selectedVehicleId =
    vehicleId ||
    initialVehicleId ||
    teacherVehicleId ||
    (vehiclesQuery.data?.data?.length === 1
      ? vehiclesQuery.data.data[0].id
      : '');

  const lastFuelQuery = useVehicleLastFuel(selectedVehicleId || undefined);

  const selectedVehicle = useMemo(() => {
    return vehiclesQuery.data?.data.find((v) => v.id === selectedVehicleId);
  }, [vehiclesQuery.data?.data, selectedVehicleId]);

  const selectedStation = useMemo(() => {
    return stationsQuery.data?.data.find((s) => s.id === stationId);
  }, [stationsQuery.data?.data, stationId]);

  // Allowed fuel types for this vehicle
  const allowedFuelTypes = useMemo<
    FuelForm['lines'][number]['fuel_type'][]
  >(() => {
    const vehicleTypes = selectedVehicle?.fuel_types?.filter(
      (t): t is FuelForm['lines'][number]['fuel_type'] =>
        fuelTypes.includes(t as (typeof fuelTypes)[number]),
    );
    return vehicleTypes?.length ? vehicleTypes : [...fuelTypes];
  }, [selectedVehicle]);

  useEffect(() => {
    return () => {
      if (receiptPreview) {
        try {
          URL.revokeObjectURL(receiptPreview);
        } catch {
          // ignore
        }
      }
      if (odometerPreview) {
        try {
          URL.revokeObjectURL(odometerPreview);
        } catch {
          // ignore
        }
      }
    };
  }, [receiptPreview, odometerPreview]);

  const handleReceiptFile = async (file: File) => {
    const operation = ++qrOperationRef.current;
    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      setReceiptFile(null);
      setReceiptPreview(null);
      setQrUrl('');
      setLookupData(null);
      setQrErrorDetail(null);
      setQrStatus('too-large');
      return;
    }

    setReceiptFile(file);
    if (receiptPreview) {
      try {
        URL.revokeObjectURL(receiptPreview);
      } catch {
        // ignore
      }
    }
    try {
      setReceiptPreview(URL.createObjectURL(file));
    } catch {
      // ignore
    }

    setQrStatus('decoding');
    setQrUrl('');
    setLookupData(null);
    setQrErrorDetail(null);

    try {
      const code = await decodeReceipt(file);
      if (operation !== qrOperationRef.current) return;
      if (code) {
        setQrUrl(code);
        const parsedDate = extractFiscalQrDate(code);
        if (parsedDate) setOccurredAt(parsedDate);
        await performLookup(code, operation);
      } else {
        setQrStatus('decode-failed');
      }
    } catch {
      if (operation === qrOperationRef.current) setQrStatus('decode-failed');
    }
  };

  const performLookup = async (
    url: string,
    operation = qrOperationRef.current,
  ) => {
    const canonicalUrl = fiscalQr([url]);
    if (!canonicalUrl) {
      if (operation === qrOperationRef.current) {
        setQrErrorDetail(null);
        setQrStatus('lookup-failed');
      }
      return;
    }

    try {
      setQrStatus('fetching');
      setQrErrorDetail(null);
      const result = await lookupReceipt(canonicalUrl);
      if (operation !== qrOperationRef.current) return;
      setQrUrl(canonicalUrl);
      setLookupData(result);

      const parsedDate = extractFiscalQrDate(canonicalUrl);
      if (parsedDate) setOccurredAt(parsedDate);

      if (result.seller_tin && stationsQuery.data?.data) {
        const matched = stationsQuery.data.data.find(
          (s) => s.stir && s.stir.trim() === String(result.seller_tin).trim(),
        );
        if (matched) {
          setStationId(matched.id);
        }
      }

      if (result.lines && result.lines.length > 0) {
        const classifiedLines: FuelForm['lines'] = result.lines.map((l) => {
          const classified = classifyFuelLine(l.name, l.mxik);
          return {
            fuel_type: classified.fuel_type,
            unit: classified.unit,
            quantity: String(l.quantity),
            unit_price: String(l.unit_price),
            line_total: String(l.line_total),
            name: l.name,
            mxik: l.mxik,
          };
        });

        if (classifiedLines.length > 0) {
          setLines(classifiedLines);
        }
      }

      if (result.seller_name) {
        const detected = detectFundingSource(result.seller_name);
        setFundingSource(detected);
      }

      setQrStatus('success');
    } catch (err) {
      if (operation !== qrOperationRef.current) return;
      const status = (err as AxiosError)?.response?.status;
      setQrErrorDetail(
        status === 429
          ? t('fuel.qr_rate_limited')
          : extractErrorMessage(err, t('fuel.qr_lookup_error')),
      );
      setQrStatus('lookup-failed');
    }
  };

  const handleOdometerFile = (file: File) => {
    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      toast.error(t('fuel.qr_too_large'));
      return;
    }
    setOdometerFile(file);
    if (odometerPreview) {
      try {
        URL.revokeObjectURL(odometerPreview);
      } catch {
        // ignore
      }
    }
    try {
      setOdometerPreview(URL.createObjectURL(file));
    } catch {
      // ignore
    }
  };

  const handleLineChange = (
    index: number,
    field: keyof FuelForm['lines'][number],
    value: string,
  ) => {
    setLines((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (field === 'fuel_type') {
        item.unit = value === 'methane' ? 'm3' : 'litre';
      }

      if (field === 'quantity' || field === 'unit_price') {
        const q = parseFloat(field === 'quantity' ? value : item.quantity);
        const p = parseFloat(field === 'unit_price' ? value : item.unit_price);
        if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
          const rawTotal = q * p;
          item.line_total = Number.isInteger(rawTotal)
            ? String(rawTotal)
            : rawTotal.toFixed(2);
        }
      }

      next[index] = item;
      return next;
    });
  };

  const addLine = () => {
    const defaultType = allowedFuelTypes[0] || 'petrol';
    setLines((prev) => [...prev, blankLine(defaultType)]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalCalculatedAmount = useMemo(() => {
    return lines.reduce((acc, l) => {
      const val = parseFloat(l.line_total);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [lines]);

  const canContinue = () => {
    switch (step) {
      case 1:
        return Boolean(selectedVehicleId);
      case 2:
        return Boolean(receiptFile || lookupData || qrUrl);
      case 3:
        return Boolean(
          stationId &&
          lines.length > 0 &&
          lines.every(
            (l) =>
              parseFloat(l.quantity) > 0 &&
              parseFloat(l.unit_price) > 0 &&
              parseFloat(l.line_total) > 0,
          ),
        );
      case 4:
        return Boolean(
          odometerKm &&
          !isNaN(parseFloat(odometerKm)) &&
          parseFloat(odometerKm) > 0,
        );
      case 5:
        return !isSubmitting;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedVehicleId) {
        toast.error(t('fuel.vehicle_required'));
        return;
      }
      if (!vehicleId && selectedVehicleId) {
        setVehicleId(selectedVehicleId);
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!receiptFile && !lookupData && !qrUrl) {
        toast.error(t('fuel.receipt_required'));
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!stationId) {
        toast.error(t('fuel.station_required'));
        return;
      }
      if (
        lines.length === 0 ||
        lines.some((l) => !parseFloat(l.quantity) || !parseFloat(l.unit_price))
      ) {
        toast.error(t('fuel.line_required'));
        return;
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      const parsedOdo = parseFloat(odometerKm);
      if (isNaN(parsedOdo) || parsedOdo <= 0) {
        toast.error(t('fuel.odometer_required'));
        return;
      }
      if (
        lastFuelQuery.data?.odometer_km &&
        parsedOdo < lastFuelQuery.data.odometer_km
      ) {
        toast.error(
          `${t('fuel.odometer_too_low')} (min: ${lastFuelQuery.data.odometer_km})`,
        );
        return;
      }
      setStep(5);
      return;
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as FuelFlowStep);
    }
  };

  const closeAfterSave = () => {
    resetFlow();
    onOpenChange(false);
  };

  const handleSaveDraft = async () => {
    if (!selectedVehicleId || !stationId || lines.length === 0 || isSubmitting)
      return;

    setIsSubmitting(true);
    const requestId = crypto.randomUUID();

    const values: FuelForm = {
      vehicle_id: selectedVehicleId,
      station_id: stationId,
      occurred_at: occurredAt,
      odometer_km: odometerKm || '0',
      funding_source: fundingSource,
      qr_url: qrUrl,
      lines,
    };

    try {
      const saved = await saveFuel(values, requestId);
      await qc.invalidateQueries({ queryKey: ['vehicle-fuel'] });
      toast.success(t('common.saved'));
      closeAfterSave();
      if (onSuccess) onSuccess(saved.id);
      else
        await navigate({ to: '/vehicle-fuel/$id', params: { id: saved.id } });
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e, t('fuel.invalid')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitComplete = async () => {
    if (
      !selectedVehicleId ||
      !stationId ||
      !odometerKm ||
      lines.length === 0 ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    const requestId = crypto.randomUUID();

    const values: FuelForm = {
      vehicle_id: selectedVehicleId,
      station_id: stationId,
      occurred_at: occurredAt,
      odometer_km: odometerKm,
      funding_source: fundingSource,
      qr_url: qrUrl,
      lines,
    };

    try {
      const result = await submitFuelComplete({
        values,
        receiptFile,
        odometerFile,
        requestId,
        onProgress: (p) => setSubmitProgress(p),
      });

      await qc.invalidateQueries({ queryKey: ['vehicle-fuel'] });
      toast.success(t('fuel.submitted_success'));
      closeAfterSave();
      if (onSuccess) onSuccess(result.id);
      else
        await navigate({ to: '/vehicle-fuel/$id', params: { id: result.id } });
    } catch (e: unknown) {
      toast.error(extractErrorMessage(e, t('fuel.submit_error')));
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  };

  const resetFlow = () => {
    qrOperationRef.current += 1;
    setReceiptFile(null);
    setReceiptPreview(null);
    setOdometerFile(null);
    setOdometerPreview(null);
    setQrUrl('');
    setManualQr('');
    setShowManualQrInput(false);
    setQrStatus('idle');
    setLookupData(null);
    setQrErrorDetail(null);
    setVehicleId('');
    setStationId('');
    setOdometerKm('');
    setFundingSource('school_card');
    setOccurredAt(localDate(new Date().toISOString()));
    setLines([blankLine()]);
    setStep(1);
    setSubmitProgress(null);
    if (receiptInputRef.current) receiptInputRef.current.value = '';
    if (odometerInputRef.current) odometerInputRef.current.value = '';
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (isSubmitting) return;
      resetFlow();
    }
    onOpenChange(nextOpen);
  };

  const stepTitles: Record<FuelFlowStep, string> = {
    1: t('fuel.step_vehicle'),
    2: t('fuel.step_receipt_upload'),
    3: t('fuel.step_receipt_details'),
    4: t('fuel.step_odometer'),
    5: t('fuel.step_review'),
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
            <GasPump className="h-6 w-6 text-primary" weight="duotone" />
            {t('fuel.create')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {t('fuel.save_hint')}
          </DialogDescription>
        </DialogHeader>

        {/* 5-Step Clean Progress Indicator */}
        <div className="space-y-2 py-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">
              {t('fuel.step_progress', { current: step, total: 5 })}
            </span>
            <span className="font-semibold text-foreground">
              {stepTitles[step]}
            </span>
          </div>
          <div
            className="grid grid-cols-5 gap-1.5"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={5}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Moshina tanlash (Vehicle Selection) */}
        {step === 1 && (
          <section
            aria-label={t('fuel.step_vehicle')}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t('fuel.step_vehicle')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('fuel.select_vehicle_prompt')}
              </p>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="fuel-vehicle-select"
                className="block space-y-1.5"
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Car className="h-4 w-4 text-primary" />
                  {t('fuel.vehicle')} *
                </span>
                <select
                  id="fuel-vehicle-select"
                  aria-label={`${t('fuel.vehicle')} *`}
                  value={selectedVehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('fuel.choose')}</option>
                  {vehiclesQuery.data?.data.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} {v.model ? `(${v.model})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {selectedVehicle && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold tracking-wider text-foreground">
                      {selectedVehicle.plate_number}
                    </span>
                    <div className="flex gap-1.5">
                      {selectedVehicle.fuel_types?.map((ft) => (
                        <Badge
                          key={ft}
                          variant="secondary"
                          className="text-xs uppercase font-semibold"
                        >
                          {ft}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {lastFuelQuery.data?.odometer_km && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-primary/10">
                      <Speedometer className="h-3.5 w-3.5 text-primary" />
                      <span>{t('fuel.last_odometer')}:</span>
                      <span className="font-semibold text-foreground">
                        {lastFuelQuery.data.odometer_km.toLocaleString()} km
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* STEP 2: Chek yuklash (Receipt Upload - Clean UX, no image clutter) */}
        {step === 2 && (
          <section
            aria-label={t('fuel.step_receipt_upload')}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t('fuel.step_receipt_upload')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('fuel.receipt_upload_clean_hint')}
              </p>
            </div>

            <input
              ref={receiptInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              aria-label={t('fuel.scan_receipt_btn')}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleReceiptFile(f);
              }}
            />

            {/* Clean, distraction-free receipt action card */}
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center space-y-4 shadow-sm hover:border-primary/50 transition-colors">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Receipt className="h-7 w-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {receiptFile ? receiptFile.name : t('fuel.receipt')}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  {t('fuel.receipt_upload_hint')}
                </p>
              </div>

              <Button
                type="button"
                variant={receiptFile ? 'outline' : 'default'}
                size="lg"
                className="gap-2 px-6 h-11 text-sm font-medium w-full sm:w-auto"
                onClick={() => receiptInputRef.current?.click()}
              >
                <Camera className="h-5 w-5" />
                {receiptFile
                  ? t('fuel.change_photo')
                  : t('fuel.scan_receipt_btn')}
              </Button>
            </div>

            {/* Scanning / decoding feedback */}
            {qrStatus === 'decoding' && (
              <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground bg-muted/30 rounded-lg">
                <ArrowClockwise className="h-4 w-4 animate-spin text-primary" />
                <span>{t('fuel.scanning_qr')}</span>
              </div>
            )}

            {qrStatus === 'fetching' && (
              <div className="flex items-center justify-center gap-2 p-3 text-xs text-primary bg-primary/5 rounded-lg">
                <ArrowClockwise className="h-4 w-4 animate-spin" />
                <span>{t('fuel.fetching_soliq')}</span>
              </div>
            )}

            {/* Verified Soliq Card */}
            {lookupData && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                      weight="fill"
                    />
                    <div>
                      <span className="text-sm font-bold text-foreground block">
                        {lookupData.seller_name || t('fuel.receipt_station')}
                      </span>
                      {lookupData.seller_tin && (
                        <span className="text-xs text-muted-foreground">
                          STIR: {lookupData.seller_tin}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                  >
                    {t(`fuel.${lookupData.status}`)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Size limit warning */}
            {qrStatus === 'too-large' && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
              >
                {t('fuel.qr_too_large')}
              </p>
            )}

            {/* Lookup / QR decode alert */}
            {(qrStatus === 'decode-failed' || qrStatus === 'lookup-failed') && (
              <div
                role="alert"
                className="space-y-3 rounded-xl border border-warning/40 bg-warning/10 p-3.5"
              >
                <div className="flex items-start gap-2.5 text-xs text-foreground">
                  <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div className="leading-relaxed">
                    {qrStatus === 'decode-failed'
                      ? t('fuel.qr_fallback')
                      : (qrErrorDetail ?? t('fuel.qr_lookup_error'))}
                  </div>
                </div>

                {!showManualQrInput && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-xs text-primary font-semibold"
                    onClick={() => setShowManualQrInput(true)}
                  >
                    {t('fuel.qr_url')}
                  </Button>
                )}
              </div>
            )}

            {/* Manual QR Link Input */}
            {showManualQrInput && (
              <div className="rounded-xl border p-3 space-y-2 bg-muted/20">
                <label
                  htmlFor="fuel-manual-qr"
                  className="block text-xs font-medium"
                >
                  {t('fuel.qr_url')}
                </label>
                <div className="flex gap-2">
                  <Input
                    id="fuel-manual-qr"
                    aria-label={t('fuel.qr_url')}
                    placeholder="https://ofd.soliq.uz/check?..."
                    value={manualQr}
                    onChange={(e) => setManualQr(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!manualQr || qrStatus === 'fetching'}
                    onClick={() => void performLookup(manualQr)}
                  >
                    {t('fuel.lookup')}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* STEP 3: Chek ma'lumotlarini ko'rish / tahrirlash (Receipt Details) */}
        {step === 3 && (
          <section
            aria-label={t('fuel.step_receipt_details')}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t('fuel.step_receipt_details')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('fuel.manual_entry_hint')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                htmlFor="fuel-station-select"
                className="block space-y-1 text-xs font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <GasPump className="h-3.5 w-3.5 text-primary" />
                  {t('fuel.station')} *
                </span>
                <select
                  id="fuel-station-select"
                  aria-label={`${t('fuel.station')} *`}
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium"
                >
                  <option value="">{t('fuel.choose')}</option>
                  {stationsQuery.data?.data.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.stir ? `(STIR: ${s.stir})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label
                htmlFor="fuel-occurred-at"
                className="block space-y-1 text-xs font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <CalendarBlank className="h-3.5 w-3.5 text-primary" />
                  {t('fuel.date')} *
                </span>
                <Input
                  id="fuel-occurred-at"
                  type="datetime-local"
                  aria-label={`${t('fuel.date')} *`}
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="h-10 text-xs font-medium"
                />
              </label>
            </div>

            <label
              htmlFor="fuel-funding-source"
              className="block space-y-1 text-xs font-medium"
            >
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                {t('fuel.funding_source')} *
              </span>
              <select
                id="fuel-funding-source"
                aria-label={`${t('fuel.funding_source')} *`}
                value={fundingSource}
                onChange={(e) =>
                  setFundingSource(e.target.value as FuelForm['funding_source'])
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium"
              >
                <option value="school_card">
                  {t('fuel.funding_school_card')}
                </option>
                <option value="partner_credit">
                  {t('fuel.funding_partner_credit')}
                </option>
                <option value="advance">{t('fuel.funding_advance')}</option>
                <option value="personal">{t('fuel.funding_personal')}</option>
              </select>
            </label>

            {/* Fuel lines */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  {t('fuel.lines')}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  className="h-7 text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('fuel.add_line')}
                </Button>
              </div>

              {lines.map((l, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-border bg-card p-3 space-y-2.5 text-xs shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground text-[11px]">
                      #{idx + 1}
                    </span>
                    {lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(idx)}
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                        aria-label={t('common.delete')}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block">
                        {t('fuel.type')}
                      </span>
                      <select
                        value={l.fuel_type}
                        onChange={(e) =>
                          handleLineChange(idx, 'fuel_type', e.target.value)
                        }
                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs font-medium"
                      >
                        {allowedFuelTypes.map((ft) => (
                          <option key={ft} value={ft}>
                            {ft.toUpperCase()} ({ft === 'methane' ? 'm³' : 'L'})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block">
                        {t('fuel.quantity')} ({l.unit === 'm3' ? 'm³' : 'L'})
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="30"
                        value={l.quantity}
                        onChange={(e) =>
                          handleLineChange(idx, 'quantity', e.target.value)
                        }
                        className="h-9 text-xs font-medium"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block">
                        {t('fuel.unit_price')} (UZS)
                      </span>
                      <Input
                        type="number"
                        placeholder="10500"
                        value={l.unit_price}
                        onChange={(e) =>
                          handleLineChange(idx, 'unit_price', e.target.value)
                        }
                        className="h-9 text-xs font-medium"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block">
                        {t('fuel.total_amount')} (UZS)
                      </span>
                      <Input
                        type="number"
                        placeholder="315000"
                        value={l.line_total}
                        onChange={(e) =>
                          handleLineChange(idx, 'line_total', e.target.value)
                        }
                        className="h-9 text-xs font-semibold"
                      />
                    </label>
                  </div>
                </div>
              ))}

              {/* Total Calculation Banner */}
              <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 p-3.5 text-xs sm:text-sm font-semibold">
                <span className="text-foreground">
                  {t('fuel.total_amount')}:
                </span>
                <span className="text-base sm:text-lg font-bold text-primary">
                  {totalCalculatedAmount.toLocaleString()} UZS
                </span>
              </div>
            </div>
          </section>
        )}

        {/* STEP 4: Odometr (Odometer Reading & Attachment) */}
        {step === 4 && (
          <section
            aria-label={t('fuel.step_odometer')}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t('fuel.step_odometer')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('fuel.odometer_simple_hint')}
              </p>
            </div>

            <div className="space-y-3.5">
              <label
                htmlFor="fuel-odometer-km"
                className="block space-y-1.5 text-xs font-medium"
              >
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Speedometer className="h-4 w-4 text-primary" />
                  {t('fuel.odometer_km')} (km) *
                </span>
                <Input
                  id="fuel-odometer-km"
                  type="number"
                  aria-label={`${t('fuel.odometer_km')} *`}
                  placeholder="50250"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value)}
                  className="h-12 text-base font-bold tracking-wide"
                />
              </label>

              {lastFuelQuery.data?.odometer_km ? (
                <div className="text-xs space-y-1 rounded-xl border p-3 bg-muted/30">
                  <div className="text-muted-foreground">
                    {t('fuel.last_odometer')}:{' '}
                    <span className="font-semibold text-foreground">
                      {lastFuelQuery.data.odometer_km.toLocaleString()} km
                    </span>
                  </div>
                  {odometerKm &&
                    parseFloat(odometerKm) > lastFuelQuery.data.odometer_km && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckFat className="h-3.5 w-3.5" />+
                        {(
                          parseFloat(odometerKm) -
                          lastFuelQuery.data.odometer_km
                        ).toLocaleString()}{' '}
                        km {t('fuel.distance_travelled')}
                      </div>
                    )}
                  {odometerKm &&
                    parseFloat(odometerKm) < lastFuelQuery.data.odometer_km && (
                      <div className="text-destructive font-semibold flex items-center gap-1">
                        <Warning className="h-4 w-4 shrink-0" />
                        {t('fuel.odometer_too_low')} (min:{' '}
                        {lastFuelQuery.data.odometer_km})
                      </div>
                    )}
                </div>
              ) : null}

              {/* Simple Odometer photo attachment */}
              <div className="pt-2 space-y-2">
                <span className="text-xs font-medium text-foreground block">
                  {t('fuel.odometer_photo_label')} *
                </span>
                <input
                  ref={odometerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  aria-label={`${t('fuel.odometer_photo_label')} *`}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleOdometerFile(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 h-11 text-xs font-medium"
                  onClick={() => odometerInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                  {odometerFile
                    ? odometerFile.name
                    : t('fuel.odometer_photo_label')}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  {t('fuel.odometer_attached')}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* STEP 5: Tasdiqlash full (Full Review & Submit) */}
        {step === 5 && (
          <section
            aria-label={t('fuel.step_review')}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                {t('fuel.step_review')}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('fuel.full_review_hint')}
              </p>
            </div>

            {/* Evidence previews */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-muted/20 p-2.5 space-y-1.5 text-center">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  {t('fuel.receipt')}
                </span>
                {receiptPreview ? (
                  <img
                    src={receiptPreview}
                    alt={t('fuel.receipt')}
                    className="h-28 w-full rounded-lg object-contain bg-background"
                  />
                ) : (
                  <div className="h-28 flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    {t('fuel.no_receipt_image')}
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-muted/20 p-2.5 space-y-1.5 text-center">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  {t('fuel.odometer')}
                </span>
                {odometerPreview ? (
                  <img
                    src={odometerPreview}
                    alt={t('fuel.odometer')}
                    className="h-28 w-full rounded-lg object-contain bg-background"
                  />
                ) : (
                  <div className="h-28 flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    {t('fuel.no_odometer_image')}
                  </div>
                )}
              </div>
            </div>

            {/* Full Summary Ledger */}
            <div className="rounded-xl border p-4 space-y-2.5 text-xs bg-card shadow-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">
                  {t('fuel.vehicle')}:
                </span>
                <span className="font-bold text-foreground">
                  {selectedVehicle?.plate_number}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">
                  {t('fuel.station')}:
                </span>
                <span className="font-semibold text-foreground">
                  {selectedStation?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">
                  {t('fuel.odometer')}:
                </span>
                <span className="font-semibold text-foreground">
                  {parseFloat(odometerKm || '0').toLocaleString()} km
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">
                  {t('fuel.funding_source')}:
                </span>
                <span className="font-semibold capitalize text-foreground">
                  {t(`fuel.funding_${fundingSource}`)}
                </span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-bold text-primary">
                <span>{t('fuel.total_amount')}:</span>
                <span className="text-base font-extrabold">
                  {totalCalculatedAmount.toLocaleString()} UZS
                </span>
              </div>
            </div>

            {/* Submitting progress */}
            {submitProgress && (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <ArrowClockwise className="h-4 w-4 animate-spin text-primary" />
                  <span>{t(submitProgress.messageKey)}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${submitProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Dialog Actions / Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
          )}

          <div className="flex items-center gap-2">
            {(step === 3 || step === 5) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSaveDraft()}
                disabled={isSubmitting || !canContinue()}
                className="gap-1.5"
              >
                <FloppyDisk className="h-4 w-4" />
                {t('fuel.save_draft')}
              </Button>
            )}

            {step < 5 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                disabled={!canContinue()}
                className="gap-1.5"
              >
                {t('common.continue')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSubmitComplete()}
                disabled={!canContinue() || isSubmitting}
                className="gap-1.5 bg-primary text-primary-foreground font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <ArrowClockwise className="h-4 w-4 animate-spin" />
                    {t('common.submitting')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t('fuel.submit_for_review')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
