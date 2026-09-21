"use client";

import Link from "next/link";
import { cn } from "cn";
import { LogInIcon, LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale, useT } from "@/lib/i18n/provider";
import { SECTION_IDS, type SectionId } from "@/lib/section-nav";

/** 移动端导航抽屉：点击导航项后自动收起 */
export function MobileNav({
  open,
  onOpenChange,
  activeSection,
  onSelectSection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSection: SectionId | null;
  onSelectSection: (id: SectionId) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const { user, openAuthDialog, signOut } = useAuth();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>{t.header.menuTitle}</SheetTitle>
          <SheetDescription className="sr-only">
            {t.header.menuLabel}
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label={t.header.menuLabel}
          className="flex flex-col gap-1 px-4"
        >
          {SECTION_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-current={activeSection === id ? "true" : undefined}
              onClick={() => {
                onOpenChange(false);
                onSelectSection(id);
              }}
              className={cn(
                "rounded-md px-3 py-3 text-left text-base font-medium transition-colors duration-150 hover:bg-accent hover:text-accent-foreground",
                activeSection === id ? "text-primary" : "text-foreground",
              )}
            >
              {t.nav[id]}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
          {user ? (
            <>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
              <Button asChild variant="outline" size="lg">
                <Link href={`/${locale}/account`} onClick={() => onOpenChange(false)}>
                  {t.header.account}
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => {
                  onOpenChange(false);
                  void signOut().then(() =>
                    toast.success(t.header.logoutSuccess),
                  );
                }}
              >
                <LogOutIcon data-icon="inline-start" />
                {t.header.logout}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="lg"
              onClick={() => {
                onOpenChange(false);
                openAuthDialog();
              }}
            >
              <LogInIcon data-icon="inline-start" />
              {t.header.loginRegister}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}