"use client";

import type { ApiCode, ApiResponse } from "@/lib/types/api";

/**
 * 客户端统一 fetch 封装：
 * - 解包 ApiResponse，调用方只看 success 与 code，不用 HTTP 状态码猜结果；
 * - 网络异常与非法响应体统一映射成 INTERNAL_ERROR；
 * - 收到 UNAUTHORIZED 时触发全局处理（清除登录态 → 打开登录弹窗）。
 */

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; code: ApiCode };

type ApiFetchOptions = {
  /** 探测登录态这类请求不应该弹出登录弹窗 */
  skipUnauthorizedHandler?: boolean;
};

let unauthorizedHandler: (() => void) | null = null;

/** 由 AuthProvider 注册；组件卸载时传 null 注销 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
  options?: ApiFetchOptions,
): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    return { success: false, code: "INTERNAL_ERROR" };
  }

  let payload: ApiResponse<T>;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    return { success: false, code: "INTERNAL_ERROR" };
  }

  if (payload.success) {
    return { success: true, data: payload.data as T };
  }

  if (payload.code === "UNAUTHORIZED" && !options?.skipUnauthorizedHandler) {
    unauthorizedHandler?.();
  }

  return {
    success: false,
    code: payload.code === "OK" ? "INTERNAL_ERROR" : payload.code,
  };
}

/** 带 JSON 请求体的写操作 */
export function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  options?: ApiFetchOptions,
): Promise<ApiResult<T>> {
  return apiFetch<T>(
    url,
    {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    options,
  );
}

/** 探测当前登录用户；未登录返回 null，不触发登录弹窗 */
export async function fetchCurrentUser<T>(): Promise<T | null> {
  const result = await apiFetch<T>("/api/auth/session", undefined, {
    skipUnauthorizedHandler: true,
  });

  return result.success ? result.data : null;
}