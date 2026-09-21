import { ClockIcon } from "lucide-react";

import type { GuideStep } from "@/lib/types";

/**
 * 投保流程步骤：序号 + 标题 + 说明 + 预计耗时。
 * 数据由页面取好传入，组件不查字典、不发请求；桌面横向排列，移动端竖排。
 */
export function StepList({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((step) => (
        <li key={step.id} className="flex flex-col gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary type-caption text-primary-foreground">
            {step.sortOrder}
          </span>
          <p className="type-h3 text-foreground">{step.title}</p>
          <p className="type-body-sm text-muted-foreground">{step.desc}</p>
          <p className="flex items-center gap-1.5 type-body-sm text-muted-foreground">
            <ClockIcon aria-hidden="true" className="size-4 shrink-0" />
            {step.duration}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** 步骤列表的加载态 */
export function StepListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {["s1", "s2", "s3", "s4"].map((key) => (
        <div key={key} className="flex flex-col gap-3">
          <div className="size-8 rounded-full bg-muted" />
          <div className="h-5 w-3/4 rounded-sm bg-muted" />
          <div className="h-4 w-full rounded-sm bg-muted" />
          <div className="h-4 w-1/2 rounded-sm bg-muted" />
        </div>
      ))}
    </div>
  );
}