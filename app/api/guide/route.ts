import { ok } from "@/lib/server/api-response";
import { getGuide } from "@/lib/server/guide";
import { resolveRequestLocale } from "@/lib/server/request-locale";

/** 投保指引：步骤、材料与常见问题 */
export async function GET(request: Request) {
  return ok(getGuide(resolveRequestLocale(request)));
}