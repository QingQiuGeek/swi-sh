# 汽车保险网站 设计规范

> 版本：v0.1
> 上游：`visual.md` v0.1（视觉方向）、`prd.md` v0.7（功能与约束）
> 本文回答**「具体怎么设计并保持统一」**：令牌、尺寸、字体、间距、圆角、边框、阴影、响应式、动效、图标。
> 下游：`ui-patterns.md`（组件与区块怎么搭）、`page-specs.md`（每页怎么搭）。
> 约束：组件库为 shadcn/ui + Tailwind CSS v4，**所有颜色必须走语义令牌**，禁止 `bg-blue-500` 这类原始值。

---

## 1. 令牌的组织方式

三段式，与 shadcn 的约定一致：

```
:root { --primary: oklch(...) }          /* 1. 定义变量（真值） */
@theme inline { --color-primary: var(--primary) }  /* 2. 注册给 Tailwind，生成 bg-primary / text-primary */
<Button />                                /* 3. 组件用语义类名，不写色值 */
```

- 变量定义在 `app/globals.css`，**不新建 CSS 文件**。
- 命名遵循 shadcn 的 `name` / `name-foreground` 约定：`name` 是底色，`-foreground` 是叠在其上的文字与图标色。
- 颜色一律使用 **OKLCH**：`oklch(亮度 彩度 色相)`，亮度 0–1、彩度 0 起、色相 0–360。
- 派生值用 `calc()` 从 `--radius` 推出，不重复写死。

---

## 2. 颜色令牌

### 2.1 基础令牌

| 令牌 | 色值 | OKLCH | 用途 |
| --- | --- | --- | --- |
| `--background` | `#F8FBFE` | `oklch(0.9867 0.0051 247.88)` | 页面底色（带一丝蓝的冷白） |
| `--foreground` | `#0F1B2D` | `oklch(0.2210 0.0394 258.28)` | 默认文字（比主色更深的近黑蓝） |
| `--card` | `#FFFFFF` | `oklch(1 0 0)` | 卡片底 |
| `--card-foreground` | `#0F1B2D` | `oklch(0.2210 0.0394 258.28)` | 卡片文字 |
| `--popover` | `#FFFFFF` | `oklch(1 0 0)` | 弹窗、下拉、浮层底 |
| `--popover-foreground` | `#0F1B2D` | `oklch(0.2210 0.0394 258.28)` | 浮层文字 |
| `--primary` | `#123A6B` | `oklch(0.3495 0.0961 255.60)` | 主按钮、标题强调、页脚底（深海军蓝） |
| `--primary-foreground` | `#FFFFFF` | `oklch(1 0 0)` | 主色上的文字 |
| `--secondary` | `#E8EEF7` | `oklch(0.9472 0.0137 258.35)` | 次按钮底色 |
| `--secondary-foreground` | `#123A6B` | `oklch(0.3495 0.0961 255.60)` | 次按钮文字 |
| `--muted` | `#F1F5FA` | `oklch(0.9685 0.0079 253.85)` | 弱化区块底（状态筛选栏、表头） |
| `--muted-foreground` | `#5A6B82` | `oklch(0.5226 0.0419 256.05)` | 辅助文字、说明、占位符 |
| `--accent` | `#EEF3FA` | `oklch(0.9624 0.0108 256.70)` | 悬停底色（ghost/outline 项） |
| `--accent-foreground` | `#123A6B` | `oklch(0.3495 0.0961 255.60)` | 悬停态文字 |
| `--destructive` | `#B3261E` | `oklch(0.5013 0.1783 28.70)` | 取消订单、表单报错 |
| `--destructive-foreground` | `#FFFFFF` | `oklch(1 0 0)` | 危险色上的文字 |
| `--border` | `#DCE3ED` | `oklch(0.9134 0.0156 257.20)` | 装饰性描边与分隔（卡片边框、分割线） |
| `--input` | `#7488A6` | `oklch(0.6219 0.0512 258.35)` | **表单控件描边**（比 `--border` 深，见 2.4） |
| `--ring` | `#123A6B` | `oklch(0.3495 0.0961 255.60)` | 聚焦环 |

