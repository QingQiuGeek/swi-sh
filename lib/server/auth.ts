import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import type { PublicUser, Session, User } from "@/lib/types";

import { hashPassword, verifyPassword } from "./password";
import { store } from "./store";

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

export function findUserByEmail(email: string): User | null {
  const userId = store.userIdByEmail.get(email.trim().toLowerCase());

  return userId ? (store.users.get(userId) ?? null) : null;
}

export function findUserById(userId: string): User | null {
  return store.users.get(userId) ?? null;
}

export function registerUser(input: {
  username: string;
  email: string;
  password: string;
}): User {
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const user: User = {
    id: randomUUID(),
    username: input.username.trim(),
    email,
    passwordHash: hashPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };

  store.users.set(user.id, user);
  store.userIdByEmail.set(email, user.id);

  return user;
}

export function verifyUserPassword(user: User, password: string): boolean {
  return verifyPassword(password, user.passwordHash);
}

/* ---------- 会话 ---------- */

export function createSession(userId: string): Session {
  const session: Session = {
    id: randomUUID(),
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  store.sessions.set(session.id, session);

  return session;
}

/**
 * 读取当前会话。只读、不续期，因此可以安全地在服务端组件里调用。
 * 过期的会话会被顺手清理。
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

  const session = store.sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    store.sessions.delete(sessionId);
    return null;
  }

  const user = store.users.get(session.userId);

  if (!user) {
    store.sessions.delete(sessionId);
    return null;
  }

  return { session, user };
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
  const current = await readSession();

  if (!current) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  current.session.expiresAt = Date.now() + SESSION_TTL_MS;
  cookieStore.set(SESSION_COOKIE, current.session.id, SESSION_COOKIE_OPTIONS);

  return current;
}

/** 登录成功后签发会话并写入 HttpOnly Cookie，只能在 Route Handler 中调用 */
export async function startSession(userId: string): Promise<Session> {
  const session = createSession(userId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session.id, SESSION_COOKIE_OPTIONS);

  return session;
}

/** 退出登录：删除当前会话并清除 Cookie */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    store.sessions.delete(sessionId);
  }

  cookieStore.delete(SESSION_COOKIE);
}

/** 修改密码后作废该用户的其它会话，当前会话保留 */
export function destroyOtherSessions(userId: string, keepSessionId: string) {
  for (const [id, session] of store.sessions) {
    if (session.userId === userId && id !== keepSessionId) {
      store.sessions.delete(id);
    }
  }
}