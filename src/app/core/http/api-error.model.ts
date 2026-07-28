/** Normalized error shape every feature can rely on. */
export interface ApiError {
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  /** Machine-readable code from the backend, e.g. `EMAIL_TAKEN`. */
  code: string;
  /** Message safe to render to the user. */
  message: string;
  /** Per-field messages, keyed by form control name. */
  fieldErrors?: Record<string, string>;
}

export const GENERIC_ERROR_MESSAGE =
  'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
