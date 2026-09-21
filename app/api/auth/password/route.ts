import { fail, ok } from "@/lib/server/api-response";
import { updateUserPassword } from "@/lib/server/account";
import {
  destroyOtherSessions,
  renewSession,
  verifyUserPassword,
} from "@/lib/server/auth";
import { createPasswordSchema } from "@/lib/validation/auth";
import { FIELD_MESSAGE_CODES } from "@/lib/validation/messages";

/** 修改密码：成功后作废该用户的其它会话，当前会话保留 */
export async function POST(request: Request) {
  const current = await renewSession();

  if (!current) {
    return fail("UNAUTHORIZED");
  }

  const body = await request.json().catch(() => null);
  const parsed = createPasswordSchema(FIELD_MESSAGE_CODES).safeParse(body);

  if (!parsed.success) {
    // 新密码强度不足是字段级错误，独立成码贴到「新密码」字段
    const weakNewPassword = parsed.error.issues.some(
      (issue) => issue.path[0] === "newPassword",
    );

    return fail(weakNewPassword ? "TOO_WEAK" : "VALIDATION_ERROR");
  }

  const { currentPassword, newPassword } = parsed.data;

  if (!verifyUserPassword(current.user, currentPassword)) {
    return fail("INVALID_PASSWORD");
  }

  if (currentPassword === newPassword) {
    return fail("SAME_PASSWORD");
  }

  updateUserPassword(current.user, newPassword);
  destroyOtherSessions(current.user.id, current.session.id);

  return ok({ updated: true });
}