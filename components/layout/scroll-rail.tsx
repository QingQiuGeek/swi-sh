"use client";

import { cn } from "cn";

import { useT } from "@/lib/i18n/provider";
import { useActiveSection } from "@/lib/hooks/use-active-section";
import { SECTION_IDS, scrollToSection } from "@/lib/section-nav";

/** 首页左侧竖向滚动指示轨：仅桌面显示，激活点用暖色点睛 */
export function ScrollRail() {
  const t = useT();
  const active = useActiveSection(SECTION_IDS);

  return (
    <nav
      aria-label={t.header.menuLabel}
      className="fixed top-1/2 left-4 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
    >
      {SECTION_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => scrollToSection(id)}
          aria-current={active === id ? "true" : undefined}
          className="group flex items-center gap-3 rounded-full py-1"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 rounded-full transition-colors duration-150",
              active === id
                ? "bg-highlight"
                : "bg-border group-hover:bg-muted-foreground",
            )}
          />
          {/* 底衬：首页首屏是深底视频，指示轨的原生文字色在深底上不可读；
              底衬取页面底色，在浅色分区上完全不可见，只在深底首屏显形 */}
          <span
            className={cn(
              "rounded-full bg-background/90 px-2 py-0.5 text-xs transition-colors duration-150",
              active === id ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {t.nav[id]}
          </span>
        </button>
      ))}
    </nav>
  );
}