import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderActions } from "@/components/blocks/order-actions";
import { OrderStatusBadge } from "@/components/blocks/order-status-badge";
import { Price } from "@/components/blocks/price";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getDictionary } from "@/lib/i18n";
import { formatDateTime } from "@/lib/i18n/format";
import { resolveLocaleParam } from "@/lib/i18n/server";
import { maskIdNo, maskPhone, maskVin } from "@/lib/mask";
import { readSession } from "@/lib/server/auth";
import { getOrderById } from "@/lib/server/orders";
import { toOrderView } from "@/lib/types";

type OrderDetailProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({
  params,
}: OrderDetailProps): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  return { title: t.account.detail.title, description: t.meta.account.description };
}

/** 订单详情的一行信息：标签 + 值 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="type-body-sm text-muted-foreground">{label}</dt>
      <dd className="type-body text-foreground">{value}</dd>
    </div>
  );
}

/** 订单详情：五张信息卡片 + 待支付状态下的操作区 */
export default async function OrderDetailPage({ params }: OrderDetailProps) {
  const { locale: rawLocale, id } = await params;
  const locale = resolveLocaleParam(rawLocale);
  const t = getDictionary(locale);
  const session = await readSession();

  if (!session) {
    return null;
  }

  const order = getOrderById(id, session.user.id);

  // 订单不存在与非本人访问统一走 404，不泄露资源存在性
  if (!order) {
    notFound();
  }

  const view = toOrderView(order, locale);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="type-h1 text-foreground">{t.account.detail.title}</h1>
        <OrderStatusBadge status={view.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="type-h3">
            {t.account.detail.productCardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="type-body-sm text-muted-foreground">
                {t.account.detail.orderNoLabel}
              </dt>
              <dd className="type-order-no font-mono break-all text-foreground">
                {view.id}
              </dd>
            </div>
            <InfoRow
              label={t.account.detail.productNameLabel}
              value={view.productName}
            />
            <InfoRow
              label={t.account.detail.periodLabel}
              value={t.common.periodYear}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="type-h3">
            {t.account.detail.insuredCardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-3">
            <InfoRow
              label={t.account.detail.insuredNameLabel}
              value={view.insured.name}
            />
            <InfoRow
              label={t.account.detail.insuredIdNoLabel}
              value={maskIdNo(view.insured.idNo)}
            />
            <InfoRow
              label={t.account.detail.insuredPhoneLabel}
              value={maskPhone(view.insured.phone)}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="type-h3">
            {t.account.detail.vehicleCardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <InfoRow
              label={t.account.detail.plateNoLabel}
              value={view.vehicle.plateNo}
            />
            <InfoRow
              label={t.account.detail.brandModelLabel}
              value={view.vehicle.brandModel}
            />
            <InfoRow
              label={t.account.detail.vinLabel}
              value={maskVin(view.vehicle.vin)}
            />
            <InfoRow
              label={t.account.detail.registerYearLabel}
              value={String(view.vehicle.registerYear)}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="type-h3">
            {t.account.detail.amountCardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="type-body-sm text-muted-foreground">
            {t.account.detail.amountLabel}
          </p>
          <Price value={view.amount} size="lg" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="type-h3">
            {t.account.detail.timelineCardTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-3">
            <InfoRow
              label={t.account.detail.createdAtLabel}
              value={formatDateTime(view.createdAt, locale)}
            />
            <InfoRow
              label={t.account.detail.effectiveAtLabel}
              value={
                view.effectiveAt
                  ? formatDateTime(view.effectiveAt, locale)
                  : t.account.detail.notAvailable
              }
            />
            <InfoRow
              label={t.account.detail.expireAtLabel}
              value={
                view.expireAt
                  ? formatDateTime(view.expireAt, locale)
                  : t.account.detail.notAvailable
              }
            />
          </dl>
        </CardContent>
      </Card>

      <OrderActions orderId={view.id} status={view.status} />

      <Separator />

      <Link
        href={`/${locale}/account/orders`}
        className="type-body-sm w-fit text-primary underline-offset-4 hover:underline"
      >
        {t.account.detail.backToOrders}
      </Link>
    </div>
  );
}