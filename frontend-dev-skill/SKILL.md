---
name: frontend-spec-docs
description: Spec-driven frontend work — write and maintain prd / visual / design / ui-patterns / page-specs / avoid under wz-docs/, gate coding on them, then implement and verify module by module. Use when starting a frontend project, page, or feature; when the user asks for any of those docs; or when UI work is about to begin and the specs are missing. Not for backend-only, script, or non-UI tasks.
metadata:
  short-description: Spec-driven frontend docs, build, and acceptance
---

# 前端文档驱动开发

把「做什么 / 长什么感觉 / 怎么设计 / UI 怎么搭 / 每个页面怎么搭 / 什么不要做」从口头讨论固化成六个文件，
让后续编码有唯一事实源，并在需求变化后持续回写。

六份文档各有唯一职责，**一件事只写在一份文档里**，其它文档只引用不复述——复述必然会漂移。

## 何时用

- 启动前端项目、新页面或新功能。
- 用户要写或更新上述任一份文档。
- 准备写 UI 代码，但 `wz-docs/` 里还缺对应文档。

不适用：纯后端、脚本、数据处理等没有 UI 的可交付物。

## 硬门槛：先有文档，再写代码

1. 确认文档目录。默认项目根下的 `wz-docs/`；若项目已经有一套同类目录（如 `docs/`），**先问用户是沿用还是新建**，不要默默开第二套。
2. 清点缺哪几份。缺的先用 `references/` 里的骨架建出来。
3. 建之前把需要用户拍板的问题**一次问完**（目标用户、范围、技术栈、是否要 i18n、要不要登录…），别反复打断。
   自己能定的默认值先填好，并在文档里标成「假设：…（待确认）」，让用户一次看到全部待确认项。
4. 六份齐了（至少本次要动到的部分齐了），再开始编码。
5. 不要「先写代码，回头补文档」。

例外：用户明确说只要原型、不要文档，就按用户说的做，并在交付时点出文档缺口与影响。

## 六份文档的分工

| 文件 | 回答的问题 | 必须包含 | 不该出现 |
| --- | --- | --- | --- |
| `prd.md` | 做什么 | 定位、目标用户、用户问题、核心场景、功能清单、用户流程、页面/功能列表、业务规则、技术栈、API/数据需求、约束与非目标 | 像素、色值、类名、目录结构 |
| `visual.md` | 长什么感觉 | 视觉方向、品牌气质、设计关键词、视觉层级、布局倾向、参考站与截图、差异化、明确不追求的风格 | 组件 API、目录结构、具体令牌值 |
| `design.md` | 具体怎么设计并保持统一 | 布局、尺寸、颜色、字体、间距、圆角、边框、阴影、响应式、主题、动效、图标 | 业务规则、页面级细节 |
| `ui-patterns.md` | UI 怎么搭 | UI 层级、Tokens → Components → Blocks → Pages、目录结构、组件规范、Block 规范、复用规则、状态规范、导航交互模式、路由实现规则、通用布局 | 单页细节、具体文案 |
| `page-specs.md` | 每个页面具体怎么搭 | 每页的 Route、内容、结构、用到的 Components/Blocks、核心操作、数据、状态、响应式、页面间跳转、验收点 | 跨页通用规则（放 ui-patterns） |
| `avoid.md` | 什么不要做 | 禁止的视觉风格、UI/组件/布局/内容反模式、AI 常见问题 | 正向规范（放另外五份） |

具体数值（色值、字号、间距、断点、圆角）只在 `design.md` 定义一次，其它文档引用它。

## 按需读取

只在进入对应模式时读对应文件，不要一次全读。

| 模式 | 典型说法 | 读 |
| --- | --- | --- |
| prd | 写 PRD / 需求 / 功能清单 / 定范围 | [references/prd.md](references/prd.md) |
| visual | 视觉方向 / 长什么样 / 参考某网站 | [references/visual.md](references/visual.md) |
| design | 设计规范 / 色板 / 字号 / 间距 / 令牌 | [references/design.md](references/design.md) |
| ui-patterns | UI 架构 / 目录结构 / 组件规范 / 导航交互 | [references/ui-patterns.md](references/ui-patterns.md) |
| page-specs | 页面规格 / 这页怎么搭 | [references/page-specs.md](references/page-specs.md) |
| avoid | 禁止清单 / 不要做什么 | [references/avoid.md](references/avoid.md) |
| build / accept | 开始搭代码 / 验收 / 自测 / 整体检查 | [references/acceptance.md](references/acceptance.md) |

多个模式可以连续走：通常是 prd → visual → design → ui-patterns → page-specs（+ avoid 贯穿）→ build → accept。
不要为了凑齐顺序而空转；用户只要求其中一份时，只做那一份。

## 写文档的通用纪律

- 语言跟随用户（中文项目就写中文），术语全站统一并在 `prd.md` 里给出对照。
- **用户给的清单和字段是契约**：不改名、不合并、不漏项。要调整先问。
- 不确定就写「待确认」，不要静默编造；写下的假设必须显式标注。
- 每条功能、每条规则都要可验收（能被测试或肉眼判断）；不可验收的说明拆细。
- 文档头部标版本与上下游指针（如 `> 版本：v0.1`、`> 上游：prd.md`），实质改动后升版本。
- 用原生的写文件/补丁工具编辑文档。不要用 shell here-string 拼多行文件内容，
  容易写出字面转义符并把标题写坏；改完 `grep` 一下标题与关键锚点确认完好。

## 变更回写（沉淀）

改完行为就回写对应文档，别让文档落后于代码。

| 改了什么 | 回写 |
| --- | --- |
| 功能增删、业务规则、接口或字段、数据模型、业务码 | `prd.md` |
| 视觉方向、参考站、明确不追求的风格 | `visual.md` |
| 颜色、字号、间距、圆角、阴影、断点、动效 | `design.md` |
| 目录结构、组件/Block 规范、导航交互、路由规则、状态规范 | `ui-patterns.md` |
| 页面结构、状态、响应式、跳转、验收点 | `page-specs.md` |
| 新踩到的反模式、AI 通病 | `avoid.md` |

## 执行与验收

编码纪律、按模块验收、最终整体验收与证据要求都写在 [references/acceptance.md](references/acceptance.md)，
进入 build / accept 模式时读它。
核心约定：**一次只动一个模块，做完先让用户验收，通过后再进入下一个**；交付要给出可复核的证据，而不是「已完成」。