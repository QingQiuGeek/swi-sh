"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "cn";
import { UsersIcon } from "lucide-react";

import { CaseCard } from "@/components/blocks/case-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useT } from "@/lib/i18n/provider";
import type { CaseView } from "@/lib/types";

/** 匀速位移速度（px/秒）：慢到能读完一张卡，快到不显得拖沓 */
const MARQUEE_SPEED_PX_PER_SECOND = 80;

/** 单帧最大步长（秒）：标签页被挂起后回到前台不会跳一大段 */
const MAX_FRAME_DELTA_SECONDS = 0.1;

/** 轨道渲染几份卡片：两份即可无缝衔接（滚动一屏的宽度远小于一份的宽度） */
const TRACK_COPIES = 2;

/** 「减少动态效果」偏好：用 matchMedia 订阅，服务端渲染时按未开启处理 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onStoreChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);

  query.addEventListener("change", onStoreChange);

  return () => query.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/**
 * 投保案例横向轨道：匀速从右向左无缝循环播放。
 * - 卡片复制一份接在末尾，位移到「一份的宽度」时立即回到 0，视觉上完全连续，不会回卷到开头
 * - 鼠标悬停或键盘聚焦时停住（聚焦即可停下来慢慢读），移开 / 失焦后继续
 * - `prefers-reduced-motion: reduce` 时不做任何动画，只静态展示第一屏
 * - 数据由 Page 在服务端取好传入；loading / error 由路由级 loading.tsx、error.tsx 承担
 */
export function CaseCarousel({
  cases,
  className,
}: {
  cases: CaseView[];
  className?: string;
}) {
  const t = useT();
  const viewportRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  /** 一份卡片的宽度（含间距），位移到这里就无缝回到起点 */
  const setWidthRef = useRef(0);
  /** 鼠标悬停时停住；用 ref 而不是 state，避免鼠标移动触发整列重渲染 */
  const hoverHoldRef = useRef(false);
  /** 键盘聚焦时停住；与悬停互相独立，失焦不会把悬停的停住状态一起清掉 */
  const focusHoldRef = useRef(false);
  /** 轨道是否在视口内 */
  const visibleRef = useRef(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  /** 量出一份卡片的总宽度：第二份的第一张与第一张的偏移差 */
  const measureSetWidth = useCallback(() => {
    const row = rowRef.current;
    const first = row?.children[0];
    const second = row?.children[cases.length];

    if (
      first instanceof HTMLElement &&
      second instanceof HTMLElement &&
      second.offsetLeft > first.offsetLeft
    ) {
      setWidthRef.current = second.offsetLeft - first.offsetLeft;
    }
  }, [cases.length]);

  // 字号、语言与窗口宽度都会改变卡片宽度，尺寸变化后重新量一次
  useEffect(() => {
    measureSetWidth();

    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(measureSetWidth);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [measureSetWidth]);

  // 视口内才动画：用户还在 Hero 区时不必空转
  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.3 },
    );

    observer.observe(viewport);

    return () => observer.disconnect();
  }, [cases.length]);

  // 无缝循环：每帧按时间差推进固定距离，越过一份宽度就整体减掉一份
  useEffect(() => {
    if (reducedMotion || cases.length === 0) {
      return;
    }

    const row = rowRef.current;

    if (!row) {
      return;
    }

    let offset = 0;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);

      const delta = Math.min((now - last) / 1000, MAX_FRAME_DELTA_SECONDS);
      last = now;

      const setWidth = setWidthRef.current;

      if (hoverHoldRef.current || focusHoldRef.current || !visibleRef.current || setWidth <= 0) {
        return;
      }

      offset += MARQUEE_SPEED_PX_PER_SECOND * delta;

      while (offset >= setWidth) {
        offset -= setWidth;
      }

      row.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [cases.length, reducedMotion]);

  if (cases.length === 0) {
    return (
      <Empty className={className}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{t.cases.empty}</EmptyTitle>
          <EmptyDescription>{t.cases.emptyDesc}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div
      ref={viewportRef}
      className={cn("overflow-hidden", className)}
      onMouseEnter={() => {
        hoverHoldRef.current = true;
      }}
      onMouseLeave={() => {
        hoverHoldRef.current = false;
      }}
      onFocus={() => {
        focusHoldRef.current = true;
      }}
      onBlur={() => {
        focusHoldRef.current = false;
      }}
    >
      <ul
        ref={rowRef}
        tabIndex={0}
        aria-label={t.cases.trackLabel}
        className="flex w-max gap-6 will-change-transform"
      >
        {Array.from({ length: TRACK_COPIES }, (_, copyIndex) =>
          cases.map((item) => (
            <li
              key={`${item.id}-${copyIndex}`}
              aria-hidden={copyIndex > 0 ? "true" : undefined}
              className="w-[80%] max-w-80 shrink-0 sm:w-72 lg:w-80"
            >
              <CaseCard item={item} />
            </li>
          )),
        )}
      </ul>
    </div>
  );
}