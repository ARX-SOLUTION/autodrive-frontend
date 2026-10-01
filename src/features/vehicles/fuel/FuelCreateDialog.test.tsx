import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FuelCreateDialog from './FuelCreateDialog';

const { lookupState, authState, vehiclesState } = vi.hoisted(() => ({
  lookupState: {
    shouldFail: false,
    rateLimited: false,
    serverErrorMessage: '',
    manualReview: false,
    decodeFails: false,
  },
  authState: { user: null as { id: string; role: string } | null },
  vehiclesState: {
    data: [
      {
        id: 'v-1',
        plate_number: '01A777AA',
        model: 'Lacetti',
        fuel_types: ['petrol'],
        current_custodian_id: 'u-9' as string | null,
      },
    ],
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: unknown }) => unknown) =>
    selector({ user: authState.user }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.current) return `${key}:${options.current}`;
      return key;
    },
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('./policy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./policy')>();
  return {
    ...actual,
    decodeReceipt: vi.fn().mockImplementation(async () => {
      if (lookupState.decodeFails) return null;
      return 'https://ofd.soliq.uz/check?t=A&r=1&c=20260924101705&s=123456789012';
    }),
  };
});

const submitFuelComplete = vi.fn().mockResolvedValue({ id: 'saved-id' });

vi.mock('./service', () => {
  return {
    useFuelVehicles: vi
      .fn()
      .mockImplementation(() => ({ data: vehiclesState })),
    useStations: vi.fn().mockReturnValue({
      data: {
        data: [
          {
            id: 's-1',
            name: 'QK MCHJ TATNEFT-UNG',
            stir: '306721371',
          },
        ],
      },
    }),
    useVehicleLastFuel: vi.fn().mockReturnValue({
      data: { odometer_km: 50000 },
    }),
    lookupReceipt: vi.fn().mockImplementation(async () => {
      if (lookupState.shouldFail) {
        throw new Error('500 internal server error');
      }
      if (lookupState.rateLimited) {
        const err = Object.assign(new Error('Too many requests'), {
          response: { status: 429 },
        });
        throw err;
      }
      if (lookupState.serverErrorMessage) {
        const err = Object.assign(new Error('Backend failed'), {
          response: {
            status: 422,
            data: {
              error: {
                code: 'RECEIPT_MISMATCH',
                message: lookupState.serverErrorMessage,
              },
            },
          },
        });
        throw err;
      }
      return {
        status: lookupState.manualReview ? 'manual_review' : 'source_verified',
        seller_name: 'QK MCHJ TATNEFT-UNG',
        seller_tin: '306721371',
        total: '1100100.00',
        lines: [
          {
            index: 0,
            name: 'TPK-4 AI-95-K5 TAHEKO',
            mxik: '02710001007000000',
            quantity: '56.42',
            unit_price: '19500.00',
            line_total: '1100100.00',
          },
        ],
      };
    }),
    submitFuelComplete: (...args: unknown[]) => submitFuelComplete(...args),
    saveFuel: vi.fn().mockResolvedValue({ id: 'draft-id' }),
  };
});

