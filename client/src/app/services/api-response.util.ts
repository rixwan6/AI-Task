import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ApiResponse } from '../models/standup.model';

/**
 * Shared by every API service so the response envelope is unwrapped in exactly
 * one place and components never branch on `success`.
 */
export function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error.message);
  }
  return response.data;
}

export function toReadableError(error: unknown): Observable<never> {
  return throwError(() => new Error(describe(error)));
}

function describe(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiResponse<never> | null;

    // A 4xx/5xx from our own API carries the envelope, including field detail.
    if (body && body.success === false) {
      const { message, details } = body.error;
      return details?.length ? `${message} ${details.join(' ')}` : message;
    }

    // Status 0 means the request never landed — almost always a stopped API.
    if (error.status === 0) {
      return 'Cannot reach the API. Is the server running on http://localhost:3000?';
    }

    return `Request failed with status ${error.status}.`;
  }

  return error instanceof Error ? error.message : 'Something went wrong.';
}
