"use client";

import { cn } from "cn";

import { formatCurrency } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";

/** 价格展示：按语言格式化货币（zh 为 ¥2,680，en 为 CN¥2,680）+ 等宽数字 + 可选「/ 年」单位 */
export function Price({
  value,
  size = "md",
  showPeriod = false,
  className,
}: {
  value: number;
  size?: "md" | "lg";
  showPeriod?: boolean;
  className?: string;
}) {
  const { locale, t } = useI18n();

  return (
    <p
      className={cn(
        "flex items-baseline gap-1.5 tabular-nums text-foreground",
        size === "lg" ? "type-price-lg" : "type-price-md",
        className,
      )}
    >
      <span>{formatCurrency(value, locale)}</span>
      {showPeriod ? (
        <span className="type-body-sm font-normal text-muted-foreground">
          {t.common.yearSuffix}
        </span>
      ) : null}
    </p>
  );
}