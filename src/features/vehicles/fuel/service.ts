import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/api/axiosInstance';
import { parseItemEnvelope, parseListEnvelope } from '@/lib/apiEnvelope';
import { useInspectionScope } from '../inspections/service';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/errors';
import type { FuelForm } from './policy';
export interface Station {
  id: string;
  branch_id: string;
  name: string;
  stir: string | null;
  address: string | null;
  contact: string | null;
  active: boolean;
}
export interface Fuel extends Omit<FuelForm, 'odometer_km'> {
  id: string;
  author_id: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  source_status: 'manual_review' | 'source_verified';
  source_data?: Lookup | null;
  odometer_km: number;
  expense_id: string | null;
  vehicle_plate: string;
  station_name: string;
  author_name: string;
  request_id: string;
  version: number;
  evidence: { id: string; slot: 'receipt' | 'odometer' }[];
  history: {
    id: string;
    action: string;
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    };
    reason: string | null;
    created_at: string;
  }[];
}
export interface Lookup {
  seller_name?: string;
  seller_tin?: string;
  total?: string;
  reason?: string;
  warnings?: string[];
  status: 'manual_review' | 'source_verified';
  lines?: {
    index: number;
    name: string;
    mxik: string;
    unit: string | null;
    quantity: string;
    line_total: string;
    unit_price: string;
  }[];
  qr_url?: string;
}
export interface Balance {
  total_purchased?: string;
  purchased: string;
  paid: string;
  outstanding: string;
}
export interface Reconciliation {
  id: string;
  statement_amount: string;
  reason: string;
  discrepancy: string;
  created_at: string;
}
export function useFuelList(params: Record<string, unknown>) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['vehicle-fuel', scope, 'list', params],
    queryFn: async ({ signal }) =>
      parseListEnvelope<Fuel>(
        (await axios.get('/vehicle-fuel', { params, signal })).data,
        'fuel',
      ),
  });
}
export function useFuel(id: string) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['vehicle-fuel', scope, id],
    queryFn: async ({ signal }) =>
      parseItemEnvelope<Fuel>(
        (await axios.get(`/vehicle-fuel/${id}`, { signal })).data,
        'fuel',
      ),
  });
}
export function useStations(params: Record<string, unknown>) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['fuel-stations', scope, params],
    queryFn: async ({ signal }) =>
      parseListEnvelope<Station>(
        (await axios.get('/fuel-stations', { params, signal })).data,
        'stations',
      ),
  });
}
export function useStationBalance(id: string) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['fuel-stations', scope, id, 'balance'],
    enabled: !!id,
    queryFn: async ({ signal }) =>
      parseItemEnvelope<Balance>(
        (await axios.get(`/fuel-stations/${id}/balance`, { signal })).data,
        'balance',
      ),
  });
}
export function useReconciliations(id: string, page = 1) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['fuel-stations', scope, id, 'reconciliations', page],
    enabled: !!id,
    queryFn: async ({ signal }) =>
      parseListEnvelope<Reconciliation>(
        (
          await axios.get(`/fuel-stations/${id}/reconciliations`, {
            signal,
            params: { page, limit: 20 },
          })
        ).data,
        'reconciliations',
      ),
  });
}
export function useFuelMutation<T, R>(fn: (arg: T) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vehicle-fuel'] });
      void qc.invalidateQueries({ queryKey: ['fuel-stations'] });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });
}
export async function saveFuel(
  values: FuelForm,
  requestId: string,
  id?: string,
  version?: number,
  reason?: string,
) {
  const body = {
    ...values,
    odometer_km: Number(values.odometer_km),
    occurred_at: new Date(values.occurred_at).toISOString(),
    qr_url: values.qr_url || undefined,
    request_id: requestId,
    ...(id ? { expected_version: version, reason } : {}),
  };
  return parseItemEnvelope<Fuel>(
    (
      await (id
        ? axios.patch(`/vehicle-fuel/${id}`, body)
        : axios.post('/vehicle-fuel', body))
    ).data,
    'fuel',
  );
}
export async function lookupReceipt(qr_url: string) {
  return parseItemEnvelope<Lookup>(
    (await axios.post('/vehicle-fuel/lookup', { qr_url })).data,
    'lookup',
  );
}
export const fuelAction = (id: string, action: string, body: unknown) =>
  axios.post(`/vehicle-fuel/${id}/${action}`, body);
export async function uploadFuelEvidence(
  id: string,
  slot: string,
  file: File,
  onProgress: (n: number) => void,
) {
  const body = new FormData();
  body.append('file', file);
  body.append('slot', slot);
  return axios.post(`/vehicle-fuel/${id}/evidence`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) =>
      onProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
}
export async function fuelImage(
  id: string,
  evidenceId: string,
  signal: AbortSignal,
) {
  return (
    await axios.get<Blob>(`/vehicle-fuel/${id}/evidence/${evidenceId}`, {
      signal,
      responseType: 'blob',
    })
  ).data;
}

export function useFuelVehicles(params: Record<string, unknown>) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['vehicle-fuel', scope, 'vehicles', params],
    queryFn: async ({ signal }) =>
      parseListEnvelope<{
        id: string;
        plate_number: string;
        branch_id: string;
        fuel_types: string[];
      }>(
        (await axios.get('/vehicle-fuel/vehicles/options', { params, signal }))
          .data,
        'vehicles',
      ),
  });
}
