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
 * 悬浮工具轨：在线客服（点击在按钮左侧弹出会话面板）、联系方式（悬停出提示框）、返回顶部。
 * 与 ScrollRail 一样只在首页挂载。
 *
 * 位置：任何宽度都显示，且始终在视口右侧**垂直居中**（`top-1/2 -translate-y-1/2`），
 * 只让贴边距离随断点收一点（移动 12px、≥ 1280px 16px）。
 *
 * 不再按断点隐藏（原先的 `hidden xl:block` 会让窗口一缩小整条工具轨消失、客服入口不可达），
 * 也不做右下角停靠。代价是 < 1280px 时内容区右缘只剩容器内边距（桌面 40px / 平板 32px / 移动 20px），
 * 48px 的竖轨会压住正文 20–40px——这是「始终居中」换来的确定性，换取入口任何宽度都可达。
 */
export function FloatingTools() {
  const t = useT();

  return (
    <div className="fixed top-1/2 right-3 z-30 -translate-y-1/2 xl:right-4">
      <div className="flex w-12 flex-col items-center gap-0.5 rounded-xl border border-border bg-background p-0.5 shadow-sm">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={RAIL_ITEM_CLASS}>
              <HeadsetIcon aria-hidden="true" />
              <span className="sr-only">{t.tools.service}</span>
            </button>
          </PopoverTrigger>
          {/* max-w 用视口宽度兜底：窄屏下 320px 面板不能顶到屏幕左缘 */}
          <PopoverContent
            side="left"
            align="center"
            sideOffset={8}
            collisionPadding={16}
            className="w-[20rem] max-w-[calc(100vw_-_4.5rem)] gap-0 p-0"
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
          <HoverCardContent
            side="left"
            align="center"
            collisionPadding={16}
            className="w-72 max-w-[calc(100vw_-_4.5rem)]"
          >
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
  );
}