import type { Locale } from "./config";
import en from "./dictionaries/en.json";
import zh from "./dictionaries/zh.json";

/** 字典以 zh.json 为结构基准，en.json 必须保持完全一致的键结构（否则类型会不匹配） */
export type Dictionary = typeof zh;

const dictionaries: Record<Locale, Dictionary> = {
  zh,
  en: en as unknown as Dictionary,
};

/** 服务端组件按语言取整份字典 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}