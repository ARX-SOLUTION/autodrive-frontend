import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Branch } from '@/types/branch';
import type {
  VehicleDetail,
  VehicleDocument,
  VehicleMaintenance,
} from '@/types/vehicle';
import {
  useAddVehicleDocument,
  useUpdateVehicleDocument,
  useAddVehicleMaintenance,
  useUpdateVehicleMaintenance,
  useTransferVehicle,
} from '@/services/vehicleService';
import { extractErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { DateTimePicker } from '@/components/ui/date-time-picker';
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

interface Props {
  kind:
    | 'document'
    | 'editDocument'
    | 'maintenance'
    | 'editMaintenance'
    | 'transfer';
  vehicle: VehicleDetail;
  branches: Branch[];
  document?: VehicleDocument;
  maintenance?: VehicleMaintenance;
}

const makeSchema = (kind: Props['kind'], required: string) =>
  z
    .object({
      type: z.enum([
        'registration',
        'insurance',
        'technical_inspection',
        'other',
      ]),
      label: z.string().trim(),
      reference: z.string().trim(),
      expiresOn: z.string(),
      description: z.string().trim(),
      startedAt: z.string(),
      completedAt: z.string(),
      nextDueOn: z.string(),
      nextDueOdometerKm: z.string(),
      toBranchId: z.string(),
      reason: z.string().trim(),
    })
    .superRefine((value, context) => {
      const issue = (path: string) =>
        context.addIssue({ code: 'custom', path: [path], message: required });
      if (kind === 'document' || kind === 'editDocument') {
        if (!value.label) issue('label');
        if (
          (value.type === 'insurance' ||
            value.type === 'technical_inspection') &&
          !value.expiresOn
        )
          issue('expiresOn');
      }
      if (kind === 'maintenance' || kind === 'editMaintenance') {
        if (!value.description) issue('description');
        if (!value.startedAt) issue('startedAt');
        if (
          value.completedAt &&
          value.startedAt &&
          new Date(value.completedAt) < new Date(value.startedAt)
        )
          issue('completedAt');
        if (
          value.nextDueOdometerKm &&
          (!Number.isInteger(Number(value.nextDueOdometerKm)) ||
            Number(value.nextDueOdometerKm) < 0)
        )
          issue('nextDueOdometerKm');
      }
      if (kind === 'transfer') {
        if (!value.toBranchId) issue('toBranchId');
        if (!value.reason) issue('reason');
      }
    });

type Values = z.infer<ReturnType<typeof makeSchema>>;
const emptyValues = (): Values => ({
  type: 'registration',
  label: '',
  reference: '',
  expiresOn: '',
  description: '',
  startedAt: new Date().toISOString(),
  completedAt: '',
  nextDueOn: '',
  nextDueOdometerKm: '',
  toBranchId: '',
  reason: '',
});

const VehicleOperations = ({
  kind,
  vehicle,
  branches,
  document,
  maintenance,
}: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const addDocument = useAddVehicleDocument();
  const updateDocument = useUpdateVehicleDocument();
  const addMaintenance = useAddVehicleMaintenance();
  const updateMaintenance = useUpdateVehicleMaintenance();
  const transfer = useTransferVehicle();
  const pending =
    addDocument.isPending ||
    updateDocument.isPending ||
    addMaintenance.isPending ||
    updateMaintenance.isPending ||
    transfer.isPending;
  const form = useForm<Values>({
    resolver: zodResolver(makeSchema(kind, t('common.required'))),
    defaultValues: emptyValues(),
  });
  const isDocument = kind === 'document' || kind === 'editDocument';
  const isMaintenance = kind === 'maintenance' || kind === 'editMaintenance';
  const labelKey =
    kind === 'document'
      ? 'vehicles.add_document'
      : kind === 'editDocument'
        ? 'vehicles.edit_document'
        : kind === 'maintenance'
          ? 'vehicles.add_maintenance'
          : kind === 'editMaintenance'
            ? 'vehicles.edit_maintenance'
            : 'vehicles.transfer';

  useEffect(() => {
    if (!open) return;
    form.reset({
      ...emptyValues(),
      ...(document && {
        type: document.type,
        label: document.label,
        reference: document.reference ?? '',
        expiresOn: document.expires_on ?? '',
      }),
      ...(maintenance && {
        description: maintenance.description,
        startedAt: maintenance.started_at,
        completedAt: maintenance.completed_at ?? '',
        nextDueOn: maintenance.next_due_on ?? '',
        nextDueOdometerKm: String(maintenance.next_due_odometer_km ?? ''),
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, document, maintenance]);

  const { attemptClose, confirmOpen, confirmDiscard, cancelDiscard } =
    useConfirmedClose(form.formState.isDirty || pending, () => setOpen(false));
  const callbacks = {
    onSuccess: () => {
      toast.success(
        t(kind === 'transfer' ? 'vehicles.transferred' : 'vehicles.saved'),
      );
      setOpen(false);
    },
    onError: (error: Error) =>
      toast.error(extractErrorMessage(error, t('common.error'))),
  };
  const submit = (value: Values) => {
    if (isDocument) {
      const payload = {
        type: value.type,
        label: value.label,
        reference: value.reference || undefined,
        expires_on: value.expiresOn || null,
      };
      if (document)
        updateDocument.mutate(
          { id: vehicle.id, documentId: document.id, ...payload },
          callbacks,
        );
      else addDocument.mutate({ id: vehicle.id, ...payload }, callbacks);
    } else if (isMaintenance) {
      const payload = {
        description: value.description,
        started_at: value.startedAt,
        completed_at: value.completedAt || undefined,
        next_due_on: value.nextDueOn || undefined,
        next_due_odometer_km: value.nextDueOdometerKm
          ? Number(value.nextDueOdometerKm)
          : undefined,
      };
      if (maintenance)
        updateMaintenance.mutate(
          { id: vehicle.id, maintenanceId: maintenance.id, ...payload },
          callbacks,
        );
      else addMaintenance.mutate({ id: vehicle.id, ...payload }, callbacks);
    } else
      transfer.mutate(
        {
          id: vehicle.id,
          to_branch_id: value.toBranchId,
          reason: value.reason,
        },
        callbacks,
      );
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={
          kind === 'transfer' &&
          branches.every((branch) => branch.id === vehicle.branch_id)
        }
      >
        {t(
          kind === 'editDocument' || kind === 'editMaintenance'
            ? 'common.edit'
            : labelKey,
        )}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !next && attemptClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t(labelKey)}</DialogTitle>
            <DialogDescription>
              {t(
                isDocument
                  ? 'vehicles.document_form_desc'
                  : isMaintenance
                    ? 'vehicles.maintenance_form_desc'
                    : 'vehicles.transfer_desc',
              )}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
              {isDocument && (
                <>
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          {t('vehicles.document_type')}
                        </FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(
                              [
                                'registration',
                                'insurance',
                                'technical_inspection',
                                'other',
                              ] as const
                            ).map((type) => (
                              <SelectItem key={type} value={type}>
                                {t(`vehicles.document_types.${type}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          {t('vehicles.document_label')}
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
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vehicles.reference')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expiresOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vehicles.expires_on')}</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value || undefined}
                            onChange={(value) => field.onChange(value ?? '')}
                            onBlur={field.onBlur}
                            name={field.name}
                            clearable
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {isMaintenance && (
                <>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          {t('vehicles.description')}
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
                    name="startedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          {t('vehicles.started_at')}
                        </FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={(value) => field.onChange(value ?? '')}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="completedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vehicles.completed_at')}</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value || undefined}
                            onChange={(value) => field.onChange(value ?? '')}
                            onBlur={field.onBlur}
                            name={field.name}
                            clearable
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextDueOn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vehicles.next_due_on')}</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value || undefined}
                            onChange={(value) => field.onChange(value ?? '')}
                            onBlur={field.onBlur}
                            name={field.name}
                            clearable
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nextDueOdometerKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('vehicles.next_due_odometer')}</FormLabel>
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
                </>
              )}
              {kind === 'transfer' && (
                <>
                  <FormField
                    control={form.control}
                    name="toBranchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>
                          {t('vehicles.to_branch')}
                        </FormLabel>
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
                            {branches
                              .filter(
                                (branch) => branch.id !== vehicle.branch_id,
                              )
                              .map((branch) => (
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
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>{t('vehicles.reason')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={attemptClose}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={pending}>
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
        confirmLabel={t('common.discard')}
      />
    </>
  );
};

export default VehicleOperations;
