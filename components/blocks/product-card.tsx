"use client";

import Link from "next/link";
import { cn } from "cn";
import { CarIcon, CheckIcon, ShieldCheckIcon, ShieldIcon } from "lucide-react";

import { BuyNowButton } from "@/components/blocks/buy-now-button";
import { Price } from "@/components/blocks/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import type { Product, ProductCategory } from "@/lib/types";

/** 配图位：本项目没有真实摄影素材，用类别图标 + 浅蓝底代替，保持同一分区风格一致 */
const CATEGORY_ICONS: Record<ProductCategory, typeof CarIcon> = {
  statutory: ShieldCheckIcon,
  "commercial-package": CarIcon,
  single: ShieldIcon,
};

/** 产品卡片：名称、卖点、价格、保额、服务内容前两条、标签与「查看详情 + 立即投保」双入口 */
export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { locale, t } = useI18n();
  const Icon = CATEGORY_ICONS[product.category];

  const coverageText =
    product.coverageAmount === null
      ? (product.coverageText ?? t.common.coverage)
      : formatCurrency(product.coverageAmount, locale);

  // 卡片只展示前两条服务内容，完整明细在产品详情页
  const previews = product.coverages.slice(0, 2);

  return (
    <Card
      className={cn(
        "h-full transition-colors duration-150 hover:border-primary/40",
        className,
      )}
    >
      <CardHeader>
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
          >
            <Icon className="size-7" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">
                {t.products.categories[product.category]}
              </Badge>
              {product.badge ? (
                <Badge
                  variant={product.badge === "statutory" ? "secondary" : "highlight"}
                >
                  {t.products.badges[product.badge]}
                </Badge>
              ) : null}
            </div>
            <CardTitle className="type-card-title">{product.name}</CardTitle>
            <CardDescription>{product.tagline}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Price value={product.price} showPeriod />
          <p className="type-body-sm tabular-nums text-muted-foreground">
            {t.common.coverage} {coverageText}
          </p>
        </div>

        <Separator />

        <ul className="flex flex-col gap-2">
          {previews.map((coverage) => (
            <li key={coverage.title} className="flex items-start gap-2">
              <CheckIcon
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-primary"
              />
              <span className="type-body-sm text-muted-foreground">
                {coverage.title}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex-wrap justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={`/${locale}/products/${product.slug}`}>
            {t.common.viewDetail}
          </Link>
        </Button>
        <BuyNowButton slug={product.slug} size="default" />
      </CardFooter>
    </Card>
  );
}