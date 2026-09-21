import type { User } from "@/lib/types";

import { hashPassword } from "./password";
import {
  getEmailOwner,
  normalizeEmail,
  releaseEmail,
  saveUser,
  saveUserEmailIndex,
} from "./store";

/** 邮箱是否已被其他用户占用 */
export async function isEmailTakenByOther(
  email: string,
  userId: string,
): Promise<boolean> {
  const owner = await getEmailOwner(email);

  return owner !== null && owner !== userId;
}

/** 更新用户名与邮箱，并同步邮箱唯一性索引 */
export async function updateUserProfile(
  user: User,
  input: { username: string; email: string },
): Promise<User> {
  const email = normalizeEmail(input.email);

  if (email !== user.email) {
    await saveUserEmailIndex(email, user.id);
    await releaseEmail(user.email);
  }

  user.username = input.username.trim();
  user.email = email;
  user.updatedAt = new Date().toISOString();
  await saveUser(user);

  return user;
}

/** 重新哈希并替换密码 */
export async function updateUserPassword(
  user: User,
  newPassword: string,
): Promise<User> {
  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  await saveUser(user);

  return user;
}