describe('FuelCreateDialog component', () => {
  beforeEach(() => {
    lookupState.shouldFail = false;
    lookupState.rateLimited = false;
    lookupState.serverErrorMessage = '';
    lookupState.manualReview = false;
    lookupState.decodeFails = false;
    submitFuelComplete.mockClear();
    authState.user = null;
    vehiclesState.data = [
      {
        id: 'v-1',
        plate_number: '01A777AA',
        model: 'Lacetti',
        fuel_types: ['petrol'],
        current_custodian_id: 'u-9',
      },
    ];
  });

  const goToStep2 = () => {
    // In Step 1, auto-selected vehicle allows clicking continue
    const continueBtn = screen.getByRole('button', {
      name: /common.continue/i,
    });
    fireEvent.click(continueBtn);
  };

  it('preserves a selected vehicle when discard is cancelled and resets only after confirmation', async () => {
    vehiclesState.data.push({
      id: 'v-2',
      plate_number: '01B111BB',
      model: 'Nexia',
      fuel_types: ['petrol'],
      current_custodian_id: null,
    });
    const onOpenChange = vi.fn();
    render(<FuelCreateDialog open={true} onOpenChange={onOpenChange} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'v-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(onOpenChange).not.toHaveBeenCalled();
    const confirmation = screen.getByRole('dialog', {
      name: 'common.discard_changes_title',
    });
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'common.cancel' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText('common.discard_changes_title'),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('combobox')).toHaveValue('v-2');

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.discard' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('closes a pristine pre-bound vehicle without asking to discard', () => {
    const onOpenChange = vi.fn();
    render(
      <FuelCreateDialog
        open={true}
        initialVehicleId="v-1"
        onOpenChange={onOpenChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(
      screen.queryByText('common.discard_changes_title'),
    ).not.toBeInTheDocument();
  });

  it('preserves durable draft fields after backtracking and replacing a receipt with an oversized file', async () => {
    const onOpenChange = vi.fn();
    render(
      <FuelCreateDialog
        open={true}
        initialVehicleId="v-1"
        onOpenChange={onOpenChange}
      />,
    );
    goToStep2();
    const receipt = new File(['receipt'], 'receipt.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [receipt] },
    });
    await screen.findByText('QK MCHJ TATNEFT-UNG');
    fireEvent.click(screen.getByRole('button', { name: 'common.continue' }));
    fireEvent.change(screen.getByLabelText(/fuel.funding_source/), {
      target: { value: 'personal' },
    });
    fireEvent.change(screen.getByLabelText(/fuel.quantity/), {
      target: { value: '60' },
    });
    fireEvent.change(screen.getByLabelText(/fuel.date/), {
      target: { value: '2026-09-24T10:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.continue' }));
    fireEvent.change(screen.getByLabelText(/fuel.odometer_km/), {
      target: { value: '50250' },
    });
    const odometerPhoto = new File(['odometer'], 'odo.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(screen.getByLabelText(/fuel.odometer_photo_label/), {
      target: { files: [odometerPhoto] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    const oversizedReceipt = new File(
      [new Uint8Array(8 * 1024 * 1024 + 1)],
      'large.jpg',
      {
        type: 'image/jpeg',
      },
    );
    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [oversizedReceipt] },
    });
    expect(screen.getByText('fuel.qr_too_large')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.back' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(onOpenChange).not.toHaveBeenCalled();
    const confirmation = screen.getByRole('dialog', {
      name: 'common.discard_changes_title',
    });
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'common.cancel' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByText('common.discard_changes_title'),
      ).not.toBeInTheDocument(),
    );
    goToStep2();
    lookupState.decodeFails = true;
    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [receipt] },
    });
    await screen.findByText('fuel.qr_fallback');
    fireEvent.click(screen.getByRole('button', { name: 'common.continue' }));

    expect(screen.getByLabelText(/fuel.station/)).toHaveValue('s-1');
    expect(screen.getByLabelText(/fuel.funding_source/)).toHaveValue(
      'personal',
    );
    expect(screen.getByLabelText(/fuel.quantity/)).toHaveValue(60);
    expect(screen.getByLabelText(/fuel.date/)).toHaveValue('2026-09-24T10:30');
    fireEvent.click(screen.getByRole('button', { name: 'common.continue' }));
    expect(screen.getByLabelText(/fuel.odometer_km/)).toHaveValue(50250);
    expect(screen.getByRole('button', { name: 'odo.jpg' })).toBeInTheDocument();
  });

  it('pre-binds the vehicle passed via initialVehicleId', () => {
    vehiclesState.data = [
      {
        id: 'v-1',
        plate_number: '01A777AA',
        model: 'Lacetti',
        fuel_types: ['petrol'],
        current_custodian_id: 'u-9',
      },
      {
        id: 'v-2',
        plate_number: '01B111BB',
        model: 'Nexia',
        fuel_types: ['petrol'],
        current_custodian_id: null,
      },
    ];
    render(
      <FuelCreateDialog
        open={true}
        onOpenChange={vi.fn()}
        initialVehicleId="v-2"
      />,
    );

    expect(screen.getByRole('combobox')).toHaveValue('v-2');
  });

  it('auto-selects the teacher own custodian vehicle when several vehicles exist', () => {
    authState.user = { id: 'u-9', role: 'teacher' };
    vehiclesState.data = [
      {
        id: 'v-1',
        plate_number: '01A777AA',
        model: 'Lacetti',
        fuel_types: ['petrol'],
        current_custodian_id: 'u-9',
      },
      {
        id: 'v-2',
        plate_number: '01B111BB',
        model: 'Nexia',
        fuel_types: ['petrol'],
        current_custodian_id: 'u-4',
      },
    ];
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByRole('combobox')).toHaveValue('v-1');
  });

  it('leaves the vehicle unselected when a teacher owns none of them', () => {
    authState.user = { id: 'u-4', role: 'teacher' };
    vehiclesState.data = [
      {
        id: 'v-1',
        plate_number: '01A777AA',
        model: 'Lacetti',
        fuel_types: ['petrol'],
        current_custodian_id: 'u-9',
      },
      {
        id: 'v-2',
        plate_number: '01B111BB',
        model: 'Nexia',
        fuel_types: ['petrol'],
        current_custodian_id: 'u-8',
      },
    ];
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('renders Step 1 (Vehicle selection) with auto-selected vehicle and progress bar', () => {
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'fuel.step_vehicle' }),
    ).toBeInTheDocument();
    expect(screen.getByText('fuel.select_vehicle_prompt')).toBeInTheDocument();
    expect(screen.getAllByText(/01A777AA/).length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('scans receipt file, runs lookup and shows Soliq verified station in Step 2', async () => {
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    goToStep2();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'fuel.step_receipt_upload',
      }),
    ).toBeInTheDocument();
    const receiptInput = screen.getByLabelText('fuel.scan_receipt_btn');
    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(receiptInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.getByText('QK MCHJ TATNEFT-UNG')).toBeInTheDocument();
    });

    expect(screen.getByText('STIR: 306721371')).toBeInTheDocument();
  });

  it('distinguishes a Soliq lookup failure from an unreadable QR in Step 2', async () => {
    lookupState.shouldFail = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    goToStep2();

    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('fuel.qr_lookup_error')).toBeInTheDocument();
    });
    expect(screen.queryByText('fuel.qr_fallback')).not.toBeInTheDocument();
  });

  it('shows a rate-limit message instead of blaming the QR when throttled', async () => {
    lookupState.rateLimited = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    goToStep2();

    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    expect(await screen.findByText('fuel.qr_rate_limited')).toBeInTheDocument();
    expect(screen.queryByText('fuel.qr_lookup_error')).not.toBeInTheDocument();
  });

  it('surfaces the real backend error instead of the generic QR message', async () => {
    lookupState.serverErrorMessage =
      'Fiscal receipt time differs from refueling date';
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    goToStep2();

    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    expect(
      await screen.findByText(
        'Fiscal receipt time differs from refueling date',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('fuel.qr_lookup_error')).not.toBeInTheDocument();
  });

  it('keeps manual QR recovery available when image decoding fails', async () => {
    lookupState.decodeFails = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    goToStep2();

    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    expect(await screen.findByText('fuel.qr_fallback')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fuel.qr_url' }));
    expect(screen.getByLabelText('fuel.qr_url')).toBeInTheDocument();
  });

  it('looks up a manually entered fiscal QR URL', async () => {
    lookupState.decodeFails = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    goToStep2();

    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'fuel.qr_url' }));
    const qrInput = screen.getByLabelText('fuel.qr_url');
    fireEvent.change(qrInput, {
      target: {
        value:
          'https://ofd.soliq.uz/check?t=A&r=1&c=20260924101705&s=123456789012',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'fuel.lookup' }));

    expect(await screen.findByText('QK MCHJ TATNEFT-UNG')).toBeInTheDocument();
  });

  it('explains when the receipt image exceeds the size limit', async () => {
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    goToStep2();

    const oversizedFile = new File(
      [new Uint8Array(8 * 1024 * 1024 + 1)],
      'large-receipt.jpg',
      { type: 'image/jpeg' },
    );

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [oversizedFile] },
    });

    expect(await screen.findByText('fuel.qr_too_large')).toBeInTheDocument();
  });

  it('completes the full 5-step flow from vehicle to review and submits', async () => {
    const onOpenChange = vi.fn();
    render(<FuelCreateDialog open={true} onOpenChange={onOpenChange} />);

    // Step 1: Vehicle selection
    expect(
      screen.getByRole('heading', { level: 2, name: 'fuel.step_vehicle' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /common.continue/i }));

    // Step 2: Receipt upload
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'fuel.step_receipt_upload',
      }),
    ).toBeInTheDocument();
    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('QK MCHJ TATNEFT-UNG')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /common.continue/i }));

    // Step 3: Receipt details & lines
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'fuel.step_receipt_details',
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /common.continue/i }));

    // Step 4: Odometer
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'fuel.step_odometer',
      }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/fuel.odometer_km/i), {
      target: { value: '50250' },
    });
    const odoFile = new File(['odometer file content'], 'odo.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(screen.getByLabelText(/fuel.odometer_photo_label/i), {
      target: { files: [odoFile] },
    });
    fireEvent.click(screen.getByRole('button', { name: /common.continue/i }));

    // Step 5: Full review
    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'fuel.step_review',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'fuel.submit_for_review' }),
    ).toBeEnabled();

    // Submit
    fireEvent.click(
      screen.getByRole('button', { name: 'fuel.submit_for_review' }),
    );

    await waitFor(() => {
      expect(submitFuelComplete).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
