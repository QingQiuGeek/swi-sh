"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "cn";
import { LogOutIcon, MenuIcon } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Container } from "@/components/layout/container";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale, useT } from "@/lib/i18n/provider";
import { useSectionNav } from "@/lib/hooks/use-section-nav";
import { SECTION_IDS } from "@/lib/section-nav";

/** 吸顶 Header：品牌 / 分区导航 / 语言切换 / 登录注册 */
export function Header() {
  const t = useT();
  const locale = useLocale();
  const { user, openAuthDialog, signOut } = useAuth();
  const { activeSection, goToSection } = useSectionNav();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <Container className="flex h-15 items-center justify-between gap-6 lg:h-18">
        <Link
          href={`/${locale}`}
          className="flex shrink-0 items-center gap-2"
        >
          <Image
            src="/next.svg"
            alt=""
            width={394}
            height={80}
            className="h-5 w-auto"
            unoptimized
            priority
          />
          <span className="font-heading text-base font-semibold">
            {t.common.brand}
          </span>
        </Link>

        <nav
          aria-label={t.header.menuLabel}
          className="hidden items-center gap-1 lg:flex"
        >
          {SECTION_IDS.map((id) => (
            <Link
              key={id}
              href={`/${locale}`}
              onClick={(event) => {
                event.preventDefault();
                goToSection(id);
              }}
              aria-current={activeSection === id ? "true" : undefined}
              className={cn(
                "rounded-md px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 hover:bg-accent hover:text-accent-foreground",
                activeSection === id ? "text-primary" : "text-muted-foreground",
              )}
            >
              {t.nav[id]}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="lg" className="gap-2">
                  <Avatar className="size-6">
                    <AvatarFallback>
                      {user.username.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-28 truncate sm:inline">
                    {user.username}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" aria-label={t.header.accountMenuLabel}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="truncate">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/account`}>{t.header.account}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      void signOut().then(() =>
                        toast.success(t.header.logoutSuccess),
                      );
                    }}
                  >
                    <LogOutIcon />
                    {t.header.logout}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              size="lg"
              className="hidden lg:inline-flex"
              onClick={() => openAuthDialog()}
            >
              {t.header.loginRegister}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="lg:hidden"
            aria-label={t.header.openMenu}
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </Button>
        </div>
      </Container>

      <MobileNav
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        activeSection={activeSection}
        onSelectSection={goToSection}
      />
    </header>
  );
}