import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LOCALES, isLocale, type Locale } from "./config";

/**
 * 服务端页面读取 [locale] 动态参数的统一入口。
 * 非法语言段（如 /fr）在这里收口为 404，页面其余部分无需再判断类型。
 */
export function resolveLocaleParam(value: string): Locale {
  if (!isLocale(value)) {
    notFound();
  }

  return value;
}

/**
 * 生成当前页面的 hreflang 备选链接。
 * path 为语言段之后的部分，例如 ""、"/products"、"/products/compulsory-traffic"。
 */
export function buildAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  const languages = Object.fromEntries(
    LOCALES.map((item) => [
      item === "zh" ? "zh-CN" : "en",
      `/${item}${path}`,
    ]),
  );

  return {
    canonical: `/${locale}${path}`,
    languages,
  };
}