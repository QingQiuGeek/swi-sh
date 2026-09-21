import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  parseAcceptLanguage,
  type Locale,
} from "@/lib/i18n/config";

/** 按「语言 Cookie → Accept-Language → 默认 zh」的顺序解析首选语言 */
function resolvePreferredLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  return (
    (isLocale(cookieLocale) ? cookieLocale : null) ??
    parseAcceptLanguage(request.headers.get("accept-language")) ??
    DEFAULT_LOCALE
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 根路径按语言偏好重定向；非法语言段仍进入 [locale] 后由 notFound() 收口
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${resolvePreferredLocale(request)}`;

    return NextResponse.redirect(url);
  }

  // 把语言段透传给根布局用于 <html lang>
  const segment = pathname.split("/")[1];
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, isLocale(segment) ? segment : DEFAULT_LOCALE);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // 不拦截接口、Next 内部资源与带扩展名的静态文件
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};