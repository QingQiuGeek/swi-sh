"use client";

import { Button } from "@/components/ui/button";
import { useSectionNav } from "@/lib/hooks/use-section-nav";
import type { SectionId } from "@/lib/section-nav";

/**
 * 首页分区间的跳转按钮：在首页平滑滚动，在其它页面先回首页再滚动。
 * 文案由调用方传入（已本地化）。
 */
export function SectionCta({
  sectionId,
  label,
  variant = "default",
  size = "lg",
  className,
}: {
  sectionId: SectionId;
  label: string;
  variant?: "default" | "outline" | "inverse" | "outline-inverse";
  size?: "lg" | "default";
  className?: string;
}) {
  const { goToSection } = useSectionNav();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => goToSection(sectionId)}
    >
      {label}
    </Button>
  );
}