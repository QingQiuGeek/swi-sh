"use client";

import { useEffect } from "react";

import { Container } from "@/components/layout/container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/provider";

/** 页面级错误兜底：告知失败原因并提供重试，不暴露原始错误栈 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container className="flex flex-col gap-6 py-16 lg:py-24">
      <Alert variant="destructive">
        <AlertTitle>{t.common.errorTitle}</AlertTitle>
        <AlertDescription>{t.common.errorDesc}</AlertDescription>
      </Alert>
      <div>
        <Button type="button" size="lg" onClick={reset}>
          {t.common.retry}
        </Button>
      </div>
    </Container>
  );
}