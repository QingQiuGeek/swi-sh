import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import type { PublicUser, Session, User } from "@/lib/types";

import { hashPassword, verifyPassword } from "./password";
import {
  addUserSession,
  claimEmail,
  deleteSessionRecord,
  getSessionRecord,
  getUserByEmail,
  getUserById,
  invalidateOtherSessions,
  normalizeEmail,
  releaseEmail,
  removeUserSession,
  saveSession,
  saveUser,
} from "./store";

export const SESSION_COOKIE = "swi_session";

/** 会话有效期 1 小时，滑动续期（无绝对上限） */
export const SESSION_TTL_SECONDS = 60 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

/** 去掉密码哈希，得到可以返回给前端的用户信息 */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return await getUserByEmail(email);
}

export async function findUserById(userId: string): Promise<User | null> {
  return await getUserById(userId);
}

/**
 * 注册新用户。邮箱占用靠 SETNX 原子抢占，撞车时返回 null，
 * 调用方据此回 EMAIL_TAKEN。
 */
export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
}): Promise<User | null> {
  const email = normalizeEmail(input.email);
  const now = new Date().toISOString();

  const user: User = {
    id: randomUUID(),
    username: input.username.trim(),
    email,
    passwordHash: hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };

  if (!(await claimEmail(email, user.id))) {
    return null;
  }

  try {
    await saveUser(user);
  } catch (error) {
    // 写用户失败就释放邮箱占位，否则这个邮箱会永久注册不上
    await releaseEmail(email);
    throw error;
  }

  return user;
}

export function verifyUserPassword(user: User, password: string): boolean {
  return verifyPassword(password, user.passwordHash);
}

/* ---------- 会话 ---------- */

export async function createSession(userId: string): Promise<Session> {
  const session: Session = {
    id: randomUUID(),
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  await saveSession(session, SESSION_TTL_SECONDS);
  await addUserSession(userId, session.id);

  return session;
}

/** 按会话 id 取会话与用户；过期或用户已不存在时顺手清理 */
async function loadSession(
  sessionId: string,
): Promise<{ session: Session; user: User } | null> {
  const session = await getSessionRecord(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    await deleteSessionRecord(sessionId);
    return null;
  }

  const user = await getUserById(session.userId);

  if (!user) {
    await deleteSessionRecord(sessionId);
    return null;
  }

  return { session, user };
}

/**
 * 读取当前会话。只读、不续期，因此可以安全地在服务端组件里调用。
 */
export async function readSession(): Promise<{
  session: Session;
  user: User;
} | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  return await loadSession(sessionId);
}

/**
 * 校验会话并滑动续期（有效期顺延为当前时间 + 1 小时）。
 * 续期需要重写 Cookie，只能在 Route Handler 或 Server Action 中调用，
 * 不能在服务端组件渲染路径中调用。
 */
export async function renewSession(): Promise<{
  session: Session;
  user: User;
} | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const current = sessionId ? await loadSession(sessionId) : null;

  if (!current) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  current.session.expiresAt = Date.now() + SESSION_TTL_MS;
  // 重新 SET 一次，Cookie 与服务端 TTL 一起顺延
  await saveSession(current.session, SESSION_TTL_SECONDS);
  cookieStore.set(SESSION_COOKIE, current.session.id, SESSION_COOKIE_OPTIONS);

  return current;
}

/** 登录成功后签发会话并写入 HttpOnly Cookie，只能在 Route Handler 中调用 */
export async function startSession(userId: string): Promise<Session> {
  const session = await createSession(userId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session.id, SESSION_COOKIE_OPTIONS);

  return session;
}

/** 退出登录：删除当前会话并清除 Cookie */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    const session = await getSessionRecord(sessionId);

    if (session) {
      await removeUserSession(session.userId, sessionId);
    }

    await deleteSessionRecord(sessionId);
  }

  cookieStore.delete(SESSION_COOKIE);
}

/** 修改密码后作废该用户的其它会话，当前会话保留 */
export async function destroyOtherSessions(
  userId: string,
  keepSessionId: string,
): Promise<void> {
  await invalidateOtherSessions(userId, keepSessionId);
}