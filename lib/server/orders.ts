import { randomUUID } from "node:crypto";

import type { InsuredInfo, Order, VehicleInfo } from "@/lib/types";

import { dedupKey, insertOrder, store } from "./store";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** 已生效订单到期后转为已失效：读取时顺带结算，不引入定时任务 */
function syncExpiry(order: Order): Order {
  if (
    order.status === "ACTIVE" &&
    order.expireAt &&
    new Date(order.expireAt).getTime() <= Date.now()
  ) {
    order.status = "EXPIRED";
  }

  return order;
}

/** 某用户的全部订单，按下单时间倒序（索引本身已是倒序） */
export function listOrdersByUser(userId: string): Order[] {
  const ids = store.orderIdsByUser.get(userId) ?? [];

  return ids
    .map((id) => store.orders.get(id))
    .filter((order): order is Order => Boolean(order))
    .map(syncExpiry);
}

/** 非本人订单一律视为不存在，页面据此走 404，不泄露资源存在性 */
export function getOrderById(orderId: string, userId: string): Order | null {
  const order = store.orders.get(orderId);

  if (!order || order.userId !== userId) {
    return null;
  }

  return syncExpiry(order);
}

/** 同车同产品是否已有待支付或已生效订单 */
export function findDuplicateOrder(
  userId: string,
  plateNo: string,
  productId: string,
): Order | null {
  const orderId = store.orderDedupIndex.get(
    dedupKey(userId, plateNo, productId),
  );
  const order = orderId ? store.orders.get(orderId) : undefined;

  if (!order || order.userId !== userId) {
    return null;
  }

  const synced = syncExpiry(order);

  return synced.status === "PENDING" || synced.status === "ACTIVE"
    ? synced
    : null;
}

/** 创建待支付订单；金额取产品当前价格快照，后续改价不影响历史订单 */
export function createOrder(input: {
  userId: string;
  productId: string;
  productSnapshot: { nameZh: string; nameEn: string; price: number };
  insured: InsuredInfo;
  vehicle: VehicleInfo;
}): Order {
  const order: Order = {
    id: randomUUID(),
    userId: input.userId,
    productId: input.productId,
    productSnapshot: input.productSnapshot,
    insured: input.insured,
    vehicle: input.vehicle,
    amount: input.productSnapshot.price,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    effectiveAt: null,
    expireAt: null,
  };

  insertOrder(store, order);

  return order;
}

/** 模拟支付：待支付 → 已生效，写入生效时间与到期时间（一年后） */
export function payOrder(order: Order): Order {
  const now = new Date();

  order.status = "ACTIVE";
  order.effectiveAt = now.toISOString();
  order.expireAt = new Date(now.getTime() + YEAR_MS).toISOString();

  return order;
}

/** 取消订单：待支付 → 已取消 */
export function cancelOrder(order: Order): Order {
  order.status = "CANCELLED";

  return order;
}