import type { Locale } from "@/lib/i18n/config";
import baseJson from "@/lib/mock/products/base.json";
import enJson from "@/lib/mock/products/en.json";
import zhJson from "@/lib/mock/products/zh.json";
import type { Product, ProductBadge, ProductCategory } from "@/lib/types";

/** base.json 的条目：语言无关字段，价格只有这一处定义 */
type ProductBase = {
  id: string;
  slug: string;
  category: string;
  price: number;
  coverageAmount: number | null;
  period: string;
  badge: string | null;
  active: boolean;
  sortOrder: number;
};

/** 语言文件的条目：按 slug 与 base 合并 */
type ProductText = {
  slug: string;
  name: string;
  tagline: string;
  applicableVehicles: string;
  coverageText: string | null;
  coverages: { title: string; desc: string }[];
};

const baseList = baseJson as ProductBase[];

const localeFiles: Record<Locale, ProductText[]> = {
  zh: zhJson as ProductText[],
  en: enJson as ProductText[],
};

/** 加载时校验两份语言文件的 slug 集合与 base 完全一致，避免漏翻译或改价不同步 */
function assertSlugsAligned() {
  const expected = baseList
    .map((product) => product.slug)
    .sort()
    .join(",");

  for (const [locale, list] of Object.entries(localeFiles)) {
    const actual = list
      .map((product) => product.slug)
      .sort()
      .join(",");

    if (actual !== expected) {
      throw new Error(
        `产品 mock 数据不一致：${locale}.json 的 slug 集合与 base.json 不匹配`,
      );
    }
  }
}

assertSlugsAligned();

function merge(locale: Locale): Product[] {
  const textBySlug = new Map(
    localeFiles[locale].map((text) => [text.slug, text]),
  );

  return baseList
    .map((item) => {
      const text = textBySlug.get(item.slug);

      if (!text) {
        throw new Error(`产品 ${item.slug} 缺少 ${locale} 文案`);
      }

      return {
        id: item.id,
        slug: item.slug,
        category: item.category as ProductCategory,
        price: item.price,
        coverageAmount: item.coverageAmount,
        period: "1y" as const,
        badge: item.badge as ProductBadge | null,
        active: item.active,
        sortOrder: item.sortOrder,
        name: text.name,
        tagline: text.tagline,
        coverages: text.coverages,
        applicableVehicles: text.applicableVehicles,
        coverageText: text.coverageText,
      } satisfies Product;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** 在售产品，按 sortOrder 升序 */
export function getProducts(locale: Locale): Product[] {
  return merge(locale).filter((product) => product.active);
}

/** 按 slug 取在售产品；不存在或已下架返回 null，由调用方决定走 404 */
export function getProductBySlug(slug: string, locale: Locale): Product | null {
  return (
    merge(locale).find(
      (product) => product.slug === slug && product.active,
    ) ?? null
  );
}
/** 下单用的产品快照：订单需要同时保存中英文名与当时价格，后续改价不影响历史订单 */
export function getProductSnapshot(slug: string): {
  id: string;
  price: number;
  nameZh: string;
  nameEn: string;
} | null {
  const zhProduct = getProductBySlug(slug, "zh");
  const enProduct = getProductBySlug(slug, "en");

  if (!zhProduct || !enProduct) {
    return null;
  }

  return {
    id: zhProduct.id,
    price: zhProduct.price,
    nameZh: zhProduct.name,
    nameEn: enProduct.name,
  };
}