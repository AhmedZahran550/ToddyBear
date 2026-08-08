export interface FieldError {
  property: string;
  code: string;
  message?: string;
  value?: string;
  constraints?: {
    [type: string]: string;
  };
}
export interface AppErrorBase extends Record<string, unknown> {
  statusCode: number;
  errorCode: string;
  message: string;
  errors?: FieldError[];
}

export interface AppErrorResponse extends AppErrorBase {
  timestamp?: string;
  path?: string;
  requestId?: string;
}
