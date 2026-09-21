"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { type Locale } from "@/lib/i18n/config";
import { writeLocaleCookie } from "@/lib/i18n/cookie";
import { useI18n } from "@/lib/i18n/provider";
import { getCurrentSection, rememberSection } from "@/lib/section-nav";

const LOCALE_LABELS: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};

/**
 * 语言切换：只替换路径首段，其余部分不变。
 * 用 replace 而不是 push，不新增历史记录；首页场景下记住当前分区以便复原位置。
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(target: Locale) {
    const segments = pathname.split("/");
    segments[1] = target;

    // 首页有分区概念，切换语言后需要回到同一个分区
    const section = getCurrentSection();
    if (section) {
      rememberSection(section);
    }

    writeLocaleCookie(target);
    router.replace(segments.join("/") || `/${target}`);
  }

  const nextLocale: Locale = locale === "zh" ? "en" : "zh";

  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className={className}
      onClick={() => switchTo(nextLocale)}
      aria-label={t.header.switchLanguage}
    >
      {LOCALE_LABELS[nextLocale]}
    </Button>
  );
}