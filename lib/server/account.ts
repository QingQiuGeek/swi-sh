import type { User } from "@/lib/types";

import { hashPassword } from "./password";
import { store } from "./store";

/** 邮箱是否已被其他用户占用 */
export function isEmailTakenByOther(email: string, userId: string): boolean {
  const owner = store.userIdByEmail.get(email);

  return owner !== undefined && owner !== userId;
}

/** 更新用户名与邮箱，并同步邮箱唯一性索引 */
export function updateUserProfile(
  user: User,
  input: { username: string; email: string },
): User {
  const email = input.email.trim().toLowerCase();

  if (email !== user.email) {
    store.userIdByEmail.delete(user.email);
    store.userIdByEmail.set(email, user.id);
  }

  user.username = input.username.trim();
  user.email = email;
  user.updatedAt = new Date().toISOString();

  return user;
}

/** 重新哈希并替换密码 */
export function updateUserPassword(user: User, newPassword: string): User {
  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();

  return user;
}