### 2.2 品牌点睛色（自定义令牌）

按 shadcn 的「新增自定义颜色」流程定义，用于 `visual.md` §7 要求的单一暖色点睛。

| 令牌 | 色值 | OKLCH | 用途 |
| --- | --- | --- | --- |
| `--highlight` | `#98590F` | `oklch(0.5250 0.1148 62.14)` | 分区眉标（含前置短横）、常见问题 `+ / −`、徽标文字、价格强调、滚动指示轨激活点 |
| `--highlight-foreground` | `#FFFFFF` | `oklch(1 0 0)` | 暖色实底上的文字 |
| `--highlight-soft` | `#FBF0E2` | `oklch(0.9600 0.0220 74.10)` | 「热销 / 新品」徽标底色 |

> 暖色只有这一组。用途限定为**分区底色（「关于我们」整栏）、眉标、徽标、指示点、数字与图标强调**；**不用于正文，也不用于大面积按钮**。整页暖色面积占比约 1/7（一栏底色 + 若干小元素），这是 §4.2 底色节奏刻意留出的唯一一处暖色「换气口」。

> v1.1 把 `--highlight` 从 `oklch(0.5430 …)`（`#9E5E18`）调深到 `oklch(0.5250 …)`（`#98590F`）：眉标改用暖棕后要同时落在 `background` / `muted` / `secondary` / `highlight-soft` 四档浅底上，原明度在最深的 `secondary` 上只有 4.43:1（不达标），调深后最低 4.77:1。

### 2.3 订单状态色（自定义令牌）

状态色独立于品牌色，用于订单状态徽标。按 PRD §8.2，状态为：待支付 / 已生效 / 已取消 / 已失效。

| 令牌 | 色值 | 用途 |
| --- | --- | --- |
| `--status-pending` / `--status-pending-foreground` | `#FDF3E3` / `#8A5A12` | 待支付 |
| `--status-active` / `--status-active-foreground` | `#E9F7EF` / `#1F6B47` | 已生效 |
| `--status-cancelled` / `--status-cancelled-foreground` | `#F1F3F6` / `#5A6B82` | 已取消 |
| `--status-expired` / `--status-expired-foreground` | `#FBECEC` / `#8C3A3A` | 已失效 |

**硬性规则**：状态徽标必须「颜色 + 文字」同时出现，不允许只靠颜色区分状态（色盲可达性）。

### 2.4 对比度验收

实现完成后逐项核对，任一不达标即视为未完成：

| 组合 | 对比度 | 结论 |
| --- | --- | --- |
| `foreground` / `background` | 16.64 | AA 通过 |
| `primary-foreground` / `primary` | 11.39 | AA 通过 |
| `primary` 作文字 / `background` | 10.97 | AA 通过 |
| `primary-foreground`（纯白） / 首屏视频遮罩合成后的背景（实测最亮处，5 帧取样） | 4.98 | AA 通过（正文 4.5 阈值） |
| `primary-foreground/95`（Hero 副标题） / 同上 | 4.65 | AA 通过（正文 4.5 阈值） |
| `primary-foreground/92`（Hero 大标题第一行） / 同上 | 4.52 | AA 通过（大字 3:1 阈值） |
| `secondary-foreground` / `secondary` | 9.77 | AA 通过 |
| `muted-foreground` / `background` | 5.24 | AA 通过 |
| `muted-foreground` / `card` | 5.44 | AA 通过 |
| `muted-foreground` / `muted`（投保指引栏底） | 4.97 | AA 通过 |
| `muted-foreground` / `secondary`（投保案例栏底） | 4.66 | AA 通过 |
| `muted-foreground` / `highlight-soft`（关于我们栏底） | 4.84 | AA 通过 |
| `primary` 作标题 / `muted` | 10.41 | AA 通过 |
| `primary` 作标题 / `highlight-soft` | 10.13 | AA 通过 |
| `highlight` / `background` | 5.36 | AA 通过（分区眉标、FAQ `+ / −`） |
| `highlight` / `muted` | 5.09 | AA 通过 |
| `highlight` / `secondary` | 4.77 | AA 通过（四档浅底里最紧的一处） |
| `highlight` / `highlight-soft` | 4.95 | AA 通过（眉标、小字徽标） |
| `primary-foreground` / `primary`（CTA 通栏与其上的实心白按钮） | 11.39 | AA 通过 |
| `status-pending-foreground` / `status-pending` | 5.38 | AA 通过 |
| `status-active-foreground` / `status-active` | 5.85 | AA 通过 |
| `status-cancelled-foreground` / `status-cancelled` | 4.89 | AA 通过 |
| `status-expired-foreground` / `status-expired` | 6.58 | AA 通过 |
| `destructive-foreground` / `destructive` | 6.54 | AA 通过 |
| `input` / `background` | 3.48 | 非文本 3:1 通过 |
| `input` / `card` | 3.61 | 非文本 3:1 通过 |
| `border` / `background` | 1.24 | **不适用**：`--border` 仅用于装饰性分隔，不承载控件边界语义 |

