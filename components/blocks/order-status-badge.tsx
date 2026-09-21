"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/provider";
import type { OrderStatus } from "@/lib/types";

type StatusVariant =
  | "status-pending"
  | "status-active"
  | "status-cancelled"
  | "status-expired";

const VARIANT_BY_STATUS: Record<OrderStatus, StatusVariant> = {
  PENDING: "status-pending",
  ACTIVE: "status-active",
  CANCELLED: "status-cancelled",
  EXPIRED: "status-expired",
};

/** 订单状态徽标：颜色与文字同时出现，不允许只靠颜色区分状态 */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const t = useT();

  return (
    <Badge variant={VARIANT_BY_STATUS[status]} className={className}>
      {t.account.status[status]}
    </Badge>
  );
}