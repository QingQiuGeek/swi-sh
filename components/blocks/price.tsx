"use client";

import { cn } from "cn";

import { formatCurrency } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";

/** 价格展示：按语言格式化货币（zh 为 ¥2,680，en 为 CN¥2,680）+ 等宽数字 + 可选「/ 年」单位 */
export function Price({
  value,
  size = "md",
  showPeriod = false,
  tone = "default",
  className,
}: {
  value: number;
  size?: "md" | "lg";
  showPeriod?: boolean;
  /** 默认用于浅底；`inverted` 用于首页首屏的深底面板 */
  tone?: "default" | "inverted";
  className?: string;
}) {
  const { locale, t } = useI18n();
  const inverted = tone === "inverted";

  return (
    <p
      className={cn(
        "flex items-baseline gap-1.5 tabular-nums",
        inverted ? "text-primary-foreground" : "text-foreground",
        size === "lg" ? "type-price-lg" : "type-price-md",
        className,
      )}
    >
      <span>{formatCurrency(value, locale)}</span>
      {showPeriod ? (
        <span
          className={cn(
            "type-body-sm font-normal",
            inverted ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {t.common.yearSuffix}
        </span>
      ) : null}
    </p>
  );
}