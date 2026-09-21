import { ok } from "@/lib/server/api-response";
import { getProducts } from "@/lib/server/products";
import { resolveRequestLocale } from "@/lib/server/request-locale";

/** 产品列表；?locale= 优先，其次 Accept-Language，缺省 zh */
export async function GET(request: Request) {
  return ok(getProducts(resolveRequestLocale(request)));
}