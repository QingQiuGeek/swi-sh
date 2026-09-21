import type { Dictionary } from "@/lib/i18n";
import type { ApiCode } from "@/lib/types/api";

/** 用业务码在字典的 errors 命名空间取 UI 文案；字典里没有该码时回落到 UNKNOWN */
export function errorMessage(t: Dictionary, code: ApiCode | string): string {
  const table = t.errors as Record<string, string>;

  return table[code] ?? t.errors.UNKNOWN;
}