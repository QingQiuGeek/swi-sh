import { Redis } from "@upstash/redis";

/**
 * Upstash Redis 客户端。
 *
 * Vercel 的 Upstash 集成会按项目名给变量加前缀（本项目是 `swi_`），
 * 本地手动配置时通常没有前缀，两套名字都读，换环境不用改代码。
 */
const URL_ENV_NAMES = [
  "swi_KV_REST_API_URL",
  "KV_REST_API_URL",
  "UPSTASH_REDIS_REST_URL",
] as const;

const TOKEN_ENV_NAMES = [
  "swi_KV_REST_API_TOKEN",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

/** 读取环境变量，顺带去掉 `.env` 里可能残留的包裹引号 */
function readEnv(names: readonly string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim().replace(/^["']|["']$/g, "").trim();

    if (value) {
      return value;
    }
  }

  return null;
}

let client: Redis | null = null;

/**
 * 取 Redis 客户端。懒加载而不是在模块顶层创建：
 * `next build` 预渲染时也会求值这些模块，顶层抛错会直接让构建失败。
 */
export function getRedis(): Redis {
  if (client) {
    return client;
  }

  const url = readEnv(URL_ENV_NAMES);
  const token = readEnv(TOKEN_ENV_NAMES);

  if (!url || !token) {
    throw new Error(
      `Redis 未配置：请在 .env 中设置 ${URL_ENV_NAMES[0]} 与 ${TOKEN_ENV_NAMES[0]}（Vercel 的 Upstash 集成会自动写入）。`,
    );
  }

  client = new Redis({ url, token });

  return client;
}

/** 统一键前缀，避免和同一个实例里的其它数据撞车 */
const PREFIX = "swi";

/** 全部 Redis 键集中定义，读写两侧不会拼错 */
export const redisKeys = {
  user: (userId: string) => `${PREFIX}:user:${userId}`,
  email: (email: string) => `${PREFIX}:email:${email}`,
  session: (sessionId: string) => `${PREFIX}:session:${sessionId}`,
  userSessions: (userId: string) => `${PREFIX}:usessions:${userId}`,
  order: (orderId: string) => `${PREFIX}:order:${orderId}`,
  userOrders: (userId: string) => `${PREFIX}:uorders:${userId}`,
  /** 同车同产品重复投保索引；车牌统一大写，避免大小写绕过校验 */
  dedup: (userId: string, plateNo: string, productId: string) =>
    `${PREFIX}:dedup:${userId}:${plateNo.toUpperCase()}:${productId}`,
  chatSession: (sessionId: string) => `${PREFIX}:chat:${sessionId}`,
} as const;