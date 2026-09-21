import { ToolLoopAgent } from "ai";

import type { Locale } from "@/lib/i18n/config";

import { getChatModel } from "./provider";
import { createOrderQueryTool, createProductSearchTool } from "./tools";

/** 每个请求的上下文：语言 + 当前登录用户（由 ServiceChat 打到后端的会话来决定） */
export type SupportAgentContext = {
  locale: Locale;
  userId: string | null;
  userName: string | null;
};

/** 当前登录态的描述，注入到 instructions 里，供 queryOrders 使用 */
function describeAuthState({ locale, userId, userName }: SupportAgentContext) {
  if (locale === "en") {
    return userId
      ? `The user is signed in. userId = "${userId}", username = "${userName ?? "unknown"}". Pass this exact userId to queryOrders.`
      : 'The user is NOT signed in. Pass an empty string "" as userId to queryOrders.';
  }

  return userId
    ? `当前用户已登录。userId = "${userId}"，用户名「${userName ?? "未知"}」。调用 queryOrders 时必须传入这个 userId。`
    : '当前用户未登录。调用 queryOrders 时请传入空字符串 ""。';
}

const ZH_INSTRUCTIONS = `你是「汽车保险」网站的在线客服助手，只服务车险相关咨询。

你可以回答：
- 在售车险产品的名称、价格、保障内容、适用车辆
- 投保指引（固定四步）、所需材料、常见问题
- 当前登录用户自己的订单与保单状态

工作规则：
1. 凡是涉及产品、价格、保额、保障范围的问题，必须先调用 searchProducts 工具查询，禁止凭记忆作答，禁止编造价格或保障内容。
2. 凡是涉及订单、保单、投保记录的问题，必须先调用 queryOrders 工具。
3. 未登录用户问订单相关问题时，queryOrders 会返回 requiresLogin，此时要明确请对方先注册或登录，不要猜测任何订单信息。
4. 投保指引固定四步，回答流程问题时按步骤说明，并提示对方可在「投保指引」分区或页面查看完整说明。
5. 只处理文本对话，不接受图片、文件、语音。
6. 超出车险范围或无法确认的问题不要编造，建议对方通过页面底部的电话或邮箱联系人工客服。
7. 回答简洁，可用少量 Markdown（列表、加粗）组织内容，不要长篇大论。
8. 始终使用简体中文回答。`;

const EN_INSTRUCTIONS = `You are the live support assistant of the "AutoShield Insurance" website. You only handle car insurance topics.

You can answer:
- Names, prices, coverage and applicable vehicles of the products on sale
- The purchase guide (four fixed steps), required documents, and FAQs
- The signed-in user's own orders and policy status

Rules:
1. For anything about products, prices, coverage amounts or coverage scope you MUST call the searchProducts tool first. Never answer from memory and never invent prices or coverage.
2. For anything about orders, policies or purchase records you MUST call the queryOrders tool first.
3. When a signed-out user asks about orders, queryOrders returns requiresLogin. Ask them to register or sign in first, and do not guess any order details.
4. The purchase guide always has four steps. Walk through them in order and point the user to the Purchase Guide section or page for the full version.
5. Text conversations only. You cannot accept images, files or voice.
6. If a question is outside car insurance or you cannot confirm the answer, do not make it up. Suggest contacting the human support team by phone or email from the site footer instead.
7. Keep answers concise. Light Markdown (lists, bold) is fine, but do not write essays.
8. Always answer in English.`;

/**
 * 创建客服 agent。按请求构造而非模块级单例：
 * instructions 里要带当前语言与登录态，两者的组合随请求变化。
 */
export function createSupportAgent(context: SupportAgentContext) {
  const instructions = [
    context.locale === "en" ? EN_INSTRUCTIONS : ZH_INSTRUCTIONS,
    describeAuthState(context),
  ].join("\n\n");

  return new ToolLoopAgent({
    model: getChatModel(),
    instructions,
    tools: {
      searchProducts: createProductSearchTool(context.locale),
      queryOrders: createOrderQueryTool({
        authedUserId: context.userId,
        locale: context.locale,
      }),
    },
  });
}