**`--border` 与 `--input` 为什么拆开**：WCAG 1.4.11 要求表单控件等界面元素的边界达到 3:1。装饰性分隔线不受此约束，若强行让 `--border` 也满足 3:1，整页描边会过重、失去 `visual.md` 要求的「浅蓝描边 + 纸感」。因此表单控件一律用 `--input`，分割线与卡片边框用 `--border`。

### 2.5 颜色使用纪律

- 只用语义类名：`bg-background`、`text-muted-foreground`、`border-border`，**禁止** `text-[#123A6B]`、`bg-blue-600` 等原始值。
- 悬停与激活态通过透明度派生：`hover:bg-primary/90`，不新增一套 hover 色令牌。
- 不写 `dark:` 颜色覆盖；本期无深色模式（见 §9）。
- 主色不用于长段正文。

### 2.6 `globals.css` 目标状态

先执行 `npx shadcn@latest init`（它会用默认主题写入 `globals.css`），**再把下面这段整体替换进 `:root` 与 `@theme inline`**。

```css
@import "tailwindcss";

:root {
  --radius: 0.625rem;

  --background: oklch(0.9867 0.0051 247.88);
  --foreground: oklch(0.2210 0.0394 258.28);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2210 0.0394 258.28);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2210 0.0394 258.28);
  --primary: oklch(0.3495 0.0961 255.60);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.9472 0.0137 258.35);
  --secondary-foreground: oklch(0.3495 0.0961 255.60);
  --muted: oklch(0.9685 0.0079 253.85);
  --muted-foreground: oklch(0.5226 0.0419 256.05);
  --accent: oklch(0.9624 0.0108 256.70);
  --accent-foreground: oklch(0.3495 0.0961 255.60);
  --destructive: oklch(0.5013 0.1783 28.70);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.9134 0.0156 257.20);
  --input: oklch(0.6219 0.0512 258.35);
  --ring: oklch(0.3495 0.0961 255.60);

  --highlight: oklch(0.5250 0.1148 62.14);
  --highlight-foreground: oklch(1 0 0);
  --highlight-soft: oklch(0.9600 0.0220 74.10);

  --status-pending: oklch(0.9677 0.0237 79.74);
  --status-pending-foreground: oklch(0.5085 0.1025 70.83);
  --status-active: oklch(0.9635 0.0181 161.12);
  --status-active-foreground: oklch(0.4717 0.0943 158.55);
  --status-cancelled: oklch(0.9635 0.0045 258.32);
  --status-cancelled-foreground: oklch(0.5226 0.0419 256.05);
  --status-expired: oklch(0.9549 0.0163 17.44);
  --status-expired-foreground: oklch(0.4600 0.1123 22.52);
}

@theme inline {
  --font-sans: var(--font-inter), var(--font-noto-sans-sc), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-highlight: var(--highlight);
  --color-highlight-foreground: var(--highlight-foreground);
  --color-highlight-soft: var(--highlight-soft);

  --color-status-pending: var(--status-pending);
  --color-status-pending-foreground: var(--status-pending-foreground);
  --color-status-active: var(--status-active);
  --color-status-active-foreground: var(--status-active-foreground);
  --color-status-cancelled: var(--status-cancelled);
  --color-status-cancelled-foreground: var(--status-cancelled-foreground);
  --color-status-expired: var(--status-expired);
  --color-status-expired-foreground: var(--status-expired-foreground);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-xs: 0 1px 2px 0 oklch(0.2210 0.0394 258.28 / 0.05);
  --shadow-sm: 0 4px 12px -2px oklch(0.2210 0.0394 258.28 / 0.08);
  --shadow-md: 0 12px 32px -4px oklch(0.2210 0.0394 258.28 / 0.12);

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

**必须同时清理**：现有 `app/globals.css` 里的 `@media (prefers-color-scheme: dark)` 深色分支与 `body` 上的硬编码 `font-family: Arial, Helvetica, sans-serif`，两者都与本文冲突。

### 2.7 刻意不定义的令牌

- **`--chart-1` ~ `--chart-5`**：本期无任何图表，定义了也不会用。
- **`--sidebar-*`**：个人中心侧边栏用导航链接实现（详见 `ui-patterns.md` §8.3），不引入 shadcn 的 `Sidebar` 组件。若后续改用该组件，再按需补令牌。
- **`.dark` 深色令牌**：见 §9。

---

## 3. 字体与排版

### 3.1 字体族

| 角色 | 字体 | 说明 |
| --- | --- | --- |
| 中文 | Noto Sans SC（思源黑体） | 开源、覆盖完整字形，气质偏「公共服务」 |
| 拉丁字母与数字 | Inter | x-height 与中文接近，中英混排不跳 |
| 等宽 | Geist Mono | 订单号等技术性文本 |

**实现要求**：用 `next/font/google` 加载 Noto Sans SC 与 Inter，分别挂 `--font-noto-sans-sc`、`--font-inter`，再由 `@theme inline` 映射到 `--font-sans`。

> **必须替换**：脚手架 `app/layout.tsx` 当前只加载 Geist / Geist Mono，**不含中文字形**，中文会静默回退到系统字体，造成中英混排的字重与 x-height 不一致。

### 3.2 字号阶梯

格式：桌面 / 移动。行高为无单位倍数。

| 令牌 | 字号 | 行高 | 字重 | 用途 |
| --- | --- | --- | --- | --- |
| `display` | 56px / 34px | 1.1 | 700 | 首页 Hero 主标题 |
| `h1` | 40px / 28px | 1.15 | 700 | 页面主标题、分区大标题 |
| `h2` | 32px / 24px | 1.2 | 700 | 分区标题 |
| `h3` | 24px / 20px | 1.3 | 600 | 区块标题、弹窗标题 |
| `card-title` | 18px / 17px | 1.4 | 600 | 产品卡片标题 |
| `body-lg` | 18px / 16px | 1.7 | 400 | 引导语、分区副标题 |
| `body` | 16px | 1.7 | 400 | 正文 |
| `body-sm` | 14px | 1.6 | 400 | 辅助说明、表单提示 |
| `caption` | 12px | 1.5 | 500 | 徽标、脚注 |
| `eyebrow` | 12px | 1.4 | 600 | 分区眉标，需 `uppercase` + `letter-spacing: 0.18em` |
| `price-lg` | 46px / 36px | 1.1 | 700 | 产品详情价格、Hero 价格 |
| `price-md` | 28px / 24px | 1.2 | 700 | 产品卡片价格 |
| `order-no` | 14px | 1.5 | 500 | 订单号（等宽字体）、车牌号 |

### 3.3 数字规范

- 价格、保额、金额、车牌号必须启用等宽数字 `tabular-nums`，保证纵向对齐。
- 订单号是 36 字符的 UUID，比数字更需要等宽：使用 `--font-mono`，并允许 `break-all` 断行（移动端会折行）。**不使用 `truncate` 截断**——用户需要看到并核对完整编号。
- 价格数字允许单独放大到标题级（`price-lg`），但不引入展示型字体，沿用同一字体的数字。

### 3.4 排版纪律

- 全站只用 **三个字重**：400（正文）/ 600（强调与卡片标题）/ 700（标题）。
- 正文行高固定 1.7，标题行高 1.1–1.3，不逐处微调。
- 中文不使用 `italic`；英文引号与中文引号按语言分别使用。
- 中文与拉丁字母之间不手动补空格，交由浏览器换行规则处理。
- **双语长度预留**：所有按钮、导航项、徽标按英文长度预留宽度，禁止按「中文刚好放下」定稿。

---

## 4. 布局与尺寸

### 4.1 容器与栅格

| 项 | 取值 |
| --- | --- |
| 内容最大宽度 | 1200px |
| 左右内边距 | 移动 20px / 平板 32px / 桌面 40px |
| 栅格 | 12 列，列间距 24px |
| 产品列表列数 | 桌面 3 列 / 平板 2 列 / 移动 1 列 |

### 4.2 分区节奏

| 项 | 移动 | 桌面 |
| --- | --- | --- |
| 分区上下内边距 | 64px | 96px |
| 分区抬头与内容间距 | 24px | 32px |
| 首页 Hero 上下内边距 | 64px | 96px |
| 首页 Hero 最小高度 | 视口高 − Header 高（内容更高时自然撑开） | 同左 |

**分区底色节奏（首页，自上而下）**——底色必须打在 `<section>` 上做通栏，不能打在 `Container` 上（否则左右留白仍在冷白底上，像「贴了一块色纸」）：

| 顺序 | 分区 | 底色 | 边界处理 |
| --- | --- | --- | --- |
| 1 | 首屏 `#home` | 视频 + 深蓝径向遮罩（同色系实心） | — |
| 2 | 保险产品 `#products` | `background` `#F8FBFE` | 深 → 浅，不加线 |
| 3 | 投保指引 `#guide` | `muted` `#F1F5FA` | 浅 → 浅，`border-t border-border` 1px |
| 4 | 投保案例 `#cases` | `secondary` `#E8EEF7` | 浅 → 浅，`border-t` 1px |
| 5 | 关于我们 `#about` | `highlight-soft` `#FBF0E2`（暖米） | 浅 → 浅，`border-t` 1px |
| 6 | 立即投保通栏（无 id） | `primary` `#123A6B`，桌面高约 165px | 浅 → 深，不加线 |
| 7 | 常见问题（无 id） | `background` `#F8FBFE` | 深 → 浅，不加线 |
| 8 | 页脚 | `primary` | 深底本身就是「页面结束」信号 |

