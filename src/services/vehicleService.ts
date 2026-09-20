import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import axiosInstance from '@/api/axiosInstance';
import { parseItemEnvelope, parseListEnvelope } from '@/lib/apiEnvelope';
import { vehicleKeys } from '@/lib/queryKeys';
import type { ListResponse } from '@/types/list';
import type {
  CreateVehicleRequest,
  TransferVehicleRequest,
  UpdateVehicleRequest,
  UpsertVehicleDocumentRequest,
  UpsertVehicleMaintenanceRequest,
  Vehicle,
  VehicleDetail,
  VehicleListFilters,
} from '@/types/vehicle';

export const fetchVehiclesPage = async (
  filters: VehicleListFilters = {},
  signal?: AbortSignal,
): Promise<ListResponse<Vehicle>> => {
  const { data } = await axiosInstance.get<unknown>('/vehicles', {
    params: {
      branch_id: filters.branchId,
      search: filters.search,
      status: filters.status,
      category: filters.category,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    },
    signal,
  });
  return parseListEnvelope<Vehicle>(data, 'vehicles');
};

export const vehiclesPageQueryOptions = (filters: VehicleListFilters = {}) =>
  queryOptions({
    queryKey: vehicleKeys.page({ ...filters }),
    queryFn: ({ signal }) => fetchVehiclesPage(filters, signal),
    staleTime: 30_000,
  });

export const useVehiclesPage = (filters: VehicleListFilters = {}) =>
  useQuery(vehiclesPageQueryOptions(filters));

export const fetchVehicle = async (
  id: string,
  signal?: AbortSignal,
): Promise<VehicleDetail> => {
  const { data } = await axiosInstance.get<unknown>(`/vehicles/${id}`, {
    signal,
  });
  return parseItemEnvelope<VehicleDetail>(data, 'vehicle');
};

export const vehicleDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: vehicleKeys.detail(id),
    queryFn: ({ signal }) => fetchVehicle(id, signal),
  });

export const useVehicle = (id: string) =>
  useQuery({ ...vehicleDetailQueryOptions(id), enabled: !!id });

const useVehicleMutation = <T>(
  mutationFn: (variables: T) => Promise<unknown>,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
};

export const useCreateVehicle = () =>
  useVehicleMutation(async (payload: CreateVehicleRequest) => {
    const { data } = await axiosInstance.post<unknown>('/vehicles', payload);
    return parseItemEnvelope<Vehicle>(data, 'vehicle');
  });

export const useUpdateVehicle = () =>
  useVehicleMutation(
    async ({ id, ...payload }: UpdateVehicleRequest & { id: string }) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/vehicles/${id}`,
        payload,
      );
      return parseItemEnvelope<VehicleDetail>(data, 'vehicle');
    },
  );

export const useAddVehicleDocument = () =>
  useVehicleMutation(
    async ({
      id,
      ...payload
    }: UpsertVehicleDocumentRequest & { id: string }) => {
      const { data } = await axiosInstance.post<unknown>(
        `/vehicles/${id}/documents`,
        payload,
      );
      return parseItemEnvelope<VehicleDetail>(data, 'vehicle');
    },
  );

export const useUpdateVehicleDocument = () =>
  useVehicleMutation(
    async ({
      id,
      documentId,
      ...payload
    }: Partial<UpsertVehicleDocumentRequest> & {
      id: string;
      documentId: string;
    }) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/vehicles/${id}/documents/${documentId}`,
        payload,
      );
      return parseItemEnvelope<VehicleDetail>(data, 'vehicle');
    },
  );

export const useAddVehicleMaintenance = () =>
  useVehicleMutation(
    async ({
      id,
      ...payload
    }: UpsertVehicleMaintenanceRequest & { id: string }) => {
      const { data } = await axiosInstance.post<unknown>(
        `/vehicles/${id}/maintenance`,
        payload,
      );
      return parseItemEnvelope<VehicleDetail>(data, 'vehicle');
    },
  );

export const useUpdateVehicleMaintenance = () =>
  useVehicleMutation(
    async ({
      id,
      maintenanceId,
      ...payload
    }: Partial<UpsertVehicleMaintenanceRequest> & {
      id: string;
      maintenanceId: string;
    }) => {
      const { data } = await axiosInstance.patch<unknown>(
        `/vehicles/${id}/maintenance/${maintenanceId}`,
        payload,
      );
      return parseItemEnvelope<VehicleDetail>(data, 'vehicle');
    },
  );

export const useTransferVehicle = () =>
  useVehicleMutation(
    async ({ id, ...payload }: TransferVehicleRequest & { id: string }) => {
      const { data } = await axiosInstance.post<unknown>(
        `/vehicles/${id}/transfer`,
        payload,
      );
      return parseItemEnvelope<VehicleDetail>(data, 'vehicle');
    },
  );
