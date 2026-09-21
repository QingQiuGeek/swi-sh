import { createAgentUIStreamResponse, type UIMessage } from "ai";

import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { createSupportAgent } from "@/lib/server/ai/agent";
import {
  CHAT_SESSION_ID_PATTERN,
  canReadChatSession,
  getChatSession,
  saveChatSession,
} from "@/lib/server/ai/chat-sessions";
import { fail, ok } from "@/lib/server/api-response";
import { readSession } from "@/lib/server/auth";

/** 流式对话的时长上限，与 AI SDK 文档推荐的 30s 对齐 */
export const maxDuration = 30;

type ChatRequestBody = {
  messages?: UIMessage[];
  sessionId?: string;
  locale?: string;
};

/**
 * 客服对话。登录态一律由服务端读 Cookie 会话判定，前端传什么都不影响，
 * 因此「未登录请先登录」这道门无法在前端伪造。
 */
export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return fail("VALIDATION_ERROR", "Request body is not valid JSON.");
  }

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const locale = isLocale(body.locale) ? body.locale : DEFAULT_LOCALE;

  if (!CHAT_SESSION_ID_PATTERN.test(sessionId) || messages.length === 0) {
    return fail("VALIDATION_ERROR");
  }

  const current = await readSession();
  const userId = current?.user.id ?? null;

  // 维护「会话 id → 聊天记录」：登录后这一步就把匿名会话绑到了 userId
  saveChatSession({ sessionId, userId, messages });

  try {
    const agent = createSupportAgent({
      locale,
      userId,
      userName: current?.user.username ?? null,
    });

    return createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      // 上游模型会吐思维链（如 glm-5.3 的 reasoning_content），界面只渲染正文，
      // 关掉可省掉这份流量
      sendReasoning: false,
      // 流结束后再存一次完整列表（含本次助手回复）。只在请求前存的话，
      // 助手回复只存在于浏览器内存，刷新后就只剩用户自己的提问。
      onEnd: ({ messages: settled }) => {
        saveChatSession({ sessionId, userId, messages: settled as UIMessage[] });
      },
      // 流已开始后上游才报错（鉴权失败、模型未开通等）时，AI SDK 默认只回一句
      // 「An error occurred.」，前端拿不到原因。这里把真实报错打到服务端日志。
      onError: (error) => {
        console.error("[chat] 客服助手调用失败：", error);

        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "客服助手暂时不可用";

    return fail("INTERNAL_ERROR", message);
  }
}

/** 拉取该会话的历史记录，用于重新打开对话框时恢复上下文 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";

  if (!CHAT_SESSION_ID_PATTERN.test(sessionId)) {
    return fail("VALIDATION_ERROR");
  }

  const session = getChatSession(sessionId);

  if (!session) {
    return ok({ messages: [] });
  }

  const current = await readSession();

  // 已绑定用户的会话只回给本人；匿名会话凭随机 id 读取
  if (!canReadChatSession(session, current?.user.id ?? null)) {
    return fail("FORBIDDEN");
  }

  return ok({ messages: session.messages });
}