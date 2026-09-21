"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

/**
 * 产品详情页的「立即投保」。
 * 未登录时先弹登录框，登录成功后原地进入投保表单，不丢失用户意图。
 */
export function BuyNowButton({
  slug,
  className,
}: {
  slug: string;
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
      size="lg"
      className={className}
      onClick={handleClick}
    >
      {t.products.detail.buyNow}
    </Button>
  );
}