- 三档冷色底按 248 → 241 → 232 逐级压深，相邻档差 ≥ 7 个色阶。**踩过的坑**：`bg-secondary/65` 混出来是 `rgb(240,244,250)`，与 `bg-muted` 的 `rgb(241,245,250)` 只差 1 个色阶，加了发丝线也像同一栏 —— 投保案例栏因此改用不透明的 `bg-secondary`。
- 第 5 栏是全页唯一的暖色底，也是进入深色通栏前的「换气口」；第 6 / 7 栏都不带 section id，不参与分区导航。

**分区抬头配色**（改 `components/blocks/section-heading.tsx` 一处，全站同时生效）：

| 部位 | 取值 | 说明 |
| --- | --- | --- |
| 眉标 | `text-highlight` `#98590F` | 在四档浅底上最低 4.77:1（见 §2.4） |
| 眉标前置短横 | 28 × 2px，`bg-current` | 用 `currentColor`，颜色自动跟随眉标 |
| 大标题 | `text-primary` `#123A6B` | 深蓝取代原先的近黑，是全站「标题加颜色」的唯一来源 |
| 标题第二行 | `text-highlight` | `titleAccent`，首页未启用 |
| 副标题 | `text-muted-foreground` | 不变 |

- 标题的颜色只来自**单一纯色 + 明度差**：禁止渐变文字、`bg-clip-text`、彩色发光、描边字（见 `avoid.md` §1）。
- **不引入衬线字体**：全站标题仍为 Inter + Noto Sans SC 无衬线（见 §3.1）。

