/**
 * Errors the service layer throws. They carry no HTTP knowledge; `withErrors`
 * in `http.ts` owns the mapping from these to status codes.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
