import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptTextIcon } from "lucide-react";

import { OrderStatusBadge } from "@/components/blocks/order-status-badge";
import { StatCard } from "@/components/blocks/stat-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatCurrency, formatDate } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { resolveLocaleParam } from "@/lib/i18n/server";
import { readSession } from "@/lib/server/auth";
import { listOrdersByUser } from "@/lib/server/orders";
import { toOrderView } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  return { title: t.meta.account.title, description: t.meta.account.description };
}

/** 个人中心概览：账户信息 + 订单统计 + 最近订单 + 快捷入口 */
export default async function AccountOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);
  const session = await readSession();

  // 未登录由 account/layout.tsx 的 RequireAuth 兜底，这里只是类型收窄
  if (!session) {
    return null;
  }

  const orders = listOrdersByUser(session.user.id).map((order) =>
    toOrderView(order, locale),
  );

  const pendingCount = orders.filter((order) => order.status === "PENDING").length;
  const activeCount = orders.filter((order) => order.status === "ACTIVE").length;
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="type-h1 text-foreground">{t.account.title}</h1>
        <p className="type-body-lg text-muted-foreground">{t.account.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="type-h3">
            {t.account.overview.accountInfoTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="type-body-sm text-muted-foreground">
                {t.account.overview.username}
              </dt>
              <dd className="type-body text-foreground">
                {session.user.username}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="type-body-sm text-muted-foreground">
                {t.account.overview.email}
              </dt>
              <dd className="type-body break-all text-foreground">
                {session.user.email}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="type-body-sm text-muted-foreground">
                {t.account.overview.createdAt}
              </dt>
              <dd className="type-body tabular-nums text-foreground">
                {formatDate(session.user.createdAt, locale)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="type-h3 text-foreground">
          {t.account.overview.statsTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t.account.overview.statTotal}
            value={String(orders.length)}
          />
          <StatCard
            label={t.account.overview.statPending}
            value={String(pendingCount)}
          />
          <StatCard
            label={t.account.overview.statActive}
            value={String(activeCount)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="type-h3 text-foreground">
            {t.account.overview.recentTitle}
          </h2>
          <Link
            href={`/${locale}/account/orders`}
            className="type-body-sm shrink-0 text-primary underline-offset-4 hover:underline"
          >
            {t.account.overview.viewAll}
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptTextIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{t.account.overview.empty}</EmptyTitle>
              <EmptyDescription>{t.account.overview.emptyDesc}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href={`/${locale}/products`}>
                  {t.common.browseProducts}
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/${locale}/account/orders/${order.id}`}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors duration-150 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="type-order-no font-mono break-all text-muted-foreground">
                      {order.id}
                    </p>
                    <p className="type-card-title text-foreground">
                      {order.productName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <p className="tabular-nums text-foreground">
                      {formatCurrency(order.amount, locale)}
                    </p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="type-h3 text-foreground">
          {t.account.overview.quickTitle}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href={`/${locale}/account/profile`}>
              {t.account.overview.quickProfile}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={`/${locale}/account/password`}>
              {t.account.overview.quickPassword}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}