// CR-028: Log only the error name and code. Prisma error messages can contain the query with
// its values (here: the test e-mail, personal data), so the message itself must never be logged.
export function safeErrorLabel(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code
    return typeof code === 'string' ? `${err.name} ${code}` : err.name
  }
  return 'UnknownError'
}
