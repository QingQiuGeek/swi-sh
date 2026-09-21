import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DemoNotice } from "@/components/blocks/demo-notice";
import { BuyNowButton } from "@/components/blocks/buy-now-button";
import { Price } from "@/components/blocks/price";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { buildAlternates, resolveLocaleParam } from "@/lib/i18n/server";
import { getProductBySlug } from "@/lib/server/products";

type ProductDetailProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({
  params,
}: ProductDetailProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocaleParam(rawLocale);
  const product = getProductBySlug(slug, locale);

  if (!product) {
    notFound();
  }

  return {
    title: product.name,
    description: product.tagline,
    alternates: buildAlternates(locale, `/products/${slug}`),
  };
}

/** 产品详情：左列保障内容，右列粘性价格卡 */
export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocaleParam(rawLocale);
  const t = getDictionary(locale);
  const product = getProductBySlug(slug, locale);

  if (!product) {
    notFound();
  }

  const coverageText =
    product.coverageAmount === null
      ? (product.coverageText ?? t.common.coverage)
      : formatCurrency(product.coverageAmount, locale);

  return (
    <Container className="flex flex-col gap-10 py-12 lg:gap-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
        <h1 className="type-h1 text-balance text-foreground">{product.name}</h1>
        <p className="type-body-lg max-w-2xl text-muted-foreground">
          {product.tagline}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-5">
            <h2 className="type-h3 text-foreground">
              {t.products.detail.coveragesTitle}
            </h2>
            <ul className="flex flex-col gap-4">
              {product.coverages.map((coverage) => (
                <li
                  key={coverage.title}
                  className="flex flex-col gap-1 border-l-2 border-primary/30 pl-4"
                >
                  <p className="type-card-title text-foreground">
                    {coverage.title}
                  </p>
                  <p className="type-body-sm text-muted-foreground">
                    {coverage.desc}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          <section className="flex flex-col gap-5">
            <h2 className="type-h3 text-foreground">
              {t.products.detail.noticeTitle}
            </h2>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="type-body-sm text-muted-foreground">
                  {t.products.detail.periodLabel}
                </dt>
                <dd className="type-body tabular-nums text-foreground">
                  {t.common.periodYear}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="type-body-sm text-muted-foreground">
                  {t.products.detail.coverageLabel}
                </dt>
                <dd className="type-body tabular-nums text-foreground">
                  {coverageText}
                </dd>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="type-body-sm text-muted-foreground">
                  {t.products.detail.vehiclesLabel}
                </dt>
                <dd className="type-body text-foreground">
                  {product.applicableVehicles}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="type-h3">{t.common.period}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <Price value={product.price} size="lg" showPeriod />
              <p className="type-body-sm text-muted-foreground">
                {t.products.detail.priceNote}
              </p>
            </div>

            <p className="type-body-sm tabular-nums text-muted-foreground">
              {t.common.coverage} {coverageText}
            </p>

            <BuyNowButton slug={product.slug} className="h-11 w-full" />

            <Link
              href={`/${locale}/products`}
              className="type-body-sm w-fit text-primary underline-offset-4 hover:underline"
            >
              {t.products.detail.backToList}
            </Link>

            <DemoNotice />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}