import { describe, expect, it } from 'vitest';
import { buildLearnerInvitationUrl } from '@/pages/students/studentPortalInvitationUrl';

describe('student portal invitation URL', () => {
  it('keeps the token in a fragment so HTTP requests never transmit it', () => {
    const link = buildLearnerInvitationUrl(
      'abc_-123',
      'https://student.automaktab.uz',
    );
    const url = new URL(link);
    expect(url.pathname).toBe('/accept-invitation');
    expect(url.search).toBe('');
    expect(url.hash).toBe('#token=abc_-123');
  });
});
