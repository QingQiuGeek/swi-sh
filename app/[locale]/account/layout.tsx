import { RequireAuth } from "@/components/auth/require-auth";
import { AccountShell } from "@/components/blocks/account-shell";
import { Container } from "@/components/layout/container";
import { readSession } from "@/lib/server/auth";

/**
 * 个人中心外壳。语言段由上层 [locale]/layout.tsx 校验，这里只关心登录态：
 * 未登录不重定向，渲染 RequireAuth 占位并自动弹出登录框，保留原 URL 与用户意图。
 */
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();

  return (
    <Container className="py-12 lg:py-16">
      {session ? (
        <AccountShell
          username={session.user.username}
          email={session.user.email}
        >
          {children}
        </AccountShell>
      ) : (
        <RequireAuth />
      )}
    </Container>
  );
}