const LINK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function parseStartPayload(
  messageText: string | undefined,
): string | null {
  if (!messageText) return null;

  const match = messageText
    .trim()
    .match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+([^\s]+))?$/);
  const payload = match?.[1];

  return payload && LINK_TOKEN_PATTERN.test(payload) ? payload : null;
}
