import { fail, ok } from "@/lib/server/api-response";
import {
  findUserByEmail,
  startSession,
  toPublicUser,
  verifyUserPassword,
} from "@/lib/server/auth";
import { createLoginSchema } from "@/lib/validation/auth";
import { FIELD_MESSAGE_CODES } from "@/lib/validation/messages";

/** 登录：邮箱或密码错误统一返回 INVALID_CREDENTIALS，不区分具体原因 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createLoginSchema(FIELD_MESSAGE_CODES).safeParse(body);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  const user = findUserByEmail(parsed.data.email);

  if (!user || !verifyUserPassword(user, parsed.data.password)) {
    return fail("INVALID_CREDENTIALS");
  }

  await startSession(user.id);

  return ok(toPublicUser(user));
}