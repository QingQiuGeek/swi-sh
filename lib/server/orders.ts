import { randomUUID } from "node:crypto";

import type { InsuredInfo, Order, VehicleInfo } from "@/lib/types";

import {
  getDedupOrderId,
  getOrderRecord,
  insertOrder,
  listUserOrderIds,
  saveOrder,
} from "./store";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * 已生效订单到期后转为已失效：读取时顺带结算并回写，
 * 不引入定时任务。回写后 Redis 里的状态才是最新的。
 */
async function syncExpiry(order: Order): Promise<Order> {
  if (
    order.status === "ACTIVE" &&
    order.expireAt &&
    new Date(order.expireAt).getTime() <= Date.now()
  ) {
    order.status = "EXPIRED";
    await saveOrder(order);
  }

  return order;
}

/** 某用户的全部订单，按下单时间倒序（索引本身已是倒序） */
export async function listOrdersByUser(userId: string): Promise<Order[]> {
  const ids = await listUserOrderIds(userId);
  const orders = await Promise.all(ids.map((id) => getOrderRecord(id)));

  return await Promise.all(
    orders
      .filter((order): order is Order => Boolean(order))
      .map((order) => syncExpiry(order)),
  );
}

/** 非本人订单一律视为不存在，页面据此走 404，不泄露资源存在性 */
export async function getOrderById(
  orderId: string,
  userId: string,
): Promise<Order | null> {
  const order = await getOrderRecord(orderId);

  if (!order || order.userId !== userId) {
    return null;
  }

  return await syncExpiry(order);
}

/** 同车同产品是否已有待支付或已生效订单 */
export async function findDuplicateOrder(
  userId: string,
  plateNo: string,
  productId: string,
): Promise<Order | null> {
  const orderId = await getDedupOrderId(userId, plateNo, productId);
  const order = orderId ? await getOrderRecord(orderId) : null;

  if (!order || order.userId !== userId) {
    return null;
  }

  const synced = await syncExpiry(order);

  return synced.status === "PENDING" || synced.status === "ACTIVE"
    ? synced
    : null;
}

/** 创建待支付订单；金额取产品当前价格快照，后续改价不影响历史订单 */
export async function createOrder(input: {
  userId: string;
  productId: string;
  productSnapshot: { nameZh: string; nameEn: string; price: number };
  insured: InsuredInfo;
  vehicle: VehicleInfo;
}): Promise<Order> {
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

  await insertOrder(order);

  return order;
}

/** 模拟支付：待支付 → 已生效，写入生效时间与到期时间（一年后） */
export async function payOrder(order: Order): Promise<Order> {
  const now = new Date();

  order.status = "ACTIVE";
  order.effectiveAt = now.toISOString();
  order.expireAt = new Date(now.getTime() + YEAR_MS).toISOString();
  await saveOrder(order);

  return order;
}

/** 取消订单：待支付 → 已取消 */
export async function cancelOrder(order: Order): Promise<Order> {
  order.status = "CANCELLED";
  await saveOrder(order);

  return order;
}