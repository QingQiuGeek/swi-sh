"use client";

import { useEffect } from "react";
import { LogInIcon } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useT } from "@/lib/i18n/provider";

/**
 * 未登录访问需登录页面时的占位。
 * 不重定向，保留 URL 与用户意图；挂载后自动打开登录弹窗，登录成功原地进入页面。
 */
export function RequireAuth() {
  const t = useT();
  const { openAuthDialog } = useAuth();
  const description = t.auth.requireDesc;

  useEffect(() => {
    openAuthDialog({ description });
  }, [description, openAuthDialog]);

  return (
    <Empty className="min-h-[60vh]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LogInIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{t.auth.requireTitle}</EmptyTitle>
        <EmptyDescription>{t.auth.requireDesc}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => openAuthDialog({ description })}>
          {t.auth.requireAction}
        </Button>
      </EmptyContent>
    </Empty>
  );
}