export const VEHICLE_CATEGORIES = [
  'A1',
  'A',
  'B',
  'C',
  'D',
  'BE',
  'CE',
  'DE',
  'TRAM',
  'TROLLEYBUS',
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];
export type VehicleStatus = 'active' | 'out_of_service' | 'retired';
export type VehicleDocumentType =
  'registration' | 'insurance' | 'technical_inspection' | 'other';

export interface Vehicle {
  id: string;
  company_id: string;
  branch_id: string;
  plate_number: string;
  vin: string | null;
  make: string;
  model: string;
  manufacture_year: number;
  categories: VehicleCategory[];
  odometer_km: number;
  status: VehicleStatus;
  available_for_booking: boolean;
  unavailable_reasons: string[];
  created_at: string;
  updated_at: string;
}

export interface VehicleDocument {
  id: string;
  type: VehicleDocumentType;
  label: string;
  reference: string | null;
  expires_on: string | null;
  created_at: string;
}

export interface VehicleMaintenance {
  id: string;
  description: string;
  started_at: string;
  completed_at: string | null;
  next_due_on: string | null;
  next_due_odometer_km: number | null;
  created_at: string;
}

export interface VehicleTransfer {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  reason: string;
  transferred_by_id: string;
  transferred_at: string;
}

export interface VehicleDetail extends Vehicle {
  documents: VehicleDocument[];
  maintenance: VehicleMaintenance[];
  transfers: VehicleTransfer[];
}

export interface VehicleListFilters {
  branchId?: string;
  search?: string;
  status?: VehicleStatus;
  category?: VehicleCategory;
  page?: number;
  limit?: number;
}

export interface CreateVehicleRequest {
  branch_id?: string;
  plate_number: string;
  vin?: string;
  make: string;
  model: string;
  manufacture_year: number;
  categories: VehicleCategory[];
  odometer_km?: number;
}

export type UpdateVehicleRequest = Partial<CreateVehicleRequest> & {
  status?: VehicleStatus;
};

export interface UpsertVehicleDocumentRequest {
  type: VehicleDocumentType;
  label: string;
  expires_on?: string | null;
  reference?: string;
}

export interface UpsertVehicleMaintenanceRequest {
  description: string;
  started_at: string;
  completed_at?: string;
  next_due_on?: string;
  next_due_odometer_km?: number;
}

export interface TransferVehicleRequest {
  to_branch_id: string;
  reason: string;
}
