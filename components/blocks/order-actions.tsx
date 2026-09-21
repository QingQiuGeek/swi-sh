"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { apiSend } from "@/lib/api-client";
import { errorMessage } from "@/lib/i18n/errors";
import { useT } from "@/lib/i18n/provider";
import type { OrderStatus, OrderView } from "@/lib/types";

/** 订单操作区：仅「待支付」订单显示，模拟支付与取消订单 */
export function OrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState<"pay" | "cancel" | null>(null);

  if (status !== "PENDING") {
    return null;
  }

  async function submit(action: "pay" | "cancel") {
    setPending(action);

    const result = await apiSend<OrderView>(
      `/api/orders/${orderId}/${action}`,
      "POST",
    );

    setPending(null);

    if (!result.success) {
      toast.error(errorMessage(t, result.code));
      return;
    }

    toast.success(
      action === "pay" ? t.account.detail.paySuccess : t.account.detail.cancelSuccess,
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="lg" disabled={pending !== null}>
            {pending === "cancel" ? <Spinner data-icon="inline-start" /> : null}
            {pending === "cancel" ? t.account.detail.cancelling : t.account.detail.cancel}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.account.detail.cancelConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.account.detail.cancelConfirmDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.account.detail.cancelDismiss}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void submit("cancel");
              }}
            >
              {t.account.detail.cancelConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button
        type="button"
        size="lg"
        disabled={pending !== null}
        onClick={() => void submit("pay")}
      >
        {pending === "pay" ? <Spinner data-icon="inline-start" /> : null}
        {pending === "pay" ? t.account.detail.paying : t.account.detail.pay}
      </Button>
    </div>
  );
}