### 4.3 框架尺寸

| 元素 | 取值 |
| --- | --- |
| Header 高度 | 桌面 72px / 移动 60px，吸顶 |
| Header 描边 | 底部 1px `--border` |
| Footer 内边距 | 上 64px / 下 32px |
| Footer 底色 | `--primary`，文字 `--primary-foreground` |
| 个人中心侧边栏宽 | 桌面 220px，与内容区间距 40px |
| 个人中心移动端 Tab 高 | 44px，横向可滚动 |
| 悬浮工具轨 | 宽 48px（`size-11` 按钮 + `p-0.5` 内边距）；任何宽度都取视口右侧垂直居中，贴边距右 12px（≥ 1280px 16px） |
| 首屏 Hero 最小高度 | `calc(100svh − 60px)`，桌面 `calc(100svh − 72px)`（减掉吸顶 Header） |
| 首屏媒体层 | 绝对定位铺满 Hero（非 `fixed`）+ `overflow-hidden`；poster 与视频均 `object-cover` + `brightness(0.6)` |
| 首屏遮罩 | 覆盖在媒体层之上、内容之下；径向（`bg-radial`）中心最淡、向四角渐深：`primary/38` → `via primary/55` → `primary/72` |
| 首屏价格面板 | 同色系实心深蓝（`bg-primary/88` + `border-transparent`），面板内文字全部用 `primary-foreground` 系；不用纯白卡片（深底上会「跳」出来），也不用 `backdrop-blur`（`avoid.md` §1 禁止磨砂玻璃） |

