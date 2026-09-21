import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthDialog } from "@/components/auth/auth-dialog";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { HtmlLang } from "@/components/layout/html-lang";
import { Toaster } from "@/components/ui/sonner";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/provider";
import { readSession, toPublicUser } from "@/lib/server/auth";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const t = getDictionary(locale);

  return {
    title: { default: t.meta.home.title, template: `%s | ${t.common.brand}` },
    description: t.meta.home.description,
  };
}

/**
 * 全站外壳。路由切换时这一层不重新挂载，因此把字典与登录态放在这里注入：
 * 子页面只管取数与编排，Header / Footer / 弹窗 / 提示只需挂一次。
 */
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const session = await readSession();

  return (
    <I18nProvider locale={locale} dictionary={getDictionary(locale)}>
      <AuthProvider initialUser={session ? toPublicUser(session.user) : null}>
        <HtmlLang locale={locale} />
        <div className="flex min-h-svh flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer locale={locale} />
        </div>
        <AuthDialog />
        {/* 本期只有浅色主题，显式固定 light，避免跟随系统深色渲染出未维护的暗色提示 */}
        <Toaster position="bottom-right" theme="light" />
      </AuthProvider>
    </I18nProvider>
  );
}