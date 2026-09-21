import { fail, ok } from "@/lib/server/api-response";
import { isEmailTakenByOther, updateUserProfile } from "@/lib/server/account";
import { renewSession, toPublicUser } from "@/lib/server/auth";
import { createProfileSchema } from "@/lib/validation/auth";
import { FIELD_MESSAGE_CODES } from "@/lib/validation/messages";

/** 修改资料：用户名与邮箱均可改，邮箱需通过唯一性校验 */
export async function PATCH(request: Request) {
  const current = await renewSession();

  if (!current) {
    return fail("UNAUTHORIZED");
  }

  const body = await request.json().catch(() => null);
  const parsed = createProfileSchema(FIELD_MESSAGE_CODES).safeParse(body);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR");
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (isEmailTakenByOther(email, current.user.id)) {
    return fail("EMAIL_TAKEN");
  }

  return ok(toPublicUser(updateUserProfile(current.user, parsed.data)));
}