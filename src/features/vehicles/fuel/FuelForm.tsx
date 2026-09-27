import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PaginationControls from '@/components/ui/PaginationControls';

import {
  fuelSchema,
  fuelTypes,
  decodeReceipt,
  type FuelForm as Values,
} from './policy';
import {
  useFuelVehicles,
  useStations,
  useFuelMutation,
  saveFuel,
  lookupReceipt,
  type Fuel,
} from './service';
export const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3';
const blankLine = () => ({
  fuel_type: '' as Values['lines'][number]['fuel_type'],
  unit: 'litre' as const,
  quantity: '',
  unit_price: '',
  line_total: '',
  name: '',
  mxik: '',
});
export default function FuelForm({ row }: { row?: Fuel }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requestId] = useState(() => row?.request_id ?? crypto.randomUUID());
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [stationSearch, setStationSearch] = useState('');
  const [stationPage, setStationPage] = useState(1);
  const [scanMessage, setScanMessage] = useState('');
  const vehicles = useFuelVehicles({ search, page, limit: 20 });
  const stations = useStations({
    search: stationSearch,
    page: stationPage,
    limit: 20,
    active: true,
  });
  const form = useForm<Values>({
    resolver: zodResolver(fuelSchema),
    defaultValues: row
      ? {
          vehicle_id: row.vehicle_id,
          station_id: row.station_id,
          occurred_at: localDate(row.occurred_at),
          odometer_km: String(row.odometer_km),
          funding_source: row.funding_source,
          qr_url: row.qr_url ?? '',
          lines: row.lines,
        }
      : {
          vehicle_id: '',
          station_id: '',
          occurred_at: localDate(new Date().toISOString()),
          odometer_km: '',
          funding_source: 'partner_credit',
          qr_url: '',
          lines: [blankLine()],
        },
  });
  const lines = useFieldArray({ control: form.control, name: 'lines' });
  const mutation = useFuelMutation((values: Values) =>
    saveFuel(values, requestId, row?.id, row?.version, reason),
  );
  const lookup = useFuelMutation(lookupReceipt);
  const read = async () => {
    try {
      const result = await lookup.mutateAsync(form.getValues('qr_url'));
      setScanMessage(result.status);
      if (result.lines?.length)
        lines.replace(
          result.lines.map((line) => ({
            ...blankLine(),
            name: line.name,
            mxik: line.mxik,
            quantity: line.quantity,
            unit_price: line.unit_price,
            line_total: line.line_total,
            unit: (line.unit && ['m3', 'litre'].includes(line.unit)
              ? line.unit
              : '') as Values['lines'][number]['unit'],
          })),
        );
    } catch {
      setScanMessage('manual_review');
    }
  };
  return (
    <form
      className="glass-card space-y-4 p-4"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          const saved = await mutation.mutateAsync(values);
          await navigate({ to: '/vehicle-fuel/$id', params: { id: saved.id } });
        } catch {
          /* retain draft on network errors */
        }
      })}
    >
      {!row && (
        <>
          <label className="block">
            {t('fuel.vehicle_search')}
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="block">
            {t('fuel.vehicle')}
            <select className={selectClass} {...form.register('vehicle_id')}>
              <option value="">{t('fuel.choose')}</option>
              {vehicles.data?.data.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number}
                </option>
              ))}
            </select>
          </label>
          <PaginationControls
            currentPage={page}
            totalPages={vehicles.data?.meta.totalPages ?? 1}
            onPageChange={setPage}
          />
        </>
      )}
      <label className="block">
        {t('fuel.station_search')}
        <Input
          value={stationSearch}
          onChange={(e) => {
            setStationSearch(e.target.value);
            setStationPage(1);
          }}
        />
      </label>
      <label className="block">
        {t('fuel.station')}
        <select className={selectClass} {...form.register('station_id')}>
          <option value="">{t('fuel.choose')}</option>
          {row && !stations.data?.data.some((s) => s.id === row.station_id) && (
            <option value={row.station_id}>{row.station_name}</option>
          )}
          {stations.data?.data.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <PaginationControls
        currentPage={stationPage}
        totalPages={stations.data?.meta.totalPages ?? 1}
        onPageChange={setStationPage}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          {t('fuel.occurred_at')}
          <Input type="datetime-local" {...form.register('occurred_at')} />
        </label>
        <label>
          {t('fuel.odometer_km')}
          <Input inputMode="numeric" {...form.register('odometer_km')} />
        </label>
      </div>
      <label className="block">
        {t('fuel.funding_source')}
        <select className={selectClass} {...form.register('funding_source')}>
          {['partner_credit', 'school_card', 'advance', 'personal'].map((v) => (
            <option key={v} value={v}>
              {t(`fuel.${v}`)}
            </option>
          ))}
        </select>
      </label>
      <section className="space-y-2">
        <h2>{t('fuel.scan')}</h2>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-label={t('fuel.scan')}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const value = await decodeReceipt(file);
              if (value) {
                form.setValue('qr_url', value);
                setScanMessage('qr_found');
              } else setScanMessage('qr_fallback');
            } catch {
              setScanMessage('qr_fallback');
            }
          }}
        />
        <p className="text-sm text-muted-foreground">{t('fuel.qr_hint')}</p>
        <label>
          {t('fuel.qr_url')}
          <Input {...form.register('qr_url')} />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={lookup.isPending}
          onClick={() => void read()}
        >
          {t('fuel.lookup')}
        </Button>
        {scanMessage && <p role="status">{t(`fuel.${scanMessage}`)}</p>}
        <p>{t('fuel.classify_hint')}</p>
      </section>
      {lines.fields.map((line, index) => (
        <fieldset className="space-y-3 rounded border p-3" key={line.id}>
          <legend>
            {t('fuel.line')} {index + 1}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              {t('fuel.fuel_type')}
              <select
                className={selectClass}
                {...form.register(`lines.${index}.fuel_type`)}
              >
                <option value="">{t('fuel.choose')}</option>
                {fuelTypes.map((v) => (
                  <option key={v} value={v}>
                    {t(`fuel.${v}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('fuel.unit')}
              <select
                className={selectClass}
                {...form.register(`lines.${index}.unit`)}
              >
                <option value="">{t('fuel.choose')}</option>
                {['litre', 'm3'].map((v) => (
                  <option key={v} value={v}>
                    {t(`fuel.${v}`)}
                  </option>
                ))}
              </select>
            </label>
            {(
              ['name', 'mxik', 'quantity', 'unit_price', 'line_total'] as const
            ).map((key) => (
              <label key={key}>
                {t(`fuel.${key}`)}
                <Input
                  inputMode={
                    ['quantity', 'unit_price', 'line_total'].includes(key)
                      ? 'decimal'
                      : undefined
                  }
                  {...form.register(`lines.${index}.${key}`)}
                />
              </label>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => lines.remove(index)}
          >
            {t('fuel.remove_line')}
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => lines.append(blankLine())}
      >
        {t('fuel.add_line')}
      </Button>
      {Object.keys(form.formState.errors).length > 0 && (
        <p role="alert">{t('fuel.invalid')}</p>
      )}
      <div>
        {row && (
          <label>
            {t('fuel.reason')}
            <Input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        <Button disabled={mutation.isPending} type="submit">
          {t('common.save')}
        </Button>
      </div>
      <p className="text-sm">{t('fuel.save_hint')}</p>
    </form>
  );
}
function localDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
