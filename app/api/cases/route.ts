import { ok } from "@/lib/server/api-response";
import { getCases } from "@/lib/server/cases";
import { resolveRequestLocale } from "@/lib/server/request-locale";

/** 投保案例：首页案例分区的数据来源 */
export async function GET(request: Request) {
  return ok(getCases(resolveRequestLocale(request)));
}