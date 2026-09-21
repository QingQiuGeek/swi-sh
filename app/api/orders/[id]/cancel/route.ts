import { fail, ok } from "@/lib/server/api-response";
import { renewSession } from "@/lib/server/auth";
import { cancelOrder, getOrderById } from "@/lib/server/orders";
import { resolveRequestLocale } from "@/lib/server/request-locale";
import { toOrderView } from "@/lib/types";

/** 取消订单：仅「待支付」可取消，否则返回 ORDER_NOT_CANCELLABLE */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const current = await renewSession();

  if (!current) {
    return fail("UNAUTHORIZED");
  }

  const { id } = await params;
  const order = getOrderById(id, current.user.id);

  if (!order) {
    return fail("NOT_FOUND");
  }

  if (order.status !== "PENDING") {
    return fail("ORDER_NOT_CANCELLABLE");
  }

  return ok(toOrderView(cancelOrder(order), resolveRequestLocale(request)));
}