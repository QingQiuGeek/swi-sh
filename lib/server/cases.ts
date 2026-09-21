import type { Locale } from "@/lib/i18n/config";
import baseJson from "@/lib/mock/cases/base.json";
import enJson from "@/lib/mock/cases/en.json";
import zhJson from "@/lib/mock/cases/zh.json";
import { getProducts } from "@/lib/server/products";
import { CASE_ICONS, type CaseIcon, type CaseView } from "@/lib/types";

/**
 * base.json：语言无关字段。
 * 车牌号是标识符、理赔天数是数字，两者都不随语言变化，因此只在这里定义一份。
 */
type CaseBase = {
  id: string;
  sortOrder: number;
  /** 关联产品 id；产品名按当前语言从产品数据取，避免在案例里再翻译一遍产品名 */
  productId: string;
  icon: string;
  claimDays: number;
  plateNo: string;
};

/** 语言文件：按 id 与 base 合并的文案 */
type CaseText = Record<
  string,
  { city: string; ownerName: string; summary: string; quote: string }
>;

const baseList = baseJson as CaseBase[];

const localeFiles: Record<Locale, CaseText> = {
  zh: zhJson as CaseText,
  en: enJson as CaseText,
};

/** 加载时校验：语言文件的 id 集合与 base 一致，图标键在允许集合内 */
function assertDataValid() {
  const expected = baseList.map((item) => item.id).sort().join(",");

  for (const [locale, text] of Object.entries(localeFiles)) {
    const actual = Object.keys(text).sort().join(",");

    if (actual !== expected) {
      throw new Error(
        `投保案例 mock 数据不一致：${locale}.json 的 id 集合与 base.json 不匹配`,
      );
    }
  }

  for (const item of baseList) {
    if (!(CASE_ICONS as readonly string[]).includes(item.icon)) {
      throw new Error(`投保案例 ${item.id} 的图标键无效：${item.icon}`);
    }
  }
}

assertDataValid();

/** 投保案例列表，按 sortOrder 升序，并带上当前语言的产品名 */
export function getCases(locale: Locale): CaseView[] {
  const text = localeFiles[locale];
  const productNameById = new Map(
    getProducts(locale).map((product) => [product.id, product.name]),
  );

  return [...baseList]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const entry = text[item.id];
      const productName = productNameById.get(item.productId);

      if (!entry) {
        throw new Error(`投保案例缺少 ${locale} 文案：${item.id}`);
      }

      if (!productName) {
        throw new Error(
          `投保案例 ${item.id} 关联的产品不存在或已下架：${item.productId}`,
        );
      }

      return {
        id: item.id,
        sortOrder: item.sortOrder,
        productId: item.productId,
        icon: item.icon as CaseIcon,
        claimDays: item.claimDays,
        plateNo: item.plateNo,
        ...entry,
        productName,
      } satisfies CaseView;
    });
}