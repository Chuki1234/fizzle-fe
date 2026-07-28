import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError, GENERIC_ERROR_MESSAGE } from './api-error.model';

/**
 * Collapses every failure mode — network down, HTML error page, NestJS
 * exception body — into one `ApiError`, so features never branch on the shape
 * of `HttpErrorResponse`.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => throwError(() => toApiError(err))),
  );

export function toApiError(err: unknown): ApiError {
  if (!(err instanceof HttpErrorResponse)) {
    return { status: 0, code: 'UNKNOWN', message: GENERIC_ERROR_MESSAGE };
  }

  if (err.status === 0) {
    return {
      status: 0,
      code: 'NETWORK_UNAVAILABLE',
      message: 'Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng của bạn.',
    };
  }

  const body = err.error as
    | { code?: string; message?: string | string[]; fieldErrors?: Record<string, string> }
    | string
    | null;

  if (typeof body === 'string' || body === null) {
    return {
      status: err.status,
      code: 'HTTP_ERROR',
      message: statusFallback(err.status),
    };
  }

  return {
    status: err.status,
    code: body.code ?? 'HTTP_ERROR',
    message: firstMessage(body.message) ?? statusFallback(err.status),
    fieldErrors: body.fieldErrors,
  };
}

function firstMessage(message: string | string[] | undefined): string | null {
  if (Array.isArray(message)) return message[0] ?? null;
  return message ?? null;
}

function statusFallback(status: number): string {
  switch (status) {
    case 400:
      return 'Dữ liệu gửi lên không hợp lệ.';
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 404:
      return 'Không tìm thấy tài nguyên yêu cầu.';
    case 429:
      return 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.';
    default:
      return status >= 500
        ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
        : GENERIC_ERROR_MESSAGE;
  }
}
