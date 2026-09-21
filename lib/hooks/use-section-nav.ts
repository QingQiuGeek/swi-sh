"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useLocale } from "@/lib/i18n/provider";
import {
  SECTION_IDS,
  rememberSection,
  scrollToSection,
  scrollToSectionWhenReady,
  takePendingSection,
  type SectionId,
} from "@/lib/section-nav";

import { useActiveSection } from "./use-active-section";

/**
 * Header 与移动端抽屉共用的分区导航行为：
 * 在首页直接平滑滚动，在其它页面先回首页再由 pending 值复原位置。
 */
export function useSectionNav() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const homePath = `/${locale}`;
  const isHome = pathname === homePath;
  const observedSection = useActiveSection(SECTION_IDS);

  // 非首页时按当前路由段高亮对应 Tab
  const segment = pathname.split("/")[2];
  const routeSection: SectionId | null =
    segment === "products" || segment === "guide" || segment === "about"
      ? segment
      : null;

  useEffect(() => {
    if (!isHome) {
      return;
    }

    const pending = takePendingSection();

    if (pending) {
      scrollToSectionWhenReady(pending);
    }
  }, [isHome, pathname]);

  const goToSection = useCallback(
    (id: SectionId) => {
      if (isHome) {
        scrollToSection(id);
        return;
      }

      rememberSection(id);
      router.push(homePath);
    },
    [homePath, isHome, router],
  );

  return {
    isHome,
    activeSection: isHome ? (observedSection ?? "home") : routeSection,
    goToSection,
  };
}