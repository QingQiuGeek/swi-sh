import type { Locale } from "./config";

/** 金额：中文 ¥2,680，英文 CN¥2,680（由 Intl 按语言决定符号与位置） */
export function formatCurrency(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

/** 日期 + 时间，例如 2026年9月21日 14:30 */
export function formatDateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/** 仅日期 */
export function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(value),
  );
}