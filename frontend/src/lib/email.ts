const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Finds every email address in any text: CSV, TXT, pasted lists, anything */
export function extractEmails(text: string): string[] {
  return [...new Set((text.match(EMAIL_REGEX) ?? []).map((e) => e.toLowerCase()))];
}

export function mergeEmails(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])];
}