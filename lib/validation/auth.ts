import { z } from "zod";

import type { ValidationMessages } from "./messages";

/** 用户名 2–20 字符，允许中英文与数字 */
const USERNAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9]{2,20}$/;

/** 至少 8 位，且同时包含字母与数字 */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)\S{8,}$/;

/** 注册：用户名 + 邮箱 + 密码 */
export function createRegisterSchema(m: ValidationMessages) {
  return z.object({
    username: z.string().trim().regex(USERNAME_PATTERN, m.username),
    email: z.email(m.email),
    password: z.string().regex(PASSWORD_PATTERN, m.password),
  });
}

/** 登录只需要非空，不套用注册的强度规则 */
export function createLoginSchema(m: ValidationMessages) {
  return z.object({
    email: z.email(m.email),
    password: z.string().min(1, m.required),
  });
}

/** 修改资料：用户名与邮箱均可改 */
export function createProfileSchema(m: ValidationMessages) {
  return z.object({
    username: z.string().trim().regex(USERNAME_PATTERN, m.username),
    email: z.email(m.email),
  });
}

/**
 * 修改密码的服务端字段。接口不接收确认密码，因此这一份是权威规则，
 * 前端的 createPasswordFormSchema 在它之上补「确认新密码」。
 */
export function createPasswordSchema(m: ValidationMessages) {
  return z.object({
    currentPassword: z.string().min(1, m.required),
    newPassword: z.string().regex(PASSWORD_PATTERN, m.password),
  });
}

/** 修改密码的前端表单：多一个确认字段，两次输入不一致时错误贴到确认字段 */
export function createPasswordFormSchema(m: ValidationMessages) {
  return createPasswordSchema(m)
    .extend({ confirmPassword: z.string().min(1, m.required) })
    .superRefine((data, ctx) => {
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          message: m.confirmPassword,
          path: ["confirmPassword"],
        });
      }
    });
}

export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;
export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type ProfileInput = z.infer<ReturnType<typeof createProfileSchema>>;
export type PasswordInput = z.infer<ReturnType<typeof createPasswordSchema>>;
export type PasswordFormInput = z.infer<
  ReturnType<typeof createPasswordFormSchema>
>;