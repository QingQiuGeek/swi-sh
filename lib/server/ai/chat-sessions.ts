import type { UIMessage } from "ai";

/**
 * 一个会话的聊天记录。会话 id 由浏览器生成并持久化在 localStorage，
 * 登录后绑定到 userId（见 app/api/chat/route.ts）。
 */
export type ChatSession = {
  id: string;
  /** 登录后写入；未登录保持 null */
  userId: string | null;
  messages: UIMessage[];
  updatedAt: number;
};

type ChatSessionStore = {
  sessions: Map<string, ChatSession>;
};

/** 会话数量上限，超出后淘汰最久未更新的，避免内存无上限增长 */
const MAX_SESSIONS = 200;
/** 单个会话保留的消息条数上限，只留最近的部分 */
const MAX_MESSAGES_PER_SESSION = 60;

/** 会话 id 由客户端提供，限制字符集与长度，避免脏 key 与超长 key */
export const CHAT_SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

function createChatSessionStore(): ChatSessionStore {
  return { sessions: new Map() };
}

// 与 lib/server/store.ts 同理：开发环境热更新会重新求值模块，挂到 globalThis 上保住内存数据
const globalForChatSessions = globalThis as unknown as {
  __swiChatSessions?: ChatSessionStore;
};

const chatSessionStore: ChatSessionStore = (globalForChatSessions.__swiChatSessions ??=
  createChatSessionStore());

/** 淘汰最久未更新的会话，调用前需确认已经超出上限 */
function evictOldest() {
  let oldestId: string | null = null;
  let oldestAt = Number.POSITIVE_INFINITY;

  for (const [id, session] of chatSessionStore.sessions) {
    if (session.updatedAt < oldestAt) {
      oldestAt = session.updatedAt;
      oldestId = id;
    }
  }

  if (oldestId) {
    chatSessionStore.sessions.delete(oldestId);
  }
}

/** 读取会话；不存在返回 null */
export function getChatSession(sessionId: string): ChatSession | null {
  return chatSessionStore.sessions.get(sessionId) ?? null;
}

/**
 * 写入会话记录。每次请求都用客户端送来的完整消息列表覆盖，
 * 因此登录后调用一次即可把当前会话绑定到 userId。
 */
export function saveChatSession(input: {
  sessionId: string;
  userId: string | null;
  messages: UIMessage[];
}): ChatSession {
  const messages = input.messages.slice(-MAX_MESSAGES_PER_SESSION);

  const session: ChatSession = {
    id: input.sessionId,
    // 已绑定过的会话不因为某次请求没带 Cookie 而丢绑定
    userId: input.userId ?? getChatSession(input.sessionId)?.userId ?? null,
    messages,
    updatedAt: Date.now(),
  };

  chatSessionStore.sessions.set(input.sessionId, session);

  if (chatSessionStore.sessions.size > MAX_SESSIONS) {
    evictOldest();
  }

  return session;
}

/** 调用方能否读取该会话：未绑定的匿名会话凭随机 id 即可读，已绑定则必须是本人 */
export function canReadChatSession(
  session: ChatSession,
  userId: string | null,
): boolean {
  return session.userId === null || session.userId === userId;
}