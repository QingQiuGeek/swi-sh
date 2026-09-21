import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** 生成 `salt:hash` 形式的 scrypt 哈希；内存演示场景够用，且不落地明文 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `${salt}:${derived}`;
}

/** 恒定时间比对，避免通过响应时间反推密码 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");

  if (!salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}