### 4.4 组件尺寸

| 组件 | 取值 |
| --- | --- |
| Button 高度 | default 40px / sm 36px / lg 44px |
| Button 移动端主 CTA | 44px |
| Input / Select 高度 | 桌面 40px / 移动 44px |
| 触控目标最小值 | 44 × 44px |
| 卡片内边距 | 桌面 24px / 移动 20px |
| 卡片间距 | 24px |
| 案例卡片宽 | 移动 80% 容器宽（上限 320px）/ 平板 288px / 桌面 320px，轨道内左右各露出邻卡作为可滚动提示 |
| 产品卡片配图 | 1:1 或 4:3，桌面横版左图右文，移动端上图下文 |

---

## 5. 间距系统

- 基准：4px。Tailwind 的默认间距刻度直接可用，**不新增自定义间距值**。
- 允许使用的档位：`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 96`（即 Tailwind 的 1/2/3/4/5/6/8/10/12/16/24）。
- **禁止**非标值如 `p-[13px]`、`mt-[7px]`。
- 应用约定：
  - 组件内部元素间距：8 / 12 / 16
  - 卡片之间：24
  - 表单字段之间：16（用 `FieldGroup` 的 `gap`，不用 `space-y-*`）
  - 分区之间：64（移动）/ 96（桌面）

---

## 6. 圆角

由 `--radius` 统一派生，取 `0.625rem`（10px）。

| 类名 | 实际值 | 用途 |
| --- | --- | --- |
| `rounded-xl` | 14px | 大面板、Hero 配图容器 |
| `rounded-lg` | 10px | 卡片、弹窗、下拉 |
| `rounded-md` | 8px | 按钮、输入框 |
| `rounded-sm` | 6px | 小标签、内嵌控件 |
| `rounded-full` | — | 徽标、胶囊按钮、头像、指示点 |

不使用直角（`rounded-none`）作为默认风格，也不使用超大圆角（>20px）的「气泡感」。

---

## 7. 边框与阴影

- **边框优先于阴影**：信息型卡片默认「1px `--border` + `--shadow-xs`」，不靠重阴影堆浮起感。
- 表单控件用 `--input`，其余用 `--border`（原因见 §2.4）。

