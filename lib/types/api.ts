/**
 * 前后端共用的接口契约。权威定义见 docs/prd.md §10.1。
 *
 * 约定：
 * - 前端只信 success 与 code，不用 HTTP 状态码猜结果。
 * - message 仅供开发者排查与兜底，UI 文案一律由 code 查字典得到（本站中英双语）。
 * - 字段级校验归前端 zod，服务端只返回业务码，不返回字段错误明细。
 */

export const API_CODES = [
  "OK",
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "EMAIL_TAKEN",
  "DUPLICATE_ORDER",
  "ORDER_NOT_CANCELLABLE",
  "INVALID_CREDENTIALS",
  "INVALID_PASSWORD",
  "SAME_PASSWORD",
  "TOO_WEAK",
  "INTERNAL_ERROR",
] as const;

/** 业务码，统一为字符串 */
export type ApiCode = (typeof API_CODES)[number];

/** 成功响应体的数据载荷，失败固定为 null */
export type ApiResponse<T> = {
  success: boolean;
  code: ApiCode;
  message: string;
  data: T | null;
};

/** 业务码 → HTTP 状态码，路由处理器据此设置响应状态 */
export const HTTP_STATUS_BY_CODE: Record<ApiCode, number> = {
  OK: 200,
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  DUPLICATE_ORDER: 409,
  ORDER_NOT_CANCELLABLE: 409,
  INVALID_CREDENTIALS: 400,
  INVALID_PASSWORD: 400,
  SAME_PASSWORD: 400,
  TOO_WEAK: 400,
  INTERNAL_ERROR: 500,
};

/** 能唯一对应到某个表单字段的业务码，前端据此把错误贴到字段下方 */
export const FIELD_SCOPED_CODES = [
  "EMAIL_TAKEN",
  "INVALID_PASSWORD",
  "SAME_PASSWORD",
  "TOO_WEAK",
] as const;