export interface ApiError {
  message: string;
  /** Field-level validation messages, when the failure was a bad request. */
  details?: string[];
}

/**
 * Every endpoint responds with this envelope, so the client has exactly one
 * response shape to branch on regardless of which call it made.
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };
