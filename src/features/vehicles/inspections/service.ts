import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/api/axiosInstance';
import { parseItemEnvelope, parseListEnvelope } from '@/lib/apiEnvelope';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/errors';
export type Slot = 'front' | 'back' | 'left' | 'right' | 'odometer' | 'defect';
export interface Inspection {
  id: string;
  vehicle_id: string;
  branch_id: string;
  author_id: string;
  receiver_id: string;
  kind: 'acceptance' | 'return';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  odometer_km: number;
  notes: string | null;
  override_reason: string | null;
  created_at: string;
  vehicle: { plate_number: string; make: string; model: string };
  author: { id: string; name: string };
  receiver: { id: string; name: string };
  evidence: {
    id: string;
    slot: Slot;
    note: string | null;
    mime_type: string;
    size: number;
    created_at: string;
  }[];
  reviews: {
    id: string;
    actor_id: string;
    decision: string;
    reason: string | null;
    created_at: string;
  }[];
}
export const useInspectionScope = () =>
  useAuthStore((s) =>
    [s.user?.company_id, s.user?.branch_id, s.user?.id, s.user?.role].join(':'),
  );
export function useInspections(params: Record<string, unknown>) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['vehicle-inspections', scope, 'list', params],
    queryFn: async ({ signal }) =>
      parseListEnvelope<Inspection>(
        (await axios.get('/vehicle-inspections', { params, signal })).data,
        'inspections',
      ),
  });
}
export function useInspection(id: string) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['vehicle-inspections', scope, id],
    queryFn: async ({ signal }) =>
      parseItemEnvelope<Inspection>(
        (await axios.get(`/vehicle-inspections/${id}`, { signal })).data,
        'inspection',
      ),
  });
}
export function useInspectionSummary(enabled: boolean) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['vehicle-inspections', scope, 'summary'],
    enabled,
    queryFn: async ({ signal }) =>
      parseItemEnvelope<
        Record<
          | 'active_fleet'
          | 'inspected_today'
          | 'missing_today'
          | 'pending_review'
          | 'rejected_inspections'
          | 'pending_defect_inspections',
          number
        >
      >(
        (await axios.get('/vehicle-inspections/summary', { signal })).data,
        'summary',
      ),
  });
}
export function useInspectionMutation<T>(fn: (arg: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['vehicle-inspections'] }),
        qc.invalidateQueries({ queryKey: ['vehicles'] }),
      ]);
    },
    onError: (error) => toast.error(extractErrorMessage(error)),
  });
}
export const createInspection = async (body: {
  request_id: string;
  vehicle_id: string;
  receiver_id: string;
  kind: 'acceptance' | 'return';
  odometer_km: number;
  notes?: string;
}) =>
  parseItemEnvelope<Inspection>(
    (await axios.post('/vehicle-inspections', body)).data,
    'inspection',
  );
export const inspectionAction = (
  id: string,
  action: 'submit' | 'review',
  body: unknown,
) => axios.post(`/vehicle-inspections/${id}/${action}`, body);
export async function uploadEvidence(
  id: string,
  slot: Slot,
  file: File,
  note: string,
  onProgress: (n: number) => void,
) {
  const body = new FormData();
  body.append('file', file);
  body.append('slot', slot);
  if (note) body.append('note', note);
  await axios.post(`/vehicle-inspections/${id}/evidence`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) =>
      onProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
}
export async function fetchEvidence(
  id: string,
  evidenceId: string,
  signal: AbortSignal,
) {
  return (
    await axios.get<Blob>(`/vehicle-inspections/${id}/evidence/${evidenceId}`, {
      responseType: 'blob',
      signal,
    })
  ).data;
}
export function useInspectionReceivers(
  vehicleId: string,
  search: string,
  page: number,
  kind?: 'acceptance' | 'return',
) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: [
      'vehicle-inspections',
      scope,
      'receivers',
      vehicleId,
      search,
      page,
      kind,
    ],
    enabled: !!vehicleId,
    queryFn: async ({ signal }) =>
      parseListEnvelope<{ id: string; name: string; role: string }>(
        (
          await axios.get('/vehicle-inspections/receivers', {
            params: { vehicle_id: vehicleId, search, page, kind, limit: 20 },
            signal,
          })
        ).data,
        'receivers',
      ),
  });
}

export interface VehicleDefect {
  id: string;
  description: string;
  status: 'open' | 'resolved';
  reported_at: string;
  resolution_note: string | null;
}
export function useVehicleDefects(vehicleId: string, page: number) {
  const scope = useInspectionScope();
  return useQuery({
    queryKey: ['vehicle-inspections', scope, 'defects', vehicleId, page],
    enabled: !!vehicleId,
    queryFn: async ({ signal }) =>
      parseListEnvelope<VehicleDefect>(
        (
          await axios.get('/vehicle-defects', {
            params: { vehicle_id: vehicleId, page, limit: 10 },
            signal,
          })
        ).data,
        'defects',
      ),
  });
}
