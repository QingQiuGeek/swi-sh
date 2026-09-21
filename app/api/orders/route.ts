import { fail, ok } from "@/lib/server/api-response";
import { renewSession } from "@/lib/server/auth";
import { createOrder, findDuplicateOrder, listOrdersByUser } from "@/lib/server/orders";
import { getProductSnapshot } from "@/lib/server/products";
import { resolveRequestLocale } from "@/lib/server/request-locale";
import { ORDER_STATUSES, toOrderView, type OrderStatus } from "@/lib/types";
import { createOrderSchema } from "@/lib/validation/order";
import { FIELD_MESSAGE_CODES } from "@/lib/validation/messages";

/** 我的订单列表，可选 ?status= 筛选 */
export async function GET(request: Request) {
  const current = await renewSession();

  if (!current) {
    return fail("UNAUTHORIZED");
  }

  const statusParam = new URL(request.url).searchParams.get("status");
  const locale = resolveRequestLocale(request);
  let orders = listOrdersByUser(current.user.id);

  if (statusParam) {
    if (!(ORDER_STATUSES as readonly string[]).includes(statusParam)) {
      return fail("VALIDATION_ERROR");
    }

    orders = orders.filter((order) => order.status === (statusParam as OrderStatus));
  }

  return ok(orders.map((order) => toOrderView(order, locale)));
}

/** 提交投保：创建待支付订单 */
export async function POST(request: Request) {
  const current = await renewSession();

  if (!current) {
    return fail("UNAUTHORIZED");
  }

  const body = await request.json().catch(() => null);

  if (typeof body !== "object" || body === null) {
    return fail("VALIDATION_ERROR");
  }

  const { productSlug, ...formValues } = body as Record<string, unknown>;

  if (typeof productSlug !== "string") {
    return fail("VALIDATION_ERROR");
  }

  const parsed = createOrderSchema(FIELD_MESSAGE_CODES).safeParse(formValues);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  const product = getProductSnapshot(productSlug);

  if (!product) {
    return fail("NOT_FOUND");
  }

  if (findDuplicateOrder(current.user.id, parsed.data.vehicle.plateNo, product.id)) {
    return fail("DUPLICATE_ORDER");
  }

  const order = createOrder({
    userId: current.user.id,
    productId: product.id,
    productSnapshot: {
      nameZh: product.nameZh,
      nameEn: product.nameEn,
      price: product.price,
    },
    insured: parsed.data.insured,
    // 表单里的年份是 Select 的字符串值，落库前转成数字
    vehicle: {
      ...parsed.data.vehicle,
      registerYear: Number(parsed.data.vehicle.registerYear),
    },
  });

  return ok(toOrderView(order, resolveRequestLocale(request)), 201);
}