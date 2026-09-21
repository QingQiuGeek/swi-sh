import { fail, ok } from "@/lib/server/api-response";
import { renewSession, toPublicUser } from "@/lib/server/auth";

/**
 * 当前登录用户。未登录时返回 UNAUTHORIZED（这不是错误路径，
 * 前端据此渲染「登录 / 注册」入口，不会弹出登录弹窗）。
 * 调用本接口同时完成会话滑动续期。
 */
export async function GET() {
  const current = await renewSession();

  if (!current) {
    return fail("UNAUTHORIZED");
  }

  return ok(toPublicUser(current.user));
}