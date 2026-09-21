"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

type AuthDialogState = AuthDialogOptions & { open: boolean };

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

  const openAuthDialog = useCallback((options?: AuthDialogOptions) => {
    setDialog({ open: true, ...options });
  }, []);

  const closeAuthDialog = useCallback(() => {
    setDialog((current) => ({ ...current, open: false }));
  }, []);

  const handleAuthenticated = useCallback(() => {
    router.refresh();
    setDialog((current) => {
      current.onSuccess?.();
      return { open: false };
    });
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