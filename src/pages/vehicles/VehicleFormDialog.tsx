import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useCan } from '@/hooks/useCan';
import { useCreateVehicle, useUpdateVehicle } from '@/services/vehicleService';
import { extractErrorMessage } from '@/lib/errors';
import type { Branch } from '@/types/branch';
import { VEHICLE_CATEGORIES, type Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirmedClose } from '@/hooks/useConfirmedClose';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const schema = (required: string) =>
  z.object({
    branchId: z.string().min(1, required),
    plateNumber: z.string().trim().min(1, required),
    vin: z.string().trim(),
    make: z.string().trim().min(1, required),
    model: z.string().trim().min(1, required),
    manufactureYear: z
      .string()
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
        required,
      ),
    odometerKm: z
      .string()
      .refine(
        (value) =>
          value === '' ||
          (Number.isInteger(Number(value)) && Number(value) >= 0),
        required,
      ),
    categories: z.array(z.enum(VEHICLE_CATEGORIES)).min(1, required),
    status: z.enum(['active', 'out_of_service', 'retired']),
  });

type Values = z.infer<ReturnType<typeof schema>>;

interface Props {
  open: boolean;
  vehicle: Vehicle | null;
  branches: Branch[];
  defaultBranchId?: string;
  onClose: () => void;
}

const VehicleFormDialog = ({
  open,
  vehicle,
  branches,
  defaultBranchId,
  onClose,
}: Props) => {
  const { t } = useTranslation();
  const canViewAllBranches = useCan('viewAllBranches');
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const form = useForm<Values>({
    resolver: zodResolver(schema(t('common.required'))),
    defaultValues: {
      branchId: defaultBranchId ?? '',
      plateNumber: '',
      vin: '',
      make: '',
      model: '',
      manufactureYear: '',
      odometerKm: '',
      categories: [],
      status: 'active',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      vehicle
        ? {
            branchId: vehicle.branch_id,
            plateNumber: vehicle.plate_number,
            vin: vehicle.vin ?? '',
            make: vehicle.make,
            model: vehicle.model,
            manufactureYear: String(vehicle.manufacture_year),
            odometerKm: String(vehicle.odometer_km),
            categories: vehicle.categories,
            status: vehicle.status,
          }
        : {
            branchId: defaultBranchId ?? '',
            plateNumber: '',
            vin: '',
            make: '',
            model: '',
            manufactureYear: '',
            odometerKm: '',
            categories: [],
            status: 'active',
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle, defaultBranchId]);

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(
      form.formState.isDirty || create.isPending || update.isPending,
      onClose,
    );

  const submit = (values: Values) => {
    const payload = {
      plate_number: values.plateNumber,
      vin: values.vin || undefined,
      make: values.make,
      model: values.model,
      manufacture_year: Number(values.manufactureYear),
      categories: values.categories,
      odometer_km:
        values.odometerKm === '' ? undefined : Number(values.odometerKm),
    };
    const handlers = {
      onSuccess: () => {
        toast.success(t(vehicle ? 'vehicles.updated' : 'vehicles.created'));
        onClose();
      },
      onError: (error: Error) =>
        toast.error(extractErrorMessage(error, t('common.error'))),
    };
    if (vehicle)
      update.mutate(
        {
          id: vehicle.id,
          ...payload,
          ...(vehicle.status === 'retired' ? {} : { status: values.status }),
        },
        handlers,
      );
    else create.mutate({ ...payload, branch_id: values.branchId }, handlers);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && attemptClose()}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t(vehicle ? 'vehicles.edit' : 'vehicles.add')}
            </DialogTitle>
            <DialogDescription>{t('vehicles.form_desc')}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              {!vehicle && canViewAllBranches && (
                <FormField
                  control={form.control}
                  name="branchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t('common.branch')}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('common.select_placeholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="plateNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>
                        {t('vehicles.plate_number')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vehicles.vin')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t('vehicles.make')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t('vehicles.model')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="manufactureYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t('vehicles.year')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1886"
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="odometerKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('vehicles.odometer')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t('vehicles.categories')}</FormLabel>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {VEHICLE_CATEGORIES.map((category) => (
                        <label
                          key={category}
                          className="flex items-center gap-2 rounded-md border p-2 text-sm"
                        >
                          <Checkbox
                            checked={field.value.includes(category)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked
                                  ? [...field.value, category]
                                  : field.value.filter(
                                      (value) => value !== category,
                                    ),
                              )
                            }
                          />
                          <span>
                            {t(`vehicles.categories_list.${category}`)}
                          </span>
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {vehicle && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.status')}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={vehicle.status === 'retired'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">
                            {t('vehicles.status.active')}
                          </SelectItem>
                          <SelectItem value="out_of_service">
                            {t('vehicles.status.out_of_service')}
                          </SelectItem>
                          <SelectItem value="retired">
                            {t('vehicles.status.retired')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={attemptClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                >
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title={t('common.discard_changes_title')}
        description={t('common.discard_changes_desc')}
      />
    </>
  );
};

export default VehicleFormDialog;
