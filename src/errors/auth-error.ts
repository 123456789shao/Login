import axios from 'axios';

export enum AuthErrorCode {
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  NO_REFRESH_TOKEN = 'NO_REFRESH_TOKEN',
  REFRESH_EXPIRED = 'REFRESH_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  FORBIDDEN = 'FORBIDDEN',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  SERVER_ERROR = 'SERVER_ERROR',
}

interface BackendErrorPayload {
  code?: string;
  message?: string;
  details?: unknown;
}

export interface AuthError extends Error {
  name: 'AuthError';
  isAuthError: true;
  code: AuthErrorCode;
  status: number | null;
  backendCode?: string;
  details?: unknown;
}

const backendCodeMap: Record<string, AuthErrorCode> = {
  UNAUTHORIZED: AuthErrorCode.UNAUTHORIZED,
  TOKEN_EXPIRED: AuthErrorCode.TOKEN_EXPIRED,
  NO_REFRESH_TOKEN: AuthErrorCode.NO_REFRESH_TOKEN,
  REFRESH_EXPIRED: AuthErrorCode.REFRESH_EXPIRED,
  INVALID_CREDENTIALS: AuthErrorCode.INVALID_CREDENTIALS,
  ACCOUNT_LOCKED: AuthErrorCode.ACCOUNT_LOCKED,
  FORBIDDEN: AuthErrorCode.FORBIDDEN,
  VALIDATION_FAILED: AuthErrorCode.VALIDATION_FAILED,
};

const statusCodeMap: Record<number, AuthErrorCode> = {
  400: AuthErrorCode.VALIDATION_FAILED,
  401: AuthErrorCode.UNAUTHORIZED,
  403: AuthErrorCode.FORBIDDEN,
  408: AuthErrorCode.REQUEST_TIMEOUT,
  423: AuthErrorCode.ACCOUNT_LOCKED,
  500: AuthErrorCode.SERVER_ERROR,
  502: AuthErrorCode.SERVER_ERROR,
  503: AuthErrorCode.SERVER_ERROR,
  504: AuthErrorCode.SERVER_ERROR,
};

function normalizeBackendCode(code?: string): string | undefined {
  if (!code) {
    return undefined;
  }

  return code.trim().toUpperCase().replace(/-/g, '_');
}

function defaultMessageForCode(code: AuthErrorCode): string {
  switch (code) {
    case AuthErrorCode.INVALID_CREDENTIALS:
      return 'Sign in failed. Please check your credentials.';
    case AuthErrorCode.ACCOUNT_LOCKED:
      return 'Your account is locked. Please contact an administrator.';
    case AuthErrorCode.TOKEN_EXPIRED:
    case AuthErrorCode.REFRESH_EXPIRED:
    case AuthErrorCode.NO_REFRESH_TOKEN:
    case AuthErrorCode.UNAUTHORIZED:
      return 'Your session has expired. Please sign in again.';
    case AuthErrorCode.FORBIDDEN:
      return 'You do not have permission to perform this action.';
    case AuthErrorCode.NETWORK_ERROR:
      return 'Network error. Please check your connection and retry.';
    case AuthErrorCode.REQUEST_TIMEOUT:
      return 'Request timed out. Please retry.';
    case AuthErrorCode.VALIDATION_FAILED:
      return 'Request validation failed. Please verify the input.';
    case AuthErrorCode.SERVER_ERROR:
      return 'Server error. Please retry later.';
    default:
      return 'Unexpected error. Please retry.';
  }
}

function resolveCode(backendCode: string | undefined, status: number | null): AuthErrorCode {
  if (backendCode && backendCodeMap[backendCode]) {
    return backendCodeMap[backendCode];
  }

  if (status !== null && statusCodeMap[status]) {
    return statusCodeMap[status];
  }

  return AuthErrorCode.UNKNOWN;
}

export function isAuthError(error: unknown): error is AuthError {
  return Boolean(error && typeof error === 'object' && (error as Partial<AuthError>).isAuthError);
}

export function adaptAuthError(error: unknown): AuthError {
  if (isAuthError(error)) {
    return error;
  }

  let status: number | null = null;
  let backendCode: string | undefined;
  let details: unknown;
  let rawMessage: string | undefined;

  if (axios.isAxiosError(error)) {
    status = error.response?.status ?? null;

    const payload = (error.response?.data ?? {}) as BackendErrorPayload;
    backendCode = normalizeBackendCode(payload.code);
    details = payload.details ?? error.response?.data;
    rawMessage = payload.message || error.message;

    if (error.code === 'ECONNABORTED') {
      const timeoutError = new Error(defaultMessageForCode(AuthErrorCode.REQUEST_TIMEOUT)) as AuthError;
      timeoutError.name = 'AuthError';
      timeoutError.isAuthError = true;
      timeoutError.code = AuthErrorCode.REQUEST_TIMEOUT;
      timeoutError.status = status;
      timeoutError.backendCode = backendCode;
      timeoutError.details = details;
      return timeoutError;
    }

    if (!error.response) {
      const networkError = new Error(defaultMessageForCode(AuthErrorCode.NETWORK_ERROR)) as AuthError;
      networkError.name = 'AuthError';
      networkError.isAuthError = true;
      networkError.code = AuthErrorCode.NETWORK_ERROR;
      networkError.status = null;
      networkError.backendCode = backendCode;
      networkError.details = details;
      return networkError;
    }
  } else if (error instanceof Error) {
    rawMessage = error.message;
  }

  const code = resolveCode(backendCode, status);
  const message = rawMessage || defaultMessageForCode(code);

  const authError = new Error(message) as AuthError;
  authError.name = 'AuthError';
  authError.isAuthError = true;
  authError.code = code;
  authError.status = status;
  authError.backendCode = backendCode;
  authError.details = details;

  return authError;
}

export function getAuthErrorMessage(error: unknown): string {
  const adapted = adaptAuthError(error);

  if (adapted.message?.trim()) {
    return adapted.message;
  }

  return defaultMessageForCode(adapted.code);
}

export function isUnauthenticatedErrorCode(code: AuthErrorCode): boolean {
  return (
    code === AuthErrorCode.UNAUTHORIZED ||
    code === AuthErrorCode.TOKEN_EXPIRED ||
    code === AuthErrorCode.NO_REFRESH_TOKEN ||
    code === AuthErrorCode.REFRESH_EXPIRED
  );
}