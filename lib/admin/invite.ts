/**
 * Shared normalization for bulk invitations.
 * Keeping this deterministic makes the UI and API agree on duplicate handling.
 */
export function parseInviteEmails(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  )
}
