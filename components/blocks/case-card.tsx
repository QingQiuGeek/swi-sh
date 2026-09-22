"use client";

import { cn } from "cn";
import {
  BikeIcon,
  CarIcon,
  CloudRainIcon,
  HandCoinsIcon,
  HeartPulseIcon,
  KeyRoundIcon,
  SparklesIcon,
  WindIcon,
  WrenchIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/i18n/provider";
import type { CaseIcon, CaseView } from "@/lib/types";

/** 配图位：与产品卡片一样用图标 + 浅底代替真实素材，图标按案例类型选 */
const CASE_ICON_COMPONENTS: Record<CaseIcon, typeof CarIcon> = {
  car: CarIcon,
  rain: CloudRainIcon,
  wind: WindIcon,
  bike: BikeIcon,
  wrench: WrenchIcon,
  health: HeartPulseIcon,
  sparkles: SparklesIcon,
  key: KeyRoundIcon,
};

/** 投保案例卡片：图标 + 「城市 · 车主」+ 车牌与投保产品 + 理赔摘要与车主原话 */
export function CaseCard({
  item,
  className,
}: {
  item: CaseView;
  className?: string;
}) {
  const t = useT();
  const Icon = CASE_ICON_COMPONENTS[item.icon];

  return (
    <Card
      className={cn(
        "h-full shadow-xs transition-shadow duration-150 hover:shadow-sm",
        className,
      )}
    >
      <CardHeader>
        <div
          aria-hidden="true"
          className="mb-2 flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
        >
          <Icon className="size-6" />
        </div>
        <CardTitle className="type-card-title">
          {item.city} · {item.ownerName}
        </CardTitle>
        <CardDescription className="flex flex-col gap-1">
          <span className="type-order-no tabular-nums">{item.plateNo}</span>
          <span className="type-body-sm">{item.productName}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <Separator />
        <p className="type-body-sm text-foreground">{item.summary}</p>
        <p className="type-body-sm text-muted-foreground">{item.quote}</p>
        <p className="mt-auto flex items-center gap-1.5 type-caption text-highlight">
          <HandCoinsIcon aria-hidden="true" className="size-4 shrink-0" />
          {t.cases.claimDays.replace("{days}", String(item.claimDays))}
        </p>
      </CardContent>
    </Card>
  );
}