import type { Locale } from "@/lib/i18n/config";
import baseJson from "@/lib/mock/guide/base.json";
import enJson from "@/lib/mock/guide/en.json";
import zhJson from "@/lib/mock/guide/zh.json";
import type { Guide, GuideFaq, GuideMaterial, GuideStep } from "@/lib/types";

/** base.json：语言无关部分（排序与是否必需） */
type GuideBase = {
  steps: { id: string; sortOrder: number }[];
  materials: { id: string; required: boolean }[];
  faqs: { id: string }[];
};

/** 语言文件：按 id 与 base 合并的文案 */
type GuideText = {
  steps: Record<string, { title: string; desc: string; duration: string }>;
  materials: Record<string, { name: string; desc: string }>;
  faqs: Record<string, { question: string; answer: string }>;
};

const baseData = baseJson as GuideBase;

const localeFiles: Record<Locale, GuideText> = {
  zh: zhJson as GuideText,
  en: enJson as GuideText,
};

function assertIdsAligned() {
  const sections = ["steps", "materials", "faqs"] as const;

  for (const [locale, text] of Object.entries(localeFiles)) {
    for (const section of sections) {
      const expected = baseData[section]
        .map((item) => item.id)
        .sort()
        .join(",");
      const actual = Object.keys(text[section]).sort().join(",");

      if (actual !== expected) {
        throw new Error(
          `投保指引 mock 数据不一致：${locale}.json 的 ${section} 与 base.json 不匹配`,
        );
      }
    }
  }
}

assertIdsAligned();

/** 合并 base 与语言文件，得到可直接渲染的投保指引 */
export function getGuide(locale: Locale): Guide {
  const text = localeFiles[locale];

  const steps: GuideStep[] = [...baseData.steps]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const entry = text.steps[item.id];

      if (!entry) {
        throw new Error(`投保指引缺少 ${locale} 步骤文案：${item.id}`);
      }

      return { id: item.id, sortOrder: item.sortOrder, ...entry };
    });

  const materials: GuideMaterial[] = baseData.materials.map((item) => {
    const entry = text.materials[item.id];

    if (!entry) {
      throw new Error(`投保指引缺少 ${locale} 材料文案：${item.id}`);
    }

    return { id: item.id, required: item.required, ...entry };
  });

  const faqs: GuideFaq[] = baseData.faqs.map((item) => {
    const entry = text.faqs[item.id];

    if (!entry) {
      throw new Error(`投保指引缺少 ${locale} 常见问题文案：${item.id}`);
    }

    return { id: item.id, ...entry };
  });

  return { steps, materials, faqs };
}