import { format } from 'date-fns';

export const formatDate = (d: string) => {
  try {
    return format(new Date(d), 'dd.MM.yyyy');
  } catch {
    return d;
  }
};
