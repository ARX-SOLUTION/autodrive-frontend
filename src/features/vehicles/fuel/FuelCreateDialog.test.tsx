import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FuelCreateDialog from './FuelCreateDialog';

const lookupState = vi.hoisted(() => ({
  shouldFail: false,
  decodeFails: false,
  rateLimited: false,
  serverErrorMessage: '' as string,
  manualReview: false,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      if (Array.isArray(queryKey) && queryKey.includes('vehicles')) {
        return {
          data: {
            data: [
              {
                id: 'v1',
                plate_number: '01 A 777 AA',
                branch_id: 'b1',
                fuel_types: ['petrol'],
              },
            ],
          },
        };
      }
      if (Array.isArray(queryKey) && queryKey.includes('fuel-stations')) {
        return {
          data: {
            data: [{ id: 's1', name: 'Tatneft Qoratosh', stir: '306721371' }],
          },
        };
      }
      if (Array.isArray(queryKey) && queryKey.includes('last-by-vehicle')) {
        return {
          data: {
            odometer_km: 50000,
          },
        };
      }
      return { data: null };
    },
    useMutation: () => ({ isPending: false, mutate: vi.fn() }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('./policy', async () => {
  const actual = await vi.importActual('./policy');
  return {
    ...actual,
    decodeReceipt: vi
      .fn()
      .mockImplementation(async () =>
        lookupState.decodeFails
          ? null
          : 'https://ofd.soliq.uz/check?t=A&r=1&c=20260924101705&s=123456789012',
      ),
  };
});

vi.mock('./service', async () => {
  const actual = await vi.importActual('./service');
  return {
    ...actual,
    lookupReceipt: vi.fn().mockImplementation(async () => {
      if (lookupState.rateLimited) {
        const err = new Error('Too Many Requests') as Error & {
          response?: { status: number };
        };
        err.response = { status: 429 };
        throw err;
      }
      if (lookupState.serverErrorMessage) {
        const err = new Error('Request failed') as Error & {
          response?: { status: number; data: { error: { message: string } } };
        };
        err.response = {
          status: 500,
          data: { error: { message: lookupState.serverErrorMessage } },
        };
        throw err;
      }
      if (lookupState.shouldFail) throw new Error('Soliq service unavailable');
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
    submitFuelComplete: vi.fn().mockResolvedValue({ id: 'saved-id' }),
  };
});

describe('FuelCreateDialog component', () => {
  it('renders guidance banner and receipt upload options when open', () => {
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText('fuel.scan_guidance_title')).toBeInTheDocument();
    expect(screen.getByText('fuel.scan_guidance_desc')).toBeInTheDocument();
    expect(screen.getByText('fuel.scan_receipt_btn')).toBeInTheDocument();
    expect(screen.getByText('fuel.step_progress')).toBeInTheDocument();
    expect(
      screen.queryByText('fuel.odometer_photo_label *'),
    ).not.toBeInTheDocument();
  });

  it('scans receipt file, runs lookup and locks Soliq fuel data', async () => {
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);

    const receiptInput = screen.getByLabelText('fuel.scan_receipt_btn');
    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(receiptInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(screen.getByText('QK MCHJ TATNEFT-UNG')).toBeInTheDocument();
    });

    expect(screen.getByText('STIR: 306721371')).toBeInTheDocument();
    expect(screen.getByText('TPK-4 AI-95-K5 TAHEKO')).toBeInTheDocument();
  });

  it('distinguishes a Soliq lookup failure from an unreadable QR', async () => {
    lookupState.shouldFail = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
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
    lookupState.shouldFail = false;
  });

  it('shows a rate-limit message instead of blaming the QR when throttled', async () => {
    lookupState.rateLimited = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    expect(await screen.findByText('fuel.qr_rate_limited')).toBeInTheDocument();
    expect(screen.queryByText('fuel.qr_lookup_error')).not.toBeInTheDocument();
    lookupState.rateLimited = false;
  });

  it('surfaces the real backend error instead of the generic QR message', async () => {
    lookupState.serverErrorMessage =
      'Fiscal receipt time differs from refueling date';
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
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
    lookupState.serverErrorMessage = '';
  });

  it('does not claim manual-review data is Soliq-locked', async () => {
    lookupState.manualReview = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('fuel.manual_review')).toBeInTheDocument();
    });

    // The "confirmed and locked by Soliq" hint must not appear alongside a
    // badge that says the source is unverified — that's contradictory.
    expect(
      screen.queryByText(/fuel.soliq_locked_hint/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('fuel.manual_review_data_hint'),
    ).toBeInTheDocument();
    lookupState.manualReview = false;
  });

  it('keeps manual QR recovery available when image decoding fails', async () => {
    lookupState.decodeFails = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    expect(await screen.findByText('fuel.qr_fallback')).toBeInTheDocument();
    expect(screen.getByLabelText('fuel.qr_url')).toBeInTheDocument();
    lookupState.decodeFails = false;
  });

  it('looks up a manually entered fiscal QR URL', async () => {
    lookupState.decodeFails = true;
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    const qrInput = await screen.findByLabelText('fuel.qr_url');
    fireEvent.change(qrInput, {
      target: {
        value:
          'https://ofd.soliq.uz/check?t=A&r=1&c=20260924101705&s=123456789012',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'fuel.lookup' }));

    expect(await screen.findByText('QK MCHJ TATNEFT-UNG')).toBeInTheDocument();
    lookupState.decodeFails = false;
  });

  it('explains when the receipt image exceeds the size limit', async () => {
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
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

  it('shows the vehicle step only after a successful receipt lookup', async () => {
    render(<FuelCreateDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.queryByLabelText('fuel.vehicle')).not.toBeInTheDocument();

    const fakeFile = new File(['fake image content'], 'receipt.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(screen.getByLabelText('fuel.scan_receipt_btn'), {
      target: { files: [fakeFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('QK MCHJ TATNEFT-UNG')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.continue' }));
    expect(await screen.findByLabelText('fuel.vehicle')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'common.continue' }),
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText('fuel.odometer_km'), {
      target: { value: '51000' },
    });
    const odometerPhoto = new File(['fake image content'], 'odometer.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(screen.getByLabelText('fuel.odometer_photo_label'), {
      target: { files: [odometerPhoto] },
    });
    const continueButton = screen.getByRole('button', {
      name: 'common.continue',
    });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    expect(
      await screen.findByText('fuel.review_receipt_hint'),
    ).toBeInTheDocument();
  });
});