| 令牌 | 取值 | 用途 |
| --- | --- | --- |
| `--shadow-xs` | `0 1px 2px 0 <foreground>/5%` | 卡片默认 |
| `--shadow-sm` | `0 4px 12px -2px <foreground>/8%` | 卡片悬停、下拉 |
| `--shadow-md` | `0 12px 32px -4px <foreground>/12%` | 弹窗、抽屉 |

阴影一律用带蓝调的 `--foreground` 加透明度，**不使用纯黑阴影**。同一元素不同时叠加多层阴影。

---

## 8. 响应式

- 断点沿用 Tailwind 默认值，**不新增自定义断点**；只用其中两个作为语义分界：
  - `< 768px`（`md` 以下）→ 移动端
  - `768–1023px`（`md` 到 `lg`）→ 平板
  - `≥ 1024px`（`lg` 及以上）→ 桌面
- 移动优先书写：先写移动端样式，再用 `md:` / `lg:` 覆盖。
- 各断点差异：

| 项 | 移动 | 平板 | 桌面 |
| --- | --- | --- | --- |
| Header 导航 | 抽屉菜单 | 抽屉菜单 | 横向 Tab |
| 首页滚动指示轨 | 隐藏 | 隐藏 | 左侧竖向显示 |
| 悬浮工具轨 | 右侧垂直居中（贴边 12px） | 右侧垂直居中（贴边 12px） | 右侧垂直居中（≥ 1280px 贴边 16px） |
| 首屏 Hero 高度 | `100svh − 60px` | `100svh − 60px` | `100svh − 72px` |
| 产品列数 | 1 | 2 | 3 |
| 投保表单 | 单列 | 双列 | 双列 |
| 个人中心 | 顶部横向 Tab | 左侧边栏 | 左侧边栏 |
| 大标题 | 降为移动端字号 | 桌面字号 | 桌面字号 |

- 全站最小支持宽度 360px，任何断点下不得出现横向滚动条。

---

## 9. 主题

- **本期只做浅色主题。**
- 不创建 `.dark` 令牌块，不引入 `next-themes`，不添加 `@custom-variant dark`。
- **必须删除** `app/globals.css` 中现有的 `@media (prefers-color-scheme: dark)` 分支，否则系统开启深色模式的用户会看到无人维护的半成品暗色页面。
- 组件内不写任何 `dark:` 前缀的颜色覆盖。

---

## 10. 动效

只允许 `visual.md` §10 规定的三类动效，外加下面两条被明确论证过的例外（首屏视频、投保案例轨道）。

| 令牌 | 取值 |
| --- | --- |
| `--duration-fast` | 150ms（颜色、边框、悬停） |
| `--duration-base` | 200ms（渐显、位移） |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |

**允许动画的属性白名单**：`color`、`background-color`、`border-color`、`opacity`、`transform`。

**限制**

- 位移不超过 12px；不做缩放超过 1.02 的悬停放大。
- 首页 Header Tab 的平滑滚动使用 `scrollIntoView({ behavior: 'smooth' })`；滚动指示轨的高亮使用 `IntersectionObserver`，不监听 `scroll` 事件做逐帧计算。
- **`prefers-reduced-motion: reduce` 时全部时长归零**，只保留即时的颜色状态切换。
- 禁止：视差、逐字动画、数字跳表、自动轮播滑块。
- **首屏视频例外**：首页 Hero 允许一段静音循环的背景视频，淡入时长 **600ms**——这是唯一被允许超过 200ms 的时长，更短会像闪一下。挂载、暂停与 `prefers-reduced-motion` 的处理见 `avoid.md` §5。
- **投保案例轨道例外**：唯一允许连续自动位移的位置，**匀速从右向左无缝循环**（约 80px/秒），卡片复制一份接在末尾，位移越过一份宽度时整体减掉一份，视觉上完全连续——不是「一张一张跳」，也不允许回到起点重播。轨道不设任何播放控件；鼠标悬停或键盘聚焦时停住，移开 / 失焦后继续；`prefers-reduced-motion: reduce` 时不做动画，只静态展示。
- 移动端只保留颜色与边框过渡；§10 允许的两处自动播放在移动端同样生效（首屏视频按 `avoid.md` §5 降级）。

