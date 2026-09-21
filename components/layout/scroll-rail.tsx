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
          <span
            className={cn(
              "text-xs transition-colors duration-150",
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