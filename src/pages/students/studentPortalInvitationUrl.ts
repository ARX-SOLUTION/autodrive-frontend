export function buildLearnerInvitationUrl(
  token: string,
  portalUrl: string,
): string {
  const url = new URL('/accept-invitation', portalUrl);
  url.hash = `token=${encodeURIComponent(token)}`;
  return url.toString();
}
