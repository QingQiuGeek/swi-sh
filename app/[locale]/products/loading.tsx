import { ProductGridSkeleton } from "@/components/blocks/product-grid";
import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

/** 产品列表加载态：骨架形状与最终布局一致，避免内容到达时跳动 */
export default function ProductsLoading() {
  return (
    <Container className="flex flex-col gap-10 py-12 lg:gap-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>
      <ProductGridSkeleton />
    </Container>
  );
}