"use client";

import { useEffect } from "react";

import type { Locale } from "@/lib/i18n/config";

/**
 * 客户端切换语言时用 router.replace 做同布局导航，根布局不会重新渲染，
 * <html lang> 会停留在上一次服务端渲染的语言。这里把它同步到当前语言段。
 */
export function HtmlLang({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}