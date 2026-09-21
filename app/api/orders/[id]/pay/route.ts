import { fail, ok } from "@/lib/server/api-response";
import { renewSession } from "@/lib/server/auth";
import { getOrderById, payOrder } from "@/lib/server/orders";
import { resolveRequestLocale } from "@/lib/server/request-locale";
import { toOrderView } from "@/lib/types";

/** 模拟支付成功：订单由「待支付」转为「已生效」 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const current = await renewSession();

  if (!current) {
    return fail("UNAUTHORIZED");
  }

  const { id } = await params;
  const order = await getOrderById(id, current.user.id);

  if (!order) {
    return fail("NOT_FOUND");
  }

  if (order.status !== "PENDING") {
    return fail("ORDER_NOT_CANCELLABLE");
  }

  return ok(toOrderView(await payOrder(order), resolveRequestLocale(request)));
}