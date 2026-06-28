class ApiError extends Error {
  public statusCode: number;
  // Alias used by some middlewares (e.g., error handlers that read err.status)
  get status(): number {
    return this.statusCode;
  }
  public success: boolean;
  public data: unknown | null;
  public error: unknown | null;

  // Keep backward-compatible parameter order. Many call sites pass the 3rd arg as the error object.
  constructor(
    statusCode: number,
    message = "Something went wrong",
    dataOrError?: unknown,
    errorMaybe?: unknown,
    stack?: string
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.success = false;

    // Backward compatibility: if only one of (dataOrError, errorMaybe) is provided,
    // and it's in the third position, treat it as the error payload.
    if (
      typeof errorMaybe === "undefined" &&
      typeof dataOrError !== "undefined"
    ) {
      this.data = null;
      this.error = dataOrError ?? null;
    } else {
      this.data = (dataOrError ?? null) as unknown | null;
      this.error = (errorMaybe ?? null) as unknown | null;
    }

    if (stack) this.stack = stack;
    else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      success: this.success,
      message: this.message,
      error: this.error,
      data: this.data,
    };
  }
}

export default ApiError;
