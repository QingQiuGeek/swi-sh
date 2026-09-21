import { DEFAULT_LOCALE, isLocale, parseAcceptLanguage, type Locale } from "@/lib/i18n/config";

/**
 * 接口侧的语言解析：?locale= 优先，其次 Accept-Language，最后回落默认语言。
 * 服务端渲染的页面以 URL 语言段为准，不走这里。
 */
export function resolveRequestLocale(request: Request): Locale {
  const query = new URL(request.url).searchParams.get("locale");

  if (isLocale(query)) {
    return query;
  }

  return (
    parseAcceptLanguage(request.headers.get("accept-language")) ?? DEFAULT_LOCALE
  );
}