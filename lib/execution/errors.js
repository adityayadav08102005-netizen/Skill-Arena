/** Raised when no code runner is available or it fails; `status` becomes the HTTP status. */
export class ExecutionUnavailableError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.status = status;
  }
}
