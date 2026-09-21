import { tool } from "ai";
import { z } from "zod";

import type { Locale } from "@/lib/i18n/config";
import { listOrdersByUser } from "@/lib/server/orders";
import { getProducts } from "@/lib/server/products";
import { PRODUCT_CATEGORIES } from "@/lib/types";

/** 每次返回的产品条数上限，产品总量很小，这里只是防止把上下文撑爆 */
const MAX_PRODUCT_RESULTS = 6;
/** 每次返回的订单条数上限 */
const MAX_ORDER_RESULTS = 10;

/**
 * 产品查询：按关键词 / 分类 / 价格上限过滤在售产品。
 * 结果按当前语言返回名称与保障文案，价格是后端 mock 的唯一数据源。
 */
export function createProductSearchTool(locale: Locale) {
  return tool({
    description:
      "Search the car insurance products currently on sale. Use this for any question about " +
      "products, prices, coverage, applicable vehicles or product recommendations. " +
      "Returns at most 6 products with id, slug, name, category, yearly price, coverage details " +
      "and tagline. Always call this instead of answering product or price questions from memory.",
    inputSchema: z.object({
      keyword: z
        .string()
        .optional()
        .describe(
          "Free-text keyword matched against product name, tagline and coverage titles/descriptions.",
        ),
      category: z
        .enum(PRODUCT_CATEGORIES)
        .optional()
        .describe(
          "statutory = compulsory traffic insurance, commercial-package = bundled commercial cover, single = single-risk cover.",
        ),
      maxPrice: z
        .number()
        .positive()
        .optional()
        .describe("Only return products whose yearly price is less than or equal to this value, in CNY."),
    }),
    execute: async ({ keyword, category, maxPrice }) => {
      const normalizedKeyword = keyword?.trim().toLowerCase();

      const products = getProducts(locale)
        .filter((product) => (category ? product.category === category : true))
        .filter((product) => (maxPrice ? product.price <= maxPrice : true))
        .filter((product) => {
          if (!normalizedKeyword) {
            return true;
          }

          const haystack = [
            product.name,
            product.tagline,
            product.coverageText ?? "",
            ...product.coverages.flatMap((coverage) => [
              coverage.title,
              coverage.desc,
            ]),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedKeyword);
        })
        .slice(0, MAX_PRODUCT_RESULTS);

      return {
        total: products.length,
        products: products.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category,
          yearlyPrice: product.price,
          coverageAmount: product.coverageAmount,
          coverageText: product.coverageText,
          tagline: product.tagline,
          applicableVehicles: product.applicableVehicles,
          coverages: product.coverages,
          detailPath: `/products/${product.slug}`,
        })),
      };
    },
  });
}

/**
 * 订单查询：只返回当前登录用户自己的订单。
 *
 * 参数里的 userId 由模型从 system instructions 中带入；这里再与本次请求
 * 服务端解析出的登录用户比对一次，模型无法通过伪造该参数读到别人的订单。
 */
export function createOrderQueryTool(options: {
  authedUserId: string | null;
  locale: Locale;
}) {
  const { authedUserId, locale } = options;

  return tool({
    description:
      "Query the signed-in user's own insurance orders / policies. " +
      "Requires the signed-in user id. When the user is not signed in the tool reports " +
      "that login is required and returns no data. " +
      "Never guess order details without calling this tool.",
    inputSchema: z.object({
      userId: z
        .string()
        .describe(
          "Id of the currently signed-in user, exactly as given in the system instructions. Use an empty string when the user is not signed in.",
        ),
    }),
    execute: async ({ userId }) => {
      const requested = userId.trim();

      if (!requested || requested !== authedUserId) {
        return {
          requiresLogin: true,
          message:
            locale === "en"
              ? "The user is not signed in. Ask them to register or sign in before any order question is answered."
              : "当前用户未登录。订单相关问题必须先请用户注册或登录后再查询。",
        };
      }

      const orders = listOrdersByUser(requested).slice(0, MAX_ORDER_RESULTS);

      return {
        total: orders.length,
        statusLegend:
          "PENDING = awaiting payment, ACTIVE = in force, CANCELLED = cancelled, EXPIRED = expired",
        orders: orders.map((order) => ({
          orderId: order.id,
          productName:
            locale === "en"
              ? order.productSnapshot.nameEn
              : order.productSnapshot.nameZh,
          amount: order.amount,
          status: order.status,
          createdAt: order.createdAt,
          effectiveAt: order.effectiveAt,
          expireAt: order.expireAt,
          vehicle: {
            plateNo: order.vehicle.plateNo,
            brandModel: order.vehicle.brandModel,
          },
        })),
      };
    },
  });
}