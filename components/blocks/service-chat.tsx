"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { HeadsetIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/provider";

/** 会话 id 存在 localStorage，重开浏览器后仍能找回同一份聊天记录 */
const SESSION_STORAGE_KEY = "swi_chat_session";

/** 首次访问生成会话 id；后端用正则校验格式，这里生成的是标准 UUID */
function resolveSessionId(): string {
  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (stored) {
    return stored;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, created);

  return created;
}

/** 会话 id 与历史记录都就绪后，才挂载内层对话 */
type LoadedChat = {
  sessionId: string;
  messages: UIMessage[];
};

/** * 在线客服面板：悬浮工具轨「在线客服」按钮的 Popover 内容。
 *
 * 外层负责准备会话 id 与历史记录，拿到之后才挂载内层对话，
 * 这样 useChat 的初始消息只需在挂载时给一次，不必处理中途回填。
 */
export function ServiceChat() {
  const { t } = useI18n();
  const [chat, setChat] = useState<LoadedChat | null>(null);

  useEffect(() => {
    const sessionId = resolveSessionId();
    let cancelled = false;

    // 只在异步回调里写 state：effect 体内同步 setState 会触发级联渲染
    const settle = (messages: UIMessage[]) => {
      if (!cancelled) {
        setChat({ sessionId, messages });
      }
    };

    fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`)
      .then((response) => response.json())
      .then((payload: { data?: { messages?: UIMessage[] } }) =>
        settle(payload.data?.messages ?? []),
      )
      .catch(() => settle([]));

    return () => {
      cancelled = true;
    };
  }, []);

  if (!chat) {
    return (
      <div className="flex h-[16.8rem] items-center justify-center gap-2 text-muted-foreground">
        <Spinner />
        <span className="type-caption">{t.tools.chatLoading}</span>
      </div>
    );
  }

  return <ChatPanel initialMessages={chat.messages} sessionId={chat.sessionId} />;
}

function ChatPanel({
  sessionId,
  initialMessages,
}: {
  sessionId: string;
  initialMessages: UIMessage[];
}) {
  const { locale, t } = useI18n();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sessionId, locale },
      }),
    [sessionId, locale],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport,
  });

  // 只发送文本：PromptInput 可能把文件带到 files 里，这里一律忽略
  const handleSubmit = useCallback(
    async ({ text }: PromptInputMessage) => {
      const trimmed = text.trim();

      if (!trimmed) {
        return;
      }

      await sendMessage({ text: trimmed });
    },
    [sendMessage],
  );

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-border p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HeadsetIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="type-card-title">{t.tools.service}</p>
          <p className="type-caption text-muted-foreground">
            {t.about.serviceHours}
          </p>
        </div>
      </div>

      <Conversation className="h-[16.8rem] flex-none">
        <ConversationContent className="gap-4 p-3">
          {messages.length === 0 ? (
            // 用 children 覆盖组件内置的空态：默认 title / description 是写死的英文，
            // 会漏进中文界面
            <ConversationEmptyState className="p-4">
              <p className="type-body-sm max-w-[85%] rounded-lg bg-muted px-3 py-2 text-foreground">
                {t.tools.chatGreeting}
              </p>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${message.id}-${index}`}>
                        {part.text}
                      </MessageResponse>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              disabled={isBusy}
              placeholder={t.tools.chatPlaceholder}
            />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              aria-label={isBusy ? t.tools.chatStop : t.tools.chatSend}
              onStop={stop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>

        {status === "error" ? (
          <p className="type-caption text-destructive" role="alert">
            {t.tools.chatError}
          </p>
        ) : null}
      </div>
    </div>
  );
}