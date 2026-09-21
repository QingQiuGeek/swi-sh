/** 首页分区与「跨页滚动」的共享逻辑。分区 id 顺序必须与 Header Tab 顺序严格一致。 */

export const SECTION_IDS = ["home", "products", "guide", "about"] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** 跨页传递滚动意图用 sessionStorage，避免在 URL 里留下 hash 或查询参数 */
const PENDING_SECTION_KEY = "swi:pending-section";

/**
 * 当前可视分区的模块级缓存。
 * 由 useActiveSection 写入，语言切换时读取，避免为此再引入一层 Provider。
 */
let currentSection: SectionId | null = null;

export function setCurrentSection(id: SectionId | null) {
  currentSection = id;
}

export function getCurrentSection(): SectionId | null {
  return currentSection;
}

export function rememberSection(id: SectionId) {
  try {
    sessionStorage.setItem(PENDING_SECTION_KEY, id);
  } catch {
    // 隐私模式下 sessionStorage 不可用，忽略即可，只损失一次滚动复原
  }
}

/** 取出并清除待滚动分区 */
export function takePendingSection(): SectionId | null {
  try {
    const value = sessionStorage.getItem(PENDING_SECTION_KEY);

    if (!value) {
      return null;
    }

    sessionStorage.removeItem(PENDING_SECTION_KEY);

    return (SECTION_IDS as readonly string[]).includes(value)
      ? (value as SectionId)
      : null;
  } catch {
    return null;
  }
}

export function scrollToSection(id: SectionId) {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * 等待分区挂载后再滚动。
 * 吸顶 Header 的副作用可能先于 <main> 的 HTML 到达，因此按帧重试若干次。
 */
export function scrollToSectionWhenReady(id: SectionId, attempts = 40) {
  const step = (remaining: number) => {
    if (document.getElementById(id)) {
      scrollToSection(id);
      return;
    }

    if (remaining > 0) {
      requestAnimationFrame(() => step(remaining - 1));
    }
  };

  step(attempts);
}