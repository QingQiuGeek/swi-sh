"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { fetchCurrentUser, setUnauthorizedHandler } from "@/lib/api-client";
import { useT } from "@/lib/i18n/provider";
import type { PublicUser } from "@/lib/types";

type AuthDialogOptions = {
  /** 覆盖弹窗里的说明文案，例如从需登录页面自动唤起时 */
  description?: string;
  /** 登录成功后的后续动作，例如跳转到投保表单 */
  onSuccess?: () => void;
};

type AuthDialogState = { open: boolean; description?: string };

type AuthContextValue = {
  /** 当前登录用户；由服务端布局通过 props 注入，变更后靠 router.refresh() 同步 */
  user: PublicUser | null;
  dialog: AuthDialogState;
  openAuthDialog: (options?: AuthDialogOptions) => void;
  closeAuthDialog: () => void;
  /** 登录 / 注册成功后的统一收尾：刷新服务端数据并执行调用方的后续动作 */
  handleAuthenticated: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: PublicUser | null;
  children: ReactNode;
}) {
  const t = useT();
  const router = useRouter();
  const [dialog, setDialog] = useState<AuthDialogState>({ open: false });
  /**
   * 登录成功后的回调放在 ref 里，不放进 state。
   *
   * `setDialog((current) => ...)` 的更新函数会被 React 在**渲染期**调用，
   * 把 `router.push` 这类副作用写进更新函数，就会变成「渲染一个组件时更新另一个组件」，
   * 触发 React 的 “Cannot update a component (Router) while rendering a different component”。
   * 是否踩到取决于该组件当时有没有待处理的更新（批量时机），所以表现为偶发。
   */
  const pendingSuccessRef = useRef<(() => void) | null>(null);

  const openAuthDialog = useCallback((options?: AuthDialogOptions) => {
    pendingSuccessRef.current = options?.onSuccess ?? null;
    setDialog({ open: true, description: options?.description });
  }, []);

  const closeAuthDialog = useCallback(() => {
    pendingSuccessRef.current = null;
    setDialog({ open: false });
  }, []);

  /**
   * 登录 / 注册成功：关弹窗 → 执行调用方后续动作 → 刷新服务端数据。
   *
   * 后两步的顺序不能反：`router.refresh()` 与 `router.push()` 同批发出时，push 会让 refresh 落空，
   * 共享的 `[locale]` 布局不会重新取（Header 的 initialUser 还停在未登录），
   * 表现为「登录成功了但 Header 仍显示登录 / 注册，手动刷新才变」。
   * 先 push 再 refresh，refresh 才作用在这条新路由上。
   */
  const handleAuthenticated = useCallback(() => {
    const onSuccess = pendingSuccessRef.current;
    pendingSuccessRef.current = null;

    setDialog({ open: false });
    onSuccess?.();
    router.refresh();
  }, [router]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }, [router]);

  // 会话过期：清除前端登录态并唤起登录弹窗，登录成功后停留在当前页面
  useEffect(() => {
    setUnauthorizedHandler(() => {
      router.refresh();
      setDialog({ open: true, description: t.auth.sessionExpired });
    });

    return () => setUnauthorizedHandler(null);
  }, [router, t.auth.sessionExpired]);

  // 每次进入站点做一次会话探测，顺带完成会话滑动续期
  const userId = initialUser?.id ?? null;

  useEffect(() => {
    if (userId) {
      void fetchCurrentUser<PublicUser>();
    }
  }, [userId]);

  return (
    <AuthContext.Provider
      value={{
        user: initialUser,
        dialog,
        openAuthDialog,
        closeAuthDialog,
        handleAuthenticated,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth 必须在 AuthProvider 内部使用");
  }

  return value;
}