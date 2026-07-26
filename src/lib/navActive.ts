/**
 * Callers: Sidebar (desktop rail + mobile sheet).
 * API: isNavActive(pathname, itemPath) → boolean.
 * Schema: none. Nested CRM routes (/groups/:id, /students/:id, …).
 * User: "sub modulega kirganimda qaysi menu ni select qilganim ko'rinmayapti".
 */

/** True when pathname is the nav item or a nested detail under it. */
export function isNavActive(pathname: string, itemPath: string): boolean {
  if (pathname === itemPath) return true;
  // Trailing slash boundary: /students must not match /students-x.
  return pathname.startsWith(`${itemPath}/`);
}
