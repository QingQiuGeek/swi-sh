import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * 客服助手使用的对话模型：走 OpenAI 兼容接口。
 * 四项配置全部从环境变量读取（模板见项目根目录 .example.env）：
 * AI_PROVIDER_NAME / AI_BASE_URL / AI_API_KEY / AI_MODEL。
 * 缺少任一项视为「未配置」，抛错由路由转成 500，避免把半配置状态带进模型请求。
 */
export function getChatModel() {
	const providerName = process.env.AI_PROVIDER_NAME;
	const baseURL = process.env.AI_BASE_URL;
	const apiKey = process.env.AI_API_KEY;
	const modelId = process.env.AI_MODEL;

	if (!baseURL || !apiKey || !modelId) {
		throw new Error('客服助手未配置');
	}

	const provider = createOpenAICompatible({
		name: providerName || 'chat-provider',
		baseURL,
		apiKey,
	});

	return provider(modelId);
}
