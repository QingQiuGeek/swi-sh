/** 语言集合与相关常量。此文件会被 middleware（Edge 运行时）引用，不得引入 Node 专用 API。 */

export const LOCALES = ["zh", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh";

/** 语言偏好 Cookie，有效期一年 */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** middleware 写入、根布局读取的请求头，用于设置 <html lang> */
export const LOCALE_HEADER = "x-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return (
    value !== null &&
    value !== undefined &&
    (LOCALES as readonly string[]).includes(value)
  );
}

/** 解析 Accept-Language，只认 zh 与 en，取不到返回 null */
export function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) {
    return null;
  }

  for (const entry of header.split(",")) {
    const tag = entry.trim().split(";")[0]?.toLowerCase() ?? "";

    if (tag.startsWith("zh")) return "zh";
    if (tag.startsWith("en")) return "en";
  }

  return null;
}