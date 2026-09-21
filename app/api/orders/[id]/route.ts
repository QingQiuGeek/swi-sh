import { fail, ok } from "@/lib/server/api-response";
import { renewSession } from "@/lib/server/auth";
import { getOrderById } from "@/lib/server/orders";
import { resolveRequestLocale } from "@/lib/server/request-locale";
import { toOrderView } from "@/lib/types";

/** 订单详情；不存在或非本人订单一律返回 NOT_FOUND，不泄露资源存在性 */
export async function GET(
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

  return ok(toOrderView(order, resolveRequestLocale(request)));
}