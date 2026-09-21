import { fail, ok } from "@/lib/server/api-response";
import { findUserByEmail, registerUser, startSession, toPublicUser } from "@/lib/server/auth";
import { FIELD_MESSAGE_CODES } from "@/lib/validation/messages";
import { createRegisterSchema } from "@/lib/validation/auth";

/** 注册：邮箱唯一，成功后直接签发会话 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createRegisterSchema(FIELD_MESSAGE_CODES).safeParse(body);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  if (findUserByEmail(parsed.data.email)) {
    return fail("EMAIL_TAKEN");
  }

  const user = registerUser(parsed.data);
  await startSession(user.id);

  return ok(toPublicUser(user), 201);
}