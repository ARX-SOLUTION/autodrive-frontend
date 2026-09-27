import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import axios from '@/api/axiosInstance';
import { Button } from '@/components/ui/button';
import { fuelTypes } from './policy';
import { useFuelMutation } from './service';
import { vehicleKeys } from '@/lib/queryKeys';
export default function FuelTypes({
  id,
  types,
}: {
  id: string;
  types: string[];
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(types);
  const qc = useQueryClient();
  const mutation = useFuelMutation(async () => {
    await axios.patch(`/vehicle-fuel/vehicles/${id}/types`, {
      fuel_types: selected,
    });
    await qc.invalidateQueries({ queryKey: vehicleKeys.all });
  });
  return (
    <section className="glass-card space-y-3 p-4">
      <h2>{t('fuel.allowed_types')}</h2>
      <div className="flex flex-wrap gap-4">
        {fuelTypes.map((type) => (
          <label key={type} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(type)}
              onChange={(e) =>
                setSelected((old) =>
                  e.target.checked
                    ? [...old, type]
                    : old.filter((v) => v !== type),
                )
              }
            />
            {t(`fuel.${type}`)}
          </label>
        ))}
      </div>
      <Button
        disabled={mutation.isPending || !selected.length}
        onClick={() => mutation.mutate(undefined)}
      >
        {t('common.save')}
      </Button>
    </section>
  );
}
