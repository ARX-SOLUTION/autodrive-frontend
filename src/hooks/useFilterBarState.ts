import { useState, useCallback, useMemo } from 'react';

export interface ActiveFilterChipItem {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface UseFilterBarStateOptions {
  /**
   * Array of active filter chips. Falsy items or items without a valid value
   * are automatically filtered out.
   */
  filters?: (ActiveFilterChipItem | null | undefined | false)[];
  /**
   * Handler when clearing all filters.
   */
  onClearAll?: () => void;
  /**
   * Initial open state for mobile filter sheet.
   */
  initialMobileOpen?: boolean;
}

export interface UseFilterBarStateReturn {
  /** Active filter chips with valid non-empty values */
  chips: ActiveFilterChipItem[];
  /** Count of active filter chips */
  activeCount: number;
  /** True if there is at least one active filter */
  hasActiveFilters: boolean;
  /** State of the mobile filter sheet */
  isMobileOpen: boolean;
  /** Set state of mobile filter sheet */
  setIsMobileOpen: (open: boolean) => void;
  /** Open mobile filter sheet */
  openMobile: () => void;
  /** Close mobile filter sheet */
  closeMobile: () => void;
  /** Clear all active filters */
  clearAll: () => void;
  /** Remove a specific filter by ID */
  removeFilter: (id: string) => void;
}

/**
 * Shared hook to manage filter bar state, active chips, and mobile sheet visibility.
 */
export function useFilterBarState(
  options: UseFilterBarStateOptions = {},
): UseFilterBarStateReturn {
  const { filters = [], onClearAll, initialMobileOpen = false } = options;

  const [isMobileOpen, setIsMobileOpen] = useState(initialMobileOpen);

  const chips = useMemo<ActiveFilterChipItem[]>(() => {
    return (filters.filter(Boolean) as ActiveFilterChipItem[]).filter(
      (chip) => chip && chip.value !== '' && chip.value !== undefined,
    );
  }, [filters]);

  const activeCount = chips.length;
  const hasActiveFilters = activeCount > 0;

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  const clearAll = useCallback(() => {
    onClearAll?.();
  }, [onClearAll]);

  const removeFilter = useCallback(
    (id: string) => {
      const chip = chips.find((c) => c.id === id);
      chip?.onRemove();
    },
    [chips],
  );

  return {
    chips,
    activeCount,
    hasActiveFilters,
    isMobileOpen,
    setIsMobileOpen,
    openMobile,
    closeMobile,
    clearAll,
    removeFilter,
  };
}

export default useFilterBarState;
