"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { cn } from "cn";

/** 视频淡入时长。比常规「渐显 ≤ 200ms」长，理由见 design.md §10「首屏视频例外」。 */
const FADE_DURATION_MS = 600;

const MEDIA_CLASS = "brightness-[0.6]";

/**
 * 首页首屏背景视频。三层叠放：poster → video → 深蓝遮罩。
 * 整层绝对定位在 Hero 内部（不是 fixed），因此滑到下面的分区时视频自然滚出视口，
 * 既不会变成全局背景，也不会在别的页面出现。
 *
 * LCP 保护（4.9MB 视频不能参与首屏）：
 * 1. poster 用 next/image + priority，作为首屏图片立刻加载；
 * 2. video 等窗口 load 之后的空闲时机才挂载，且 preload="none"，不与 poster 抢带宽；
 * 3. 视频真正开始播放（onPlaying）后才淡入，避免挂载瞬间的黑帧；
 * 4. prefers-reduced-motion: reduce 时完全不挂载 video，只保留 poster。
 */
export function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mountVideo, setMountVideo] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = () => setMountVideo(true);
    if (document.readyState === "complete") {
      const timer = window.setTimeout(start, 0);
      return () => window.clearTimeout(timer);
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  // 视频只服务于首屏：滚出视口后暂停解码，回到首屏再继续
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [mountVideo]);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <Image
        src="/hall-poster.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn("object-cover", MEDIA_CLASS)}
      />

      {mountVideo ? (
        <video
          ref={videoRef}
          src="/hall.mp4"
          poster="/hall-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity ease-out",
            MEDIA_CLASS,
            playing ? "opacity-100" : "opacity-0",
          )}
          style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
        />
      ) : null}

      {/* 深蓝遮罩：中心最淡、向四周渐深（椭圆，four corners 最重）。淡到既不压住画面，
          又保证白色文案在任意帧上都够对比（design.md §2.4 的 9.5:1 会随之下调，实测见 page-specs.md §3.4） */}
      <div className="absolute inset-0 bg-radial from-primary/45 via-primary/70 to-primary/88" />
    </div>
  );
}