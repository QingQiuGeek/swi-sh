"use client";

import { cn } from "cn";
import { PackageOpenIcon } from "lucide-react";

import { ProductCard } from "@/components/blocks/product-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n/provider";
import type { Product } from "@/lib/types";

/** 骨架占位用的稳定 key，避免使用数组下标 */
const SKELETON_KEYS = ["s1", "s2", "s3", "s4", "s5", "s6"];

/** 产品网格：桌面 3 列 / 平板 2 列 / 移动 1 列；空数据时展示空状态 */
export function ProductGrid({
  products,
  className,
}: {
  products: Product[];
  className?: string;
}) {
  const t = useT();

  if (products.length === 0) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageOpenIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{t.products.empty}</EmptyTitle>
          <EmptyDescription>{t.products.emptyDesc}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

/** 加载态：骨架形状与最终卡片一致，供 loading.tsx 使用 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {SKELETON_KEYS.slice(0, count).map((key) => (
        <Card key={key}>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Skeleton className="size-16 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}