---

## 11. 图标

- 图标库：`lucide-react`（shadcn 默认），**不混用第二套图标库**。
- 统一线性风格，`stroke-width: 1.5`，端点圆角；不使用实心图标与线性图标混排。
- 尺寸：`16`（按钮内、行内）/ `20`（默认）/ `24`（独立图标、悬浮工具轨）。
- 在 `Button` / `Badge` 等组件内传图标时使用 shadcn 的 `data-icon` 约定，由组件接管尺寸与间距，不手写 `w-4 h-4`。
- 图标不改写颜色，继承所在元素的 `-foreground` 色。
- 纯装饰性图标加 `aria-hidden`；有语义的图标必须有可访问名称。

---

## 12. 层级与 z-index

| 层 | z-index | 说明 |
| --- | --- | --- |
| 内容内浮起元素 | `z-10` | 卡片悬停、图片角标 |
| 首页滚动指示轨 | `z-20` | 左侧竖向轨道 |
| 悬浮工具轨 / 返回顶部 | `z-30` | 右侧悬浮 |
| 吸顶 Header | `z-40` | 全站唯一 |
| 遮罩类组件 | **不设置** | Dialog / Sheet / Popover / Tooltip / DropdownMenu 由 shadcn 自行管理堆叠，手写 `z-index` 会破坏其层级 |

---

## 13. 交互状态

所有可交互元素必须定义以下状态，缺少任一状态视为未完成：

| 状态 | 规范 |
| --- | --- |
| 默认 | 使用语义令牌 |
| 悬停 | `hover:bg-*/90` 或 `hover:border-*`；`--duration-fast` |
| 聚焦 | `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`；键盘可见，鼠标点击不显示 |
| 激活 | 透明度再降一档，不使用额外令牌 |
| 禁用 | `disabled` + `opacity-50` + `cursor-not-allowed` |
| 加载 | `Spinner` + `disabled`（shadcn 的 `Button` 没有 `isLoading`，用 `Spinner` + `data-icon` 组合） |
| 校验失败 | 控件加 `aria-invalid`，字段容器加 `data-invalid`，错误文案用 `--destructive` |
| 空状态 | 使用 shadcn 的 `Empty` 组件，不手写空状态结构 |
| 骨架屏 | 使用 shadcn 的 `Skeleton`，不手写 `animate-pulse` |

---

## 14. 设计令牌验收清单

实现完成后逐条核对：

- [ ] `globals.css` 中的颜色全部为 OKLCH，且与 §2.6 一致。
- [ ] `prefers-color-scheme: dark` 分支已删除，全站无 `.dark` 令牌、无 `dark:` 覆盖。
- [ ] 全站无原始色值类名（`bg-blue-500`、`text-[#...]`），全部走语义令牌。
- [ ] 中文由 Noto Sans SC 渲染，中英混排的字重与 x-height 一致。
- [ ] `--chart-*`、`--sidebar-*` 未被引入。
- [ ] 表单控件用 `--input`，卡片与分割线用 `--border`。
- [ ] 订单状态徽标同时具备颜色与文字。
- [ ] 价格、金额、车牌号启用 `tabular-nums`；订单号使用等宽字体且能完整显示、不截断。
- [ ] 全站字重不超过 400 / 600 / 700 三种。
- [ ] 间距全部落在 §5 允许的档位上，无非标值。
- [ ] 圆角全部由 `--radius` 派生，无独立写死的圆角。
- [ ] 阴影使用带蓝调的 `--foreground` 透明度，无纯黑阴影。
- [ ] 键盘 Tab 遍历时所有可交互元素都有可见聚焦环。
- [ ] 打开系统「减少动态效果」后全站无动画。
- [ ] 遮罩类组件未手写 `z-index`。
- [ ] 360px 宽度下无横向滚动条。