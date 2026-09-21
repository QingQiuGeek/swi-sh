import { LOCALE_COOKIE, type Locale } from "./config";

/** 语言偏好 Cookie 的服务端读取（middleware）与客户端写入（LanguageSwitcher） */

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** 客户端记录语言偏好，下次访问根路径时由 middleware 按它重定向 */
export function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${ONE_YEAR_SECONDS};samesite=lax`;
}