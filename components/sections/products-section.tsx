import Link from "next/link";

import { ProductGrid } from "@/components/blocks/product-grid";
import { SectionHeading } from "@/components/blocks/section-heading";
import { Container } from "@/components/layout/container";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { Product } from "@/lib/types";

/** 首页「保险产品」分区，id 固定为 products */
export function ProductsSection({
  locale,
  products,
}: {
  locale: Locale;
  products: Product[];
}) {
  const t = getDictionary(locale);

  return (
    <section id="products" className="scroll-mt-15 lg:scroll-mt-18">
      <Container className="flex flex-col gap-8 py-16 lg:gap-12 lg:py-24">
        <SectionHeading
          eyebrow={t.home.products.eyebrow}
          title={t.home.products.title}
          subtitle={t.home.products.subtitle}
        />

        <ProductGrid products={products} />

        <Link
          href={`/${locale}/products`}
          className="type-body-sm w-fit text-primary underline-offset-4 hover:underline"
        >
          {t.common.viewAllProducts}
        </Link>
      </Container>
    </section>
  );
}