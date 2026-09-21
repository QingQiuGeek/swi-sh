import type { Metadata } from "next";
import { PackageOpenIcon } from "lucide-react";

import { DemoNotice } from "@/components/blocks/demo-notice";
import { ProductGrid } from "@/components/blocks/product-grid";
import { SectionHeading } from "@/components/blocks/section-heading";
import { Container } from "@/components/layout/container";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getDictionary } from "@/lib/i18n";
import { buildAlternates, resolveLocaleParam } from "@/lib/i18n/server";
import { getProducts } from "@/lib/server/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  return {
    title: t.meta.products.title,
    description: t.meta.products.description,
    alternates: buildAlternates(locale, "/products"),
  };
}

/** 产品列表：只展示在售产品，数量少因此不做筛选与分页 */
export default async function ProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);
  const products = getProducts(locale);

  return (
    <Container className="flex flex-col gap-10 py-12 lg:gap-12 lg:py-16">
      <SectionHeading
        as="h1"
        eyebrow={t.nav.products}
        title={t.products.title}
        subtitle={t.products.subtitle}
      />

      {products.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageOpenIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t.products.empty}</EmptyTitle>
            <EmptyDescription>{t.products.emptyDesc}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ProductGrid products={products} />
      )}

      <DemoNotice />
    </Container>
  );
}