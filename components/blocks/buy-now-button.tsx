"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

/**
 * 「立即投保」：产品卡片与产品详情页共用。
 * 未登录时先弹登录框，登录成功后原地进入投保表单，不丢失用户意图。
 */
export function BuyNowButton({
  slug,
  size = "lg",
  className,
}: {
  slug: string;
  /** 详情页用 lg；卡片内与「查看详情」等高用 default */
  size?: "default" | "lg";
  className?: string;
}) {
  const { locale, t } = useI18n();
  const { user, openAuthDialog } = useAuth();
  const router = useRouter();

  const purchasePath = `/${locale}/purchase/${slug}`;

  function handleClick() {
    if (user) {
      router.push(purchasePath);
      return;
    }

    openAuthDialog({
      description: t.auth.requireDesc,
      onSuccess: () => router.push(purchasePath),
    });
  }

  return (
    <Button
      type="button"
      size={size}
      className={className}
      onClick={handleClick}
    >
      {t.common.buyNow}
    </Button>
  );
}