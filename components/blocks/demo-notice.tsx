"use client";

import { InfoIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useT } from "@/lib/i18n/provider";

/** 演示数据声明，出现在首页、关于我们与页脚等位置 */
export function DemoNotice({ className }: { className?: string }) {
  const t = useT();

  return (
    <Alert className={className}>
      <InfoIcon aria-hidden="true" />
      <AlertDescription>{t.common.demoNotice}</AlertDescription>
    </Alert>
  );
}