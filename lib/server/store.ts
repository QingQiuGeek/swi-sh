import type { Order, Session, User } from "@/lib/types";

import { hashPassword } from "./password";
import { getRedis, redisKeys } from "./redis";

/**
 * Redis 数据访问层。账户、会话、订单存放在 Upstash Redis 里，
 * 因此在 Vercel 这类多实例 / Serverless 环境下也能共享（见 docs/prd.md §10.3）。
 * 产品、指引、案例是构建期 import 的只读 mock JSON，跨实例天然一致，不走这里。
 */

export const DEMO_ACCOUNT = {
  email: "demo@example.com",
  password: "Demo1234",
} as const;

/** 邮箱索引统一按小写存，避免同一邮箱大小写不同被注册两次 */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/* ---------- 用户 ---------- */

export async function getUserById(userId: string): Promise<User | null> {
  await ensureStoreReady();

  return await getRedis().get<User>(redisKeys.user(userId));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = await getEmailOwner(email);

  return userId ? await getUserById(userId) : null;
}

/** 邮箱索引里的 userId；未被占用返回 null */
export async function getEmailOwner(email: string): Promise<string | null> {
  await ensureStoreReady();

  return await getRedis().get<string>(redisKeys.email(normalizeEmail(email)));
}

/**
 * 抢占邮箱。SETNX 是原子操作，多个实例同时注册同一邮箱只有一个能成功，
 * 比「先查后写」更稳。
 */
export async function claimEmail(
  email: string,
  userId: string,
): Promise<boolean> {
  await ensureStoreReady();

  const result = await getRedis().set(
    redisKeys.email(normalizeEmail(email)),
    userId,
    { nx: true },
  );

  return result === "OK";
}

/** 覆盖写入邮箱索引，仅在调用方已确认该邮箱未被他人占用时使用（改资料） */
export async function saveUserEmailIndex(
  email: string,
  userId: string,
): Promise<void> {
  await getRedis().set(redisKeys.email(normalizeEmail(email)), userId);
}

/** 改邮箱时释放旧地址的占位 */
export async function releaseEmail(email: string): Promise<void> {
  await getRedis().del(redisKeys.email(normalizeEmail(email)));
}

export async function saveUser(user: User): Promise<void> {
  await getRedis().set(redisKeys.user(user.id), user);
}

/* ---------- 会话 ---------- */

/** 会话带 TTL 落 Redis，过期由 Redis 自动清理，不依赖进程存活 */
export async function saveSession(
  session: Session,
  ttlSeconds: number,
): Promise<void> {
  await getRedis().set(redisKeys.session(session.id), session, {
    ex: ttlSeconds,
  });
}

export async function getSessionRecord(
  sessionId: string,
): Promise<Session | null> {
  return await getRedis().get<Session>(redisKeys.session(sessionId));
}

export async function deleteSessionRecord(sessionId: string): Promise<void> {
  await getRedis().del(redisKeys.session(sessionId));
}

/** 用户 → 会话 id 集合，用于改密码时精准踢掉其它登录设备 */
export async function addUserSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  await getRedis().sadd(redisKeys.userSessions(userId), sessionId);
}

export async function removeUserSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  await getRedis().srem(redisKeys.userSessions(userId), sessionId);
}

/** 作废该用户除 keepSessionId 之外的全部会话 */
export async function invalidateOtherSessions(
  userId: string,
  keepSessionId: string,
): Promise<void> {
  const redis = getRedis();
  const sessionIds = await redis.smembers<string[]>(
    redisKeys.userSessions(userId),
  );
  const stale = (sessionIds ?? []).filter((id) => id !== keepSessionId);

  if (stale.length > 0) {
    await redis.del(...stale.map((id) => redisKeys.session(id)));
  }

  await redis.del(redisKeys.userSessions(userId));
  await redis.sadd(redisKeys.userSessions(userId), keepSessionId);
}

/* ---------- 订单 ---------- */

/** 写入订单，同时维护「用户订单列表」与「重复投保索引」 */
export async function insertOrder(order: Order): Promise<void> {
  await ensureStoreReady();

  const redis = getRedis();

  await redis.set(redisKeys.order(order.id), order);
  await redis.lpush(redisKeys.userOrders(order.userId), order.id);
  await redis.set(
    redisKeys.dedup(order.userId, order.vehicle.plateNo, order.productId),
    order.id,
  );
}

/** 只回写订单本体，用于支付 / 取消 / 到期结算 */
export async function saveOrder(order: Order): Promise<void> {
  await getRedis().set(redisKeys.order(order.id), order);
}

export async function getOrderRecord(orderId: string): Promise<Order | null> {
  return await getRedis().get<Order>(redisKeys.order(orderId));
}

/** 用户订单 id 列表，越新的越靠前 */
export async function listUserOrderIds(userId: string): Promise<string[]> {
  await ensureStoreReady();

  const ids = await getRedis().lrange<string>(
    redisKeys.userOrders(userId),
    0,
    -1,
  );

  return ids ?? [];
}

/** 同车同产品已有订单时返回该订单 id */
export async function getDedupOrderId(
  userId: string,
  plateNo: string,
  productId: string,
): Promise<string | null> {
  await ensureStoreReady();

  return await getRedis().get<string>(
    redisKeys.dedup(userId, plateNo, productId),
  );
}

/* ---------- 演示数据 ---------- */

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

/** 1 个演示账号 + 2 条不同状态的演示订单 */
function buildSeedData(): { user: User; orders: Order[] } {
  const now = Date.now();
  const userId = "usr-demo";

  const user: User = {
    id: userId,
    username: "DemoDriver",
    email: DEMO_ACCOUNT.email,
    passwordHash: hashPassword(DEMO_ACCOUNT.password),
    createdAt: new Date(now - 120 * DAY_MS).toISOString(),
    updatedAt: new Date(now - 120 * DAY_MS).toISOString(),
  };

  const activeCreatedAt = new Date(now - 40 * DAY_MS).toISOString();

  const orders: Order[] = [
    {
      id: "8f0c1f6e-3d8a-4a1f-9f2b-6a1d0c7b5e41",
      userId,
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
    },
    {
      id: "b7d4a2c9-5e63-4f08-8a71-2c9e4b0f7d13",
      userId,
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
    },
  ];

  return { user, orders };
}

/**
 * 幂等种子写入。每条记录都用 SETNX，多实例并发启动也只会写进一份，
 * 且只写不覆盖，不会冲掉用户后来注册或下单的数据。
 */
async function seedStore(): Promise<void> {
  const redis = getRedis();
  const { user, orders } = buildSeedData();

  await redis.set(redisKeys.user(user.id), user, { nx: true });
  await redis.set(redisKeys.email(user.email), user.id, { nx: true });

  for (const order of orders) {
    const created = await redis.set(redisKeys.order(order.id), order, {
      nx: true,
    });

    if (created !== "OK") {
      continue;
    }

    await redis.lpush(redisKeys.userOrders(order.userId), order.id);
    await redis.set(
      redisKeys.dedup(order.userId, order.vehicle.plateNo, order.productId),
      order.id,
      { nx: true },
    );
  }
}

let seedPromise: Promise<void> | null = null;

/** 每个进程只做一次种子写入；失败后置空，下次调用重试 */
export function ensureStoreReady(): Promise<void> {
  seedPromise ??= seedStore().catch((error: unknown) => {
    seedPromise = null;
    throw error;
  });

  return seedPromise;
}