import type { Order, Session, User } from "@/lib/types";

import { hashPassword } from "./password";

/**
 * 进程内存存储。用户、会话、订单只存在于 Node 进程里，
 * 重启或开发环境热更新后回到种子状态，不做持久化（见 docs/prd.md §10.3）。
 */
export type MemoryStore = {
  users: Map<string, User>;
  /** email（小写）→ userId，保证邮箱唯一 */
  userIdByEmail: Map<string, string>;
  sessions: Map<string, Session>;
  orders: Map<string, Order>;
  /** userId → orderId[]，按下单时间倒序 */
  orderIdsByUser: Map<string, string[]>;
  /** `${userId}:${plateNo}:${productId}` → orderId，用于拦截同车同产品重复投保 */
  orderDedupIndex: Map<string, string>;
};

export const DEMO_ACCOUNT = {
  email: "demo@example.com",
  password: "Demo1234",
} as const;

/** 生成去重索引键；车牌号统一大写，避免大小写绕过重复校验 */
export function dedupKey(userId: string, plateNo: string, productId: string) {
  return `${userId}:${plateNo.toUpperCase()}:${productId}`;
}

/** 写入订单并维护「用户订单列表」与「重复投保索引」 */
export function insertOrder(store: MemoryStore, order: Order) {
  store.orders.set(order.id, order);

  const ids = store.orderIdsByUser.get(order.userId) ?? [];
  store.orderIdsByUser.set(order.userId, [order.id, ...ids]);

  store.orderDedupIndex.set(
    dedupKey(order.userId, order.vehicle.plateNo, order.productId),
    order.id,
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

/** 种子数据：1 个演示账号 + 2 条不同状态的演示订单 */
function createStore(): MemoryStore {
  const store: MemoryStore = {
    users: new Map(),
    userIdByEmail: new Map(),
    sessions: new Map(),
    orders: new Map(),
    orderIdsByUser: new Map(),
    orderDedupIndex: new Map(),
  };

  const now = Date.now();
  const adminId = "usr-demo";

  const demoUser: User = {
    id: adminId,
    username: "DemoDriver",
    email: DEMO_ACCOUNT.email,
    passwordHash: hashPassword(DEMO_ACCOUNT.password),
    createdAt: new Date(now - 120 * DAY_MS).toISOString(),
    updatedAt: new Date(now - 120 * DAY_MS).toISOString(),
  };

  store.users.set(demoUser.id, demoUser);
  store.userIdByEmail.set(demoUser.email, demoUser.id);

  const activeCreatedAt = new Date(now - 40 * DAY_MS).toISOString();

  insertOrder(store, {
    id: "8f0c1f6e-3d8a-4a1f-9f2b-6a1d0c7b5e41",
    userId: adminId,
    productId: "prd-compulsory-traffic",
    productSnapshot: {
      nameZh: "交强险",
      nameEn: "Compulsory Traffic Insurance",
      price: 950,
    },
    insured: {
      name: "Demo Driver",
      idNo: "310101199001011234",
      phone: "13800000000",
    },
    vehicle: {
      plateNo: "沪A12345",
      brandModel: "大众 帕萨特 2021",
      vin: "LSVAM4185M2123456",
      registerYear: 2021,
    },
    amount: 950,
    status: "ACTIVE",
    createdAt: activeCreatedAt,
    effectiveAt: activeCreatedAt,
    expireAt: new Date(now - 40 * DAY_MS + YEAR_MS).toISOString(),
  });

  insertOrder(store, {
    id: "b7d4a2c9-5e63-4f08-8a71-2c9e4b0f7d13",
    userId: adminId,
    productId: "prd-commercial-comfort",
    productSnapshot: {
      nameZh: "商业险 · 畅行版",
      nameEn: "Commercial Cover · Comfort",
      price: 2680,
    },
    insured: {
      name: "Demo Driver",
      idNo: "310101199001011234",
      phone: "13800000000",
    },
    vehicle: {
      plateNo: "沪B67890",
      brandModel: "比亚迪 秦 PLUS",
      vin: "LGXC76C42N0123456",
      registerYear: 2022,
    },
    amount: 2680,
    status: "PENDING",
    createdAt: new Date(now - 3 * DAY_MS).toISOString(),
    effectiveAt: null,
    expireAt: null,
  });

  return store;
}

// 开发环境热更新会重新求值模块，挂到 globalThis 上避免内存数据被打散
const globalForStore = globalThis as unknown as { __swiStore?: MemoryStore };

export const store: MemoryStore = (globalForStore.__swiStore ??= createStore());