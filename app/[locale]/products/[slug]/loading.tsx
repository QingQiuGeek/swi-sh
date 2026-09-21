import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

/** 产品详情加载态：与双列布局同形 */
export default function ProductDetailLoading() {
  return (
    <Container className="flex flex-col gap-10 py-12 lg:gap-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </Container>
  );
}