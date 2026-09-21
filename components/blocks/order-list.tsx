"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/blocks/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptTextIcon } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import type { OrderStatus, OrderView } from "@/lib/types";

type Filter = "ALL" | Extract<OrderStatus, "PENDING" | "ACTIVE">;

/**
 * 订单列表：桌面渲染 Table，移动端渲染卡片列表，数据与筛选状态共用一套。
 * 筛选是页内过滤，不改变 URL、不发起请求。
 */
export function OrderList({ orders }: { orders: OrderView[] }) {
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = useMemo(
    () =>
      filter === "ALL"
        ? orders
        : orders.filter((order) => order.status === filter),
    [filter, orders],
  );

  if (orders.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ReceiptTextIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{t.account.orders.emptyAll}</EmptyTitle>
          <EmptyDescription>{t.account.orders.emptyAllDesc}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={`/${locale}/products`}>{t.common.browseProducts}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const detailHref = (orderId: string) => `/${locale}/account/orders/${orderId}`;

  const emptyFilteredText =
    filter === "PENDING"
      ? t.account.orders.emptyPending
      : filter === "ACTIVE"
        ? t.account.orders.emptyActive
        : t.account.orders.emptyAll;

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as Filter)}
      >
        <TabsList>
          <TabsTrigger value="ALL">{t.account.orders.filterAll}</TabsTrigger>
          <TabsTrigger value="PENDING">
            {t.account.orders.filterPending}
          </TabsTrigger>
          <TabsTrigger value="ACTIVE">
            {t.account.orders.filterActive}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptTextIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{emptyFilteredText}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* 桌面：表格 */}
          <div className="hidden rounded-lg border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.account.orders.columns.orderNo}</TableHead>
                  <TableHead>{t.account.orders.columns.product}</TableHead>
                  <TableHead>{t.account.orders.columns.amount}</TableHead>
                  <TableHead>{t.account.orders.columns.status}</TableHead>
                  <TableHead>{t.account.orders.columns.createdAt}</TableHead>
                  <TableHead className="text-right">
                    {t.account.orders.columns.action}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono type-order-no break-all">
                      {order.id}
                    </TableCell>
                    <TableCell>{order.productName}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(order.amount, locale)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatDateTime(order.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={detailHref(order.id)}>
                          {t.account.orders.viewDetail}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 移动端：卡片列表，与表格共用同一份数据 */}
          <ul className="flex flex-col gap-4 md:hidden">
            {filtered.map((order) => (
              <li
                key={order.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-mono type-order-no break-all text-muted-foreground">
                    {order.id}
                  </p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="type-card-title text-foreground">
                  {order.productName}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="tabular-nums text-foreground">
                    {formatCurrency(order.amount, locale)}
                  </p>
                  <p className="type-body-sm tabular-nums text-muted-foreground">
                    {formatDateTime(order.createdAt, locale)}
                  </p>
                </div>
                <Button asChild variant="outline" size="lg">
                  <Link href={detailHref(order.id)}>
                    {t.account.orders.viewDetail}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}