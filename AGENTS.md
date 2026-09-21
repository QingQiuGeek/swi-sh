## /docs文件
1. prd.md
解决的问题：做什么
核心内容：产品定位、目标用户、用户问题、核心场景、核心功能、用户流程、页面/功能列表、业务规则、技术栈、API/数据需求、约束
2. visual.md
解决的问题：长什么感觉
核心内容：整体视觉方向、品牌气质、设计关键词、视觉层级、布局倾向、参考产品/网站、参考截图、视觉差异化、明确不追求的风格
3. design.md
解决的问题：具体怎么设计并保持统一
核心内容：Layout、尺寸、颜色、字体、间距、圆角、边框、阴影、响应式、主题、动效、图标
4. ui-patterns.md
解决的问题：UI 怎么搭
核心内容：UI 层级、Tokens → Components → Blocks → Pages、代码目录结构、组件规范、Block 规范、复用规则、状态规范、全局导航交互模式如SPA 路由导航、分区滚动导航等、路由实现规则、通用布局/交互模式、全局页面结构
5. page-specs.md
解决的问题：每个页面具体怎么搭
核心内容：页面内容、Route、页面结构、使用的 Components/Blocks、核心操作、数据、状态、响应式、页面间跳转
6.  avoid.md
解决的问题：什么不要做
核心内容：禁止的视觉风格、UI 反模式、组件反模式、布局反模式、内容反模式、AI 常见问题
7. AI Coding、按模块、功能测试验收+最终整体验收
8. 不断更新、沉淀 md


## references
可参考保险网站：
http://new.exhibitionguard.com
https://www.exhibitionguard.com
http://shdichan.swiglobal.com/
shadcn官网：https://ui.shadcn.com/docs/components
nextjs官网：https://nextjs.org/docs

## 可用 前端 skills
- baseline-ui：UI 打磨收尾，修间距/层级/字体/小布局问题
- frontend-design：视觉方向与审美决策，避免模板化默认样式
- frontend-patterns：React/Next.js 前端模式、状态管理、性能实践
- frontend-ui-engineering：生产级可访问响应式 UI 构建（页面/组件/布局/状态）
- high-end-visual-design：高端 agency 风格视觉体系（与本站定位冲突，慎用）
- heroui-react：HeroUI 组件库用法（与 shadcn 二选一，本项目选 shadcn）
- nextjs-turbopack：Next.js 16+ 与 Turbopack 构建缓存、开发提速
- shadcn：shadcn 组件添加/检索/修复/组合（本项目 UI 基础）
- tailwind-design-system：Tailwind v4 设计系统、tokens、响应式规范
- vercel-react-best-practices：Vercel 官方 React/Next.js 性能优化规范
- ui-ux-pro-max：UI/UX 综合库（风格/配色/字体/UX 准则，与 design.md 重叠时以 design.md 为准）
- typescript-expert：TypeScript 类型设计、性能、monorepo 与工具链

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
