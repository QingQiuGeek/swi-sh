import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RequireAuth } from "@/components/auth/require-auth";
import { DemoNotice } from "@/components/blocks/demo-notice";
import { Price } from "@/components/blocks/price";
import { PurchaseForm } from "@/components/forms/purchase-form";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <Card>
        <CardHeader>
          <CardTitle className="type-h3">{t.purchase.summaryTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="type-card-title text-foreground">{product.name}</p>
            <p className="type-body-sm text-muted-foreground">
              {product.tagline}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Price value={product.price} size="md" showPeriod />
            <p className="type-body-sm text-muted-foreground">
              {t.common.period} {t.common.periodYear}
            </p>
          </div>
        </CardContent>
      </Card>

      <PurchaseForm product={product} />

      <DemoNotice />
    </Container>
  );
}