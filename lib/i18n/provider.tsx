"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Locale } from "./config";
import type { Dictionary } from "./index";

type I18nValue = {
  locale: Locale;
  t: Dictionary;
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * 由 [locale]/layout.tsx 注入当前语言与当前语言的字典。
 * 只传一份字典，不把两种语言都打到客户端。
 */
export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

/** 取当前语言与字典 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error("useI18n 必须在 I18nProvider 内部使用");
  }

  return value;
}

/** 取当前语言的字典 */
export function useT(): Dictionary {
  return useI18n().t;
}

/** 取当前语言，用于拼接带语言前缀的路径 */
export function useLocale(): Locale {
  return useI18n().locale;
}