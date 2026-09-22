import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckIcon } from "lucide-react";

import { RequireAuth } from "@/components/auth/require-auth";
import { DemoNotice } from "@/components/blocks/demo-notice";
import { Price } from "@/components/blocks/price";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { resolveLocaleParam } from "@/lib/i18n/server";
import { readSession } from "@/lib/server/auth";
import { getProductBySlug } from "@/lib/server/products";

type PurchasePageProps = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({
  params,
}: PurchasePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocaleParam(rawLocale);
  const t = getDictionary(locale);

  return {
    title: t.meta.purchase.title,
    description: t.meta.purchase.description,
  };
}

/**
 * 投保表单页。未登录不重定向：保留 URL 并自动弹出登录框，
 * 登录成功后 router.refresh() 让这一层重新读到会话并渲染表单。
 *
 * 布局：左列填表、右列粘性「保险套餐信息」卡（沿用产品详情页的右列宽度与粘性规则）；
 * 提交按钮留在左列表单末尾，价格只出现在右列，避免同一金额在屏幕上出现两次。
 */
export default async function PurchasePage({ params }: PurchasePageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocaleParam(rawLocale);
  const t = getDictionary(locale);
  const product = getProductBySlug(slug, locale);

  if (!product) {
    notFound();
  }

  const session = await readSession();

  if (!session) {
    return (
      <Container className="py-12 lg:py-16">
        <RequireAuth />
      </Container>
    );
  }

  const coverageText =
    product.coverageAmount === null
      ? (product.coverageText ?? t.common.coverage)
      : formatCurrency(product.coverageAmount, locale);

  return (
    <Container className="flex flex-col gap-10 py-12 lg:gap-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="type-h1 text-balance text-foreground">
          {t.purchase.title}
        </h1>
        <p className="type-body-lg max-w-2xl text-muted-foreground">
          {t.purchase.subtitle}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10">
        <Card>
          <CardContent>
            <PurchaseForm productSlug={product.slug} />
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="type-h3">{t.purchase.planTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">
                {t.products.categories[product.category]}
              </Badge>
              {product.badge ? (
                <Badge
                  variant={
                    product.badge === "statutory" ? "secondary" : "highlight"
                  }
                >
                  {t.products.badges[product.badge]}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <p className="type-card-title text-foreground">{product.name}</p>
              <p className="type-body-sm text-muted-foreground">
                {product.tagline}
              </p>
            </div>

            <Price value={product.price} size="lg" showPeriod />

            <Separator />

            <dl className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <dt className="type-body-sm text-muted-foreground">
                  {t.common.coverage}
                </dt>
                <dd className="type-body-sm tabular-nums text-foreground">
                  {coverageText}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="type-body-sm text-muted-foreground">
                  {t.common.period}
                </dt>
                <dd className="type-body-sm tabular-nums text-foreground">
                  {t.common.periodYear}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="type-body-sm text-muted-foreground">
                  {t.products.detail.vehiclesLabel}
                </dt>
                <dd className="type-body-sm text-foreground">
                  {product.applicableVehicles}
                </dd>
              </div>
            </dl>

            <Separator />

            <div className="flex flex-col gap-3">
              <p className="type-body-sm text-muted-foreground">
                {t.products.detail.coveragesTitle}
              </p>
              <ul className="flex flex-col gap-2">
                {product.coverages.map((coverage) => (
                  <li key={coverage.title} className="flex items-start gap-2">
                    <CheckIcon
                      aria-hidden="true"
                      className="mt-1 size-4 shrink-0 text-primary"
                    />
                    <span className="type-body-sm text-foreground">
                      {coverage.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <DemoNotice />
    </Container>
  );
}