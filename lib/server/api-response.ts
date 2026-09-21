import { NextResponse } from "next/server";

import {
  HTTP_STATUS_BY_CODE,
  type ApiCode,
  type ApiResponse,
} from "@/lib/types/api";

/**
 * 供开发者排查与兜底用的英文/中文混合提示。
 * UI 不渲染 message，UI 用 code 到字典的 errors 命名空间取文案。
 */
const DEV_MESSAGES: Record<ApiCode, string> = {
  OK: "OK",
  VALIDATION_ERROR: "Request payload is invalid.",
  UNAUTHORIZED: "Authentication is required.",
  FORBIDDEN: "You are not allowed to access this resource.",
  NOT_FOUND: "The requested resource was not found.",
  EMAIL_TAKEN: "This email address is already registered.",
  DUPLICATE_ORDER: "An order for this vehicle and product already exists.",
  ORDER_NOT_CANCELLABLE: "Only pending orders can be cancelled.",
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  INVALID_PASSWORD: "The current password is incorrect.",
  SAME_PASSWORD: "The new password matches the current one.",
  TOO_WEAK: "The new password is too weak.",
  INTERNAL_ERROR: "Unexpected server error.",
};

/** 成功响应；创建类接口传 201 */
export function ok<T>(data: T, status = HTTP_STATUS_BY_CODE.OK) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, code: "OK", message: DEV_MESSAGES.OK, data },
    { status },
  );
}

/** 失败响应；HTTP 状态码由业务码映射表决定，不一律返回 200 */
export function fail(code: ApiCode, message?: string) {
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      code,
      message: message ?? DEV_MESSAGES[code],
      data: null,
    },
    { status: HTTP_STATUS_BY_CODE[code] },
  );
}