"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "cn";
import { usePathname } from "next/navigation";

import { useI18n } from "@/lib/i18n/provider";

/**
 * 个人中心外壳：桌面左侧边栏 + 右侧内容区，移动端顶部横向可滚动导航。
 * 用 next/link 导航而不是 Tabs，保证四个 Tab 都能深链接、刷新与浏览器前进后退。
 */
export function AccountShell({
  username,
  email,
  children,
}: {
  username: string;
  email: string;
  children: ReactNode;
}) {
  const { locale, t } = useI18n();
  const pathname = usePathname();

  const items = [
    { href: `/${locale}/account`, label: t.account.nav.overview, exact: true },
    { href: `/${locale}/account/orders`, label: t.account.nav.orders },
    { href: `/${locale}/account/profile`, label: t.account.nav.profile },
    { href: `/${locale}/account/password`, label: t.account.nav.password },
  ];

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
      <aside className="flex flex-col gap-6">
        <div className="hidden flex-col gap-1 rounded-lg border border-border bg-card p-5 lg:flex">
          <p className="type-card-title truncate text-foreground">{username}</p>
          <p className="type-body-sm truncate text-muted-foreground">{email}</p>
        </div>

        <nav
          aria-label={t.account.title}
          className="-mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        >
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 shrink-0 items-center rounded-md px-4 text-sm font-medium transition-colors duration-150 hover:bg-accent hover:text-accent-foreground",
                  active
                    ? "bg-accent text-primary"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </div>
  );
}