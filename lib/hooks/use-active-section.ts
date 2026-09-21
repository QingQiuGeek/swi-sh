"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { setCurrentSection, type SectionId } from "@/lib/section-nav";

/**
 * 用 IntersectionObserver 观察分区，取可见比例最大的那个作为当前分区。
 * 不监听 scroll 事件逐帧计算。
 */
export function useActiveSection(ids: readonly SectionId[]): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    // 分区尚未挂载（或当前不在首页）：不订阅，也不在 effect 里同步改状态
    if (elements.length === 0) {
      setCurrentSection(null);
      return;
    }

    const ratios = new Map<SectionId, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id as SectionId, entry.intersectionRatio);
        }

        let best: SectionId | null = null;
        let bestRatio = 0;

        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }

        setActive(best);
        setCurrentSection(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [ids, pathname]);

  return active;
}