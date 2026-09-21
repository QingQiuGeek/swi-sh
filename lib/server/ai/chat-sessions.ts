import type { UIMessage } from "ai";

import { getRedis, redisKeys } from "../redis";

/**
 * 一个会话的聊天记录。会话 id 由浏览器生成并持久化在 localStorage，
 * 登录后绑定到 userId（见 app/api/chat/route.ts）。
 * 记录存 Redis 并带 TTL，多实例之间共享，刷新或换实例都能读回上下文。
 */
export type ChatSession = {
  id: string;
  /** 登录后写入；未登录保持 null */
  userId: string | null;
  messages: UIMessage[];
  updatedAt: number;
};

/** 单个会话保留的消息条数上限，只留最近的部分 */
const MAX_MESSAGES_PER_SESSION = 60;
/** 聊天记录有效期 7 天，之后由 Redis 自动清理，替代原来的条数淘汰策略 */
const CHAT_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** 会话 id 由客户端提供，限制字符集与长度，避免脏 key 与超长 key */
export const CHAT_SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** 读取会话；不存在返回 null */
export async function getChatSession(
  sessionId: string,
): Promise<ChatSession | null> {
  return await getRedis().get<ChatSession>(redisKeys.chatSession(sessionId));
}

/**
 * 写入会话记录。每次请求都用客户端送来的完整消息列表覆盖，
 * 因此登录后调用一次即可把当前会话绑定到 userId。
 */
export async function saveChatSession(input: {
  sessionId: string;
  userId: string | null;
  messages: UIMessage[];
}): Promise<ChatSession> {
  const messages = input.messages.slice(-MAX_MESSAGES_PER_SESSION);
  const existing = await getChatSession(input.sessionId);

  const session: ChatSession = {
    id: input.sessionId,
    // 已绑定过的会话不因为某次请求没带 Cookie 而丢绑定
    userId: input.userId ?? existing?.userId ?? null,
    messages,
    updatedAt: Date.now(),
  };

  await getRedis().set(redisKeys.chatSession(input.sessionId), session, {
    ex: CHAT_SESSION_TTL_SECONDS,
  });

  return session;
}

/** 调用方能否读取该会话：未绑定的匿名会话凭随机 id 即可读，已绑定则必须是本人 */
export function canReadChatSession(
  session: ChatSession,
  userId: string | null,
): boolean {
  return session.userId === null || session.userId === userId;
}