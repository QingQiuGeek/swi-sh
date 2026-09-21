"use client";

import { cn } from "cn";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { LOCALES, type Locale } from "@/lib/i18n/config";
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
 *
 * - variant="button"：Header 右侧的单个切换按钮
 * - variant="links"：页脚深蓝底上的两个语言选项
 */
export function LanguageSwitcher({
  variant = "button",
  className,
}: {
  variant?: "button" | "links";
  className?: string;
}) {
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

  if (variant === "links") {
    return (
      <div className={cn("flex flex-wrap items-center gap-3", className)}>
        {LOCALES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => switchTo(item)}
            aria-current={item === locale ? "true" : undefined}
            className={cn(
              "text-sm transition-colors duration-150",
              item === locale
                ? "font-semibold text-primary-foreground"
                : "text-primary-foreground/70 hover:text-primary-foreground",
            )}
          >
            {LOCALE_LABELS[item]}
          </button>
        ))}
      </div>
    );
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