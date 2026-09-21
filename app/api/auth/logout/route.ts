import { ok } from "@/lib/server/api-response";
import { endSession } from "@/lib/server/auth";

/** 退出登录：删除会话并清除 Cookie，重复调用同样安全 */
export async function POST() {
  await endSession();

  return ok({ signedOut: true });
}