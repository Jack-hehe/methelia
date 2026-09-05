export function sameOrigin(
  origin: string,
  host: string | null,
  protocol: string,
): boolean {
  if (!host) return false;
  try {
    return new URL(origin).origin === new URL(`${protocol}//${host}`).origin;
  } catch {
    return false;
  }
}
