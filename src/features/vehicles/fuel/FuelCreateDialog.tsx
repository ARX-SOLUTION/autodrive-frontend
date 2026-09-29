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
  Info,
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
import {
  decodeReceipt,
  classifyFuelLine,
  detectFundingSource,
  fiscalQr,
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

interface FuelCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export default function FuelCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: FuelCreateDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [odometerFile, setOdometerFile] = useState<File | null>(null);
  const [odometerPreview, setOdometerPreview] = useState<string | null>(null);

  const [qrUrl, setQrUrl] = useState('');
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

  const [vehicleId, setVehicleId] = useState('');
  const [stationId, setStationId] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [fundingSource, setFundingSource] = useState<
    'school_card' | 'partner_credit' | 'advance' | 'personal'
  >('school_card');
  const [occurredAt, setOccurredAt] = useState(() =>
    localDate(new Date().toISOString()),
  );

  const [lines, setLines] = useState<FuelForm['lines']>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] =
    useState<SubmitFuelProgress | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const odometerInputRef = useRef<HTMLInputElement>(null);
  const qrOperationRef = useRef(0);

  const vehiclesQuery = useFuelVehicles({ limit: 100 });
  const stationsQuery = useStations({ limit: 100, active: true });
  const selectedVehicleId =
    vehicleId ||
    (vehiclesQuery.data?.data.length === 1
      ? vehiclesQuery.data.data[0].id
      : '');
  const lastFuelQuery = useVehicleLastFuel(selectedVehicleId || undefined);

  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
      if (odometerPreview) URL.revokeObjectURL(odometerPreview);
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
      setLines([]);
      setStationId('');
      setQrStatus('too-large');
      return;
    }

    setReceiptFile(file);
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptPreview(URL.createObjectURL(file));

    setQrStatus('decoding');
    setQrUrl('');
    setLookupData(null);
    setQrErrorDetail(null);
    setLines([]);
    setStationId('');
    setFundingSource('school_card');

    try {
      const code = await decodeReceipt(file);
      if (operation !== qrOperationRef.current) return;
      if (code) {
        setQrUrl(code);
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
    operation = ++qrOperationRef.current,
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

      if (result.seller_tin && stationsQuery.data?.data) {
        const matched = stationsQuery.data.data.find(
          (s) => s.stir && s.stir.trim() === String(result.seller_tin).trim(),
        );
        if (matched) {
          setStationId(matched.id);
        }
      }

      if (result.lines && result.lines.length > 0) {
        const classifiedLines: FuelForm['lines'] = result.lines
          .map((l) => {
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
          })
          .filter((line) => {
            const c = classifyFuelLine(line.name, line.mxik);
            return c.is_fuel;
          });

        if (classifiedLines.length > 0) {
          setLines(classifiedLines);
        } else {
          setLines(
            result.lines.map((l) => ({
              fuel_type: 'petrol',
              unit: 'litre',
              quantity: String(l.quantity),
              unit_price: String(l.unit_price),
              line_total: String(l.line_total),
              name: l.name,
              mxik: l.mxik,
            })),
          );
        }
      }

      // Detect funding source (e.g. corporate card)
      const detectedSource = detectFundingSource(result.seller_name);
      setFundingSource(detectedSource);

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
    setOdometerFile(file);
    if (odometerPreview) URL.revokeObjectURL(odometerPreview);
    setOdometerPreview(URL.createObjectURL(file));
  };

  const lastRecordedKm = lastFuelQuery.data?.odometer_km;
  const odometerNum = Number(odometerKm);
  const isOdometerInvalid = Boolean(
    lastRecordedKm && odometerKm && odometerNum < lastRecordedKm,
  );

  const isFormReady = useMemo(() => {
    return (
      Boolean(receiptFile) &&
      Boolean(odometerFile) &&
      Boolean(selectedVehicleId) &&
      Boolean(stationId) &&
      Boolean(odometerKm) &&
      !isOdometerInvalid &&
      lines.length > 0
    );
  }, [
    receiptFile,
    odometerFile,
    selectedVehicleId,
    stationId,
    odometerKm,
    isOdometerInvalid,
    lines,
  ]);

  const totalSum = useMemo(() => {
    return lines
      .reduce((sum, l) => sum + (Number(l.line_total) || 0), 0)
      .toLocaleString();
  }, [lines]);

  const handleFullSubmit = async () => {
    if (!isFormReady || isSubmitting) return;

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
      const saved = await submitFuelComplete({
        values,
        requestId,
        receiptFile,
        odometerFile,
        onProgress: setSubmitProgress,
      });

      await qc.invalidateQueries({ queryKey: ['vehicle-fuel'] });
      toast.success(t('fuel.submitted_success'));
      closeAfterSave();
      if (onSuccess) onSuccess(saved.id);
      else
        await navigate({ to: '/vehicle-fuel/$id', params: { id: saved.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || t('fuel.invalid'));
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
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
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || t('fuel.invalid'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    qrOperationRef.current += 1;
    setReceiptFile(null);
    setReceiptPreview(null);
    setOdometerFile(null);
    setOdometerPreview(null);
    setQrUrl('');
    setQrStatus('idle');
    setLookupData(null);
    setQrErrorDetail(null);
    setVehicleId('');
    setStationId('');
    setOdometerKm('');
    setFundingSource('school_card');
    setOccurredAt(localDate(new Date().toISOString()));
    setLines([]);
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

  const closeAfterSave = () => {
    resetFlow();
    onOpenChange(false);
  };

  const canAdvance =
    step === 1
      ? Boolean(receiptFile && lookupData && lines.length > 0)
      : step === 2
        ? Boolean(
            selectedVehicleId &&
            stationId &&
            occurredAt &&
            odometerKm &&
            odometerFile &&
            !isOdometerInvalid,
          )
        : false;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <GasPump className="h-6 w-6 text-primary" weight="duotone" />
            {t('fuel.create')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('fuel.save_hint')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <ol
            aria-label={t('fuel.create_steps')}
            className="grid grid-cols-3 gap-2"
          >
            {[
              t('fuel.step_receipt'),
              t('fuel.step_vehicle'),
              t('fuel.step_review'),
            ].map((label, index) => {
              const itemStep = (index + 1) as 1 | 2 | 3;
              const current = step === itemStep;
              const complete = step > itemStep;
              return (
                <li
                  key={label}
                  aria-current={current ? 'step' : undefined}
                  className={[
                    'flex min-h-11 min-w-0 items-center gap-2 rounded-md border px-2 text-xs sm:px-3',
                    current
                      ? 'border-primary/40 bg-primary/10 font-semibold text-foreground'
                      : complete
                        ? 'border-success/30 bg-success/10 text-foreground'
                        : 'border-border bg-muted/30 text-muted-foreground',
                  ].join(' ')}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background font-semibold tabular-nums">
                    {complete ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      itemStep
                    )}
                  </span>
                  <span className="min-w-0 text-balance">{label}</span>
                </li>
              );
            })}
          </ol>
          <p role="status" className="sr-only">
            {t('fuel.step_progress', { current: step, total: 3 })}
          </p>
        </div>

        {step === 1 && (
          <section aria-label={t('fuel.step_receipt')} className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200/80 bg-amber-50/60 p-3.5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="text-xs sm:text-sm leading-relaxed">
                <strong className="block font-medium">
                  {t('fuel.scan_guidance_title')}
                </strong>
                {t('fuel.scan_guidance_desc')}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-primary/60 transition-colors">
                <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => receiptInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {receiptFile
                    ? t('fuel.change_photo')
                    : t('fuel.scan_receipt_btn')}
                </Button>
                <span className="text-xs text-muted-foreground mt-1">
                  {t('fuel.receipt_upload_hint')}
                </span>
              </div>

              <div className="flex flex-col justify-center rounded-lg border bg-muted/30 p-3 text-sm">
                {receiptPreview ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-muted-foreground">
                        {t('fuel.receipt_image_preview')}
                      </span>
                      {lookupData?.status === 'source_verified' && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                        >
                          <Check className="h-3 w-3" />
                          Soliq QR
                        </Badge>
                      )}
                    </div>
                    <img
                      src={receiptPreview}
                      alt={t('fuel.receipt')}
                      className="max-h-28 w-full rounded object-contain bg-black/5"
                    />
                    {qrStatus === 'decoding' && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ArrowClockwise className="h-3.5 w-3.5 animate-spin" />
                        {t('fuel.scanning_qr')}
                      </div>
                    )}
                    {qrStatus === 'fetching' && (
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <ArrowClockwise className="h-3.5 w-3.5 animate-spin" />
                        {t('fuel.fetching_soliq')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-xs text-muted-foreground py-6">
                    {t('fuel.qr_hint')}
                  </div>
                )}
              </div>
            </div>

            {qrStatus === 'too-large' && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {t('fuel.qr_too_large')}
              </p>
            )}

            {(qrStatus === 'decode-failed' || qrStatus === 'lookup-failed') && (
              <div
                role="alert"
                className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3"
              >
                <div className="flex items-start gap-2 text-sm font-medium text-foreground">
                  <Warning className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  {qrStatus === 'decode-failed'
                    ? t('fuel.qr_fallback')
                    : (qrErrorDetail ?? t('fuel.qr_lookup_error'))}
                </div>
                <label
                  htmlFor="fuel-fiscal-qr-url"
                  className="block text-xs font-medium text-foreground"
                >
                  {t('fuel.qr_url')}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="fuel-fiscal-qr-url"
                    type="url"
                    aria-label={t('fuel.qr_url')}
                    autoComplete="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={2048}
                    value={qrUrl}
                    onChange={(e) => setQrUrl(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 shrink-0"
                    onClick={() => void performLookup(qrUrl)}
                    disabled={!qrUrl.trim()}
                  >
                    {t('fuel.lookup')}
                  </Button>
                </div>
              </div>
            )}

            {lookupData && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className="h-5 w-5 text-emerald-600"
                      weight="fill"
                    />
                    <div>
                      <h3 className="font-semibold text-sm">
                        {lookupData.seller_name || t('fuel.receipt_station')}
                      </h3>
                      {lookupData.seller_tin && (
                        <span className="text-xs text-muted-foreground">
                          STIR: {lookupData.seller_tin}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {t(`fuel.${lookupData.status}`)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('fuel.selected_fuel')} (
                    <span>
                      {lookupData.status === 'source_verified'
                        ? t('fuel.soliq_locked_hint')
                        : t('fuel.manual_review_data_hint')}
                    </span>
                    )
                  </span>
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center justify-between rounded bg-muted/40 p-2 text-xs gap-2"
                    >
                      <div className="space-y-0.5">
                        <strong className="text-foreground">{line.name}</strong>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>
                            {t(`fuel.${line.fuel_type}`)} (
                            {t('fuel.auto_classified')})
                          </span>
                          <span>·</span>
                          <span>
                            {line.quantity} {t(`fuel.${line.unit}`)} ×{' '}
                            {Number(line.unit_price).toLocaleString()} so‘m
                          </span>
                        </div>
                      </div>
                      <span className="font-semibold text-foreground text-sm">
                        {Number(line.line_total).toLocaleString()} so‘m
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 font-medium text-sm">
                  <span>{t('fuel.total_amount')}:</span>
                  <span className="text-base font-bold text-primary">
                    {totalSum} so‘m
                  </span>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section
            aria-label={t('fuel.step_vehicle')}
            className="space-y-4 pt-2 border-t"
          >
            <h2 className="text-base font-semibold">
              {t('fuel.step_vehicle')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Car className="h-4 w-4 text-primary" />
                  {t('fuel.vehicle')} *
                </span>
                <select
                  id="fuel-vehicle"
                  aria-label={t('fuel.vehicle')}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:bg-muted disabled:cursor-not-allowed"
                  value={selectedVehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  disabled={vehiclesQuery.data?.data.length === 1}
                >
                  {vehiclesQuery.data?.data.length === 0 ? (
                    <option value="">Biriktirilgan avtomobil yo‘q</option>
                  ) : (
                    <>
                      <option value="">
                        {t('fuel.select_vehicle_prompt')}
                      </option>
                      {vehiclesQuery.data?.data.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plate_number}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {vehiclesQuery.data && vehiclesQuery.data.data.length === 1 && (
                  <span className="text-[11px] text-muted-foreground block">
                    O‘zingizga biriktirilgan avtomobil
                  </span>
                )}
                {vehiclesQuery.data && vehiclesQuery.data.data.length === 0 && (
                  <span className="text-[11px] text-destructive block">
                    Sizga biriktirilgan avtomobil topilmadi. Faqat o‘zingizga
                    biriktirilgan avtomobilga yoqilg‘i kiritishingiz mumkin.
                  </span>
                )}
              </label>

              <label className="block space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <GasPump className="h-4 w-4 text-primary" />
                  {t('fuel.station')} *
                </span>
                <select
                  id="fuel-station"
                  aria-label={t('fuel.station')}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                >
                  <option value="">{t('fuel.choose')}</option>
                  {stationsQuery.data?.data.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.stir ? `(${s.stir})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium">
                  {t('fuel.occurred_at')} *
                </span>
                <Input
                  id="fuel-occurred-at"
                  type="datetime-local"
                  aria-label={t('fuel.occurred_at')}
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="min-h-11"
                />
              </label>
              <label className="block space-y-1">
                <span className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <Speedometer className="h-4 w-4 text-primary" />
                    {t('fuel.odometer_km')} *
                  </span>
                  {lastRecordedKm ? (
                    <span className="text-muted-foreground font-normal">
                      {t('fuel.last_odometer')}:{' '}
                      {lastRecordedKm.toLocaleString()} km
                    </span>
                  ) : null}
                </span>
                <Input
                  id="fuel-odometer-km"
                  type="text"
                  inputMode="numeric"
                  aria-label={t('fuel.odometer_km')}
                  placeholder={t('fuel.enter_odometer_prompt')}
                  value={odometerKm}
                  onChange={(e) =>
                    setOdometerKm(e.target.value.replace(/\D/g, ''))
                  }
                  className="min-h-11"
                />
                {isOdometerInvalid && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                    <Warning className="h-3.5 w-3.5" />
                    {t('fuel.odometer_min_error')} ({lastRecordedKm} km)
                  </p>
                )}
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-medium">
                  {t('fuel.funding_source')} *
                </span>
                <select
                  id="fuel-funding-source"
                  aria-label={t('fuel.funding_source')}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={fundingSource}
                  onChange={(e) =>
                    setFundingSource(
                      e.target.value as FuelForm['funding_source'],
                    )
                  }
                >
                  <option value="school_card">{t('fuel.school_card')}</option>
                  <option value="partner_credit">
                    {t('fuel.partner_credit')}
                  </option>
                  <option value="advance">{t('fuel.advance')}</option>
                  <option value="personal">{t('fuel.personal')}</option>
                </select>
              </label>
            </div>

            <div className="rounded-lg border p-3 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Camera className="h-4 w-4 text-primary" />
                  {t('fuel.odometer_photo_label')} *
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('fuel.odometer_photo_hint')}
                </span>
              </div>

              <input
                ref={odometerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                aria-label={t('fuel.odometer_photo_label')}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleOdometerFile(f);
                }}
              />

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 gap-2"
                  onClick={() => odometerInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {odometerFile ? t('fuel.change_photo') : t('fuel.take_photo')}
                </Button>
                {odometerPreview && (
                  <img
                    src={odometerPreview}
                    alt={t('fuel.odometer')}
                    className="h-12 w-20 rounded border object-cover bg-black/5"
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section
            aria-label={t('fuel.step_review')}
            className="space-y-4 border-t pt-4"
          >
            <h2 className="text-base font-semibold">{t('fuel.step_review')}</h2>
            <dl className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t('fuel.vehicle')}
                </dt>
                <dd className="font-medium">
                  {vehiclesQuery.data?.data.find(
                    (v) => v.id === selectedVehicleId,
                  )?.plate_number || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t('fuel.station')}
                </dt>
                <dd className="font-medium">
                  {stationsQuery.data?.data.find((s) => s.id === stationId)
                    ?.name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t('fuel.occurred_at')}
                </dt>
                <dd className="font-medium">
                  {new Date(occurredAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t('fuel.odometer_km')}
                </dt>
                <dd className="font-medium">
                  {Number(odometerKm).toLocaleString()} km
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t('fuel.funding_source')}
                </dt>
                <dd className="font-medium">{t(`fuel.${fundingSource}`)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  {t('fuel.total_amount')}
                </dt>
                <dd className="text-lg font-bold text-primary">
                  {totalSum} so‘m
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              {t('fuel.review_receipt_hint')}
            </p>
          </section>
        )}

        {step === 3 && (
          <div className="pt-2 border-t space-y-3">
            {submitProgress && (
              <div className="space-y-1.5 rounded bg-muted/50 p-3 text-xs">
                <div className="flex justify-between font-medium">
                  <span>{t(submitProgress.messageKey)}</span>
                  <span>{submitProgress.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${submitProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={isSubmitting}
                  onClick={() => setStep(2)}
                >
                  {t('common.back')}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  disabled={
                    isSubmitting ||
                    !selectedVehicleId ||
                    !stationId ||
                    lines.length === 0
                  }
                  onClick={() => void handleSaveDraft()}
                >
                  {t('fuel.save_draft_only')}
                </Button>
              </div>

              <Button
                type="button"
                className="min-h-11 gap-1.5 bg-primary text-primary-foreground sm:min-w-[180px]"
                disabled={!isFormReady || isSubmitting}
                onClick={() => void handleFullSubmit()}
              >
                {isSubmitting ? (
                  <>
                    <ArrowClockwise className="h-4 w-4 animate-spin" />
                    {t('fuel.submitting')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t('fuel.submit_for_review')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step < 3 && (
          <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={isSubmitting}
              onClick={() =>
                step === 1 ? handleDialogOpenChange(false) : setStep(1)
              }
            >
              {step === 1 ? t('common.cancel') : t('common.back')}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {step === 2 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  disabled={
                    isSubmitting ||
                    !selectedVehicleId ||
                    !stationId ||
                    lines.length === 0
                  }
                  onClick={() => void handleSaveDraft()}
                >
                  {t('fuel.save_draft_only')}
                </Button>
              )}
              <Button
                type="button"
                className="min-h-11"
                disabled={!canAdvance || isSubmitting}
                onClick={() => setStep(step === 1 ? 2 : 3)}
              >
                {t('common.continue')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
