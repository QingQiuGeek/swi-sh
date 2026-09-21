"use client";

import { ArrowUpIcon, HeadsetIcon, PhoneIcon } from "lucide-react";

import { ContactChannels } from "@/components/blocks/contact-channels";
import { ServiceChat } from "@/components/blocks/service-chat";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useT } from "@/lib/i18n/provider";

/**
 * 工具轨按钮：44px 触控目标（触控目标最小值），图标用 lucide 默认的 24px
 * （独立图标，见 design.md §11），因此不用 Button 的 16px 图标规格。
 */
const RAIL_ITEM_CLASS =
  "flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * 首页右侧悬浮工具轨：在线客服（点击在按钮左侧弹出会话面板）、联系方式（悬停出提示框）、返回顶部。
 * 与 ScrollRail 一样只在首页挂载。断点取 xl（≥ 1280px）：1024–1279px 时内容区会伸到
 * 视口右侧约 40px 处，48px 的工具轨放不下，会压住内容；1280px 起容器到顶 1200px，才有富余空间。
 */
export function FloatingTools() {
  const t = useT();

  return (
    <>
      <div className="fixed top-1/2 right-4 z-30 hidden -translate-y-1/2 xl:block">
        <div className="flex w-12 flex-col items-center gap-0.5 rounded-xl border border-border bg-background p-0.5 shadow-sm">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={RAIL_ITEM_CLASS}>
                <HeadsetIcon aria-hidden="true" />
                <span className="sr-only">{t.tools.service}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="left"
              align="center"
              sideOffset={8}
              className="w-[20rem] gap-0 p-0"
            >
              <ServiceChat />
            </PopoverContent>
          </Popover>

          <HoverCard>
            <HoverCardTrigger asChild>
              <button type="button" className={RAIL_ITEM_CLASS}>
                <PhoneIcon aria-hidden="true" />
                <span className="sr-only">{t.tools.contact}</span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="left" align="center" className="w-72">
              <ContactChannels />
            </HoverCardContent>
          </HoverCard>

          <button
            type="button"
            className={RAIL_ITEM_CLASS}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUpIcon aria-hidden="true" />
            <span className="sr-only">{t.tools.backToTop}</span>
          </button>
        </div>
      </div>
    </>
  );
}