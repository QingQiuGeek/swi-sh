# 汽车保险网站 UI 架构规范

> 版本：v0.2
> 上游：`prd.md` v0.7（功能与路由）、`visual.md` v0.1（视觉方向）、`design.md` v0.1（设计令牌）
> 本文回答**「UI 怎么搭」**：分层模型、目录结构、组件与区块规范、复用规则、状态规范、导航交互模式、路由实现规则、全局页面结构。
> 下游：`page-specs.md`（每页具体怎么搭）。

---

## 1. 分层模型

四层，从下往上，**下层不知道上层的存在**：

```
Tokens   →  Components   →  Blocks   →  Pages
(design.md)  (components/ui)  (components/blocks)  (app/**)
```

| 层 | 位置 | 职责 | 禁止 |
| --- | --- | --- | --- |
| Tokens | `app/globals.css` | 语义色、圆角、阴影、字体变量 | 组件里写原始色值 |
| Components | `components/ui/` | shadcn 原子组件，纯通用 | 写业务文案、发请求、读 store、import `lib/server` |
| Blocks | `components/blocks/` | 有业务语义、可跨页面复用的一块 UI | 自己发请求；越权直接读 `lib/server` |
| AI Elements | `components/ai-elements/` | Vercel 官方基于 shadcn 的对话组件（`Conversation` / `Message` / `PromptInput`），以源码形式落进仓库，可改；重装时 CLI 会逐个询问是否覆盖 | 写业务文案、读 `lib/server` |
| Pages | `app/[locale]/**` | 取数、鉴权、路由、编排 Block | 写视觉细节、写原始色值 |

补充两层，职责介于 Blocks 与 Pages 之间：

- `components/sections/` —— **仅首页使用**的分区编排（首页五分区），不跨页复用；首屏视频层 `hero-media.tsx` 也在这里（它是 Hero 内部唯一需要交互状态的叶子）。
- `components/layout/` —— 全站骨架（Header / Footer / Container / 移动端抽屉 / 语言切换 / 滚动指示轨 / 悬浮工具轨）。
- `components/forms/`、`components/auth/` —— 有交互状态的重型 Block（投保表单、账户表单、登录注册弹窗）。

**判断归属的一句话规则**：这段 UI 换一个页面还能用吗？能 → Blocks；只有首页用 → Sections；带交互状态且体积大 → 独立的 `forms/`、`auth/`。

---

## 2. 目录结构

```
app/
  layout.tsx                        # 根布局：字体、<html> 基础属性
  globals.css                       # design.md §2.6 的令牌
  [locale]/
    layout.tsx                      # 校验 locale、注入字典、渲染 Header/Footer/AuthDialog/Toaster
    page.tsx                        # 首页（五分区）
    not-found.tsx
    products/page.tsx               # 产品列表
    products/[slug]/page.tsx        # 产品详情
    purchase/[slug]/page.tsx        # 投保表单（需登录）
    guide/page.tsx                  # 投保指引
    about/page.tsx                  # 关于我们
    account/
      layout.tsx                    # 个人中心外壳：侧边栏 + 内容区
      page.tsx                      # 概览
      orders/page.tsx               # 我的订单
      orders/[id]/page.tsx          # 订单详情
      profile/page.tsx              # 修改资料
      password/page.tsx             # 修改密码
  api/
    products/route.ts               # GET 列表
    products/[slug]/route.ts        # GET 详情
    guide/route.ts                  # GET 投保指引
    cases/route.ts                  # GET 投保案例
    auth/register/route.ts          # POST
    auth/login/route.ts             # POST
    auth/logout/route.ts            # POST
    auth/session/route.ts           # GET
    auth/profile/route.ts           # PATCH
    auth/password/route.ts          # POST
    orders/route.ts                 # GET 列表 / POST 创建
    orders/[id]/route.ts            # GET 详情
    orders/[id]/cancel/route.ts     # POST
    orders/[id]/pay/route.ts        # POST 模拟支付
middleware.ts                       # 根路径重定向 + 语言段校验
components/
  ui/                               # shadcn 生成的原子组件
  layout/                           # header.tsx footer.tsx container.tsx
                                    # mobile-nav.tsx language-switcher.tsx scroll-rail.tsx
                                    # floating-tools.tsx（首页右侧悬浮工具轨）
  sections/                         # hero-section.tsx hero-media.tsx
                                    # products-section.tsx
                                    # guide-section.tsx cases-section.tsx about-section.tsx
  blocks/                           # section-heading.tsx product-card.tsx product-grid.tsx
                                    # case-card.tsx case-carousel.tsx
                                    # step-list.tsx material-list.tsx faq-accordion.tsx
                                    # order-status-badge.tsx order-list.tsx price.tsx
                                    # stat-block.tsx contact-block.tsx contact-channels.tsx
                                    # service-chat.tsx
  ai-elements/                      # conversation.tsx message.tsx prompt-input.tsx（AI Elements 源码，可改）
  auth/                             # auth-dialog.tsx auth-provider.tsx require-auth.tsx
  forms/                            # purchase-form.tsx profile-form.tsx password-form.tsx
                                    # password-input.tsx
lib/
  i18n/
    dictionaries/{zh,en}.json
    index.ts                        # 字典加载、locale 校验、文案读取
  mock/
    products/{base,zh,en}.json
    guide/{base,zh,en}.json
    cases/{base,zh,en}.json
  server/
    redis.ts                        # Upstash Redis 客户端（懒加载）与全部键名定义
    store.ts                        # Redis 数据访问层：用户、会话、订单、幂等种子数据
    auth.ts                         # 密码哈希、会话签发与校验、滑动续期
    products.ts                     # 合并 base + 语言文件，返回产品数据
    guide.ts
    cases.ts
    orders.ts                       # 创建、查询、取消、模拟支付、重复下单校验
    api-response.ts                 # ok() / fail() 统一响应构造器
  types/
    api.ts                          # 响应体契约：ApiResponse / ApiCode（前后端共享）
    index.ts                        # 领域模型：Product / User / Session / Order / Guide
  validation/                       # zod schema，前端表单与服务端接口共用同一份规则
  api-client.ts                     # 客户端统一 fetch 封装：解包 ApiResponse、统一处理 401
  utils.ts                          # cn()（shadcn init 生成）
docs/                               # 六份规格文档（prd / visual / design / ui-patterns / page-specs / avoid）
frontend-dev-skill/                 # 开发流程提炼出的通用 skill：SKILL.md + references/（六份文档骨架）+ agents/
```

---

## 3. 需要的 shadcn 组件

先执行 `npx shadcn@latest info` 确认项目的 `base` 是 `radix` 还是 `base`（决定自定义触发器用 `asChild` 还是 `render`），再安装：

```bash
npx shadcn@latest add button card dialog sheet alert-dialog dropdown-menu tabs badge \
  separator avatar form field input input-group label select accordion table skeleton empty alert sonner spinner hover-card \
  popover

# 对话组件来自 AI Elements（Vercel 官方，基于 shadcn）。重装会对已存在文件逐个询问是否覆盖，
# 本项目对 components/ui/button.tsx 做过定制（inverse / outline-inverse），覆盖时一律选否。
npx ai-elements@latest add conversation message prompt-input
```

| 组件 | 用在哪 |
| --- | --- |
| `button` | 全站操作；额外补了 `inverse` / `outline-inverse` 两个变体，供深底表面（首页首屏）使用 |
| `card` | 产品卡片、订单卡片、概览信息块 |
| `dialog` | 登录 / 注册弹窗 |
| `sheet` | 移动端导航抽屉 |
| `alert-dialog` | 取消订单二次确认 |
| `dropdown-menu` | Header 右侧用户菜单（个人中心 / 退出登录） |
| `tabs` | 登录弹窗的登录/注册切换、订单状态筛选 |
| `badge` | 产品标签（热销/新品/法定）、订单状态徽标 |
| `separator` | 分区内的信息分隔 |
| `hover-card` | 悬浮工具轨「联系方式」的提示框 |
| `popover` | 悬浮工具轨「在线客服」的会话面板（`side="left"`，避开右侧轨道） |
| `avatar` | Header 用户头像 |
| `form` + `field` + `input` + `input-group` + `label` + `select` | 投保表单、账户表单；密码框右侧的「小眼睛」用 `InputGroup` + `InputGroupAddon` 承载 |
| `accordion` | 投保指引的常见问题 |
| `table` | 我的订单（桌面端） |
| `skeleton` | 列表与详情的加载态 |
| `empty` | 订单为空、无搜索结果 |
| `alert` | 表单级错误、会话过期提示、演示数据声明 |
| `sonner` | 注册成功、资料已保存、订单已取消等轻提示 |
| `spinner` | 提交中状态 |

若某个组件名不存在，先用 `npx shadcn@latest search @shadcn -q "<关键词>"` 查再装。

---

## 4. 组件规范（Components 层）

### 4.1 强制规则

这些是 shadcn 的强制约定，违反即视为不合格：

- **`className` 只用于布局，不用于改样式**。禁止覆盖组件颜色与排版，改用内置 `variant` / `size`，或用 `cva` 在组件源码里加变体。
- **不用 `space-x-*` / `space-y-*`**，改用 `flex` + `gap-*`；纵向排列用 `flex flex-col gap-*`。
- **宽高相等时用 `size-*`**：`size-10` 而不是 `w-10 h-10`。
- **截断用 `truncate`**，不写 `overflow-hidden text-ellipsis whitespace-nowrap`。
- **不写 `dark:` 颜色覆盖**，用语义令牌（本主题无深色模式）。
- **条件类名用 `cn()`**，不手写模板字符串三元。
- **遮罩类组件不手写 `z-index`**，由 shadcn 自行管理堆叠。
- **表单布局用 `FieldGroup` + `Field`**，不用 `div` 加 `space-y-*` 或 `grid gap-*` 拼。
- **`InputGroup` 内必须用 `InputGroupInput` / `InputGroupTextarea`**，不塞裸 `Input` / `Textarea`。
- **`InputGroup` 放进 `FormControl` 时要把 `data-slot` 转挂到分组上**：`FormControl` 会透传 `data-slot="form-control"` 盖掉输入框自己的 `input-group-control`，分组的聚焦描边 / 报错描边选择器随即失配，输入框会既没有焦点环也没有错误环。
- **2–7 个选项的互斥选择用 `ToggleGroup`**，不循环 `Button` 手写激活态。
- **一组复选/单选外层用 `FieldSet` + `FieldLegend`**。
- **校验态用 `data-invalid` + `aria-invalid`**：`data-invalid` 加在 `Field` 上，`aria-invalid` 加在控件上；禁用态同理用 `data-disabled` + `disabled`。
- **列表项必须在对应的 Group 内**：`SelectItem` → `SelectGroup`，`DropdownMenuItem` → `DropdownMenuGroup`。
- **`Dialog` / `Sheet` / `Drawer` 必须有 Title**（`DialogTitle` 等），视觉上不需要就加 `className="sr-only"`。
- **`Card` 使用完整结构**：`CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter`，不要把内容全塞进 `CardContent`。
- **`Button` 没有 `isLoading` / `isPending`**，加载态用 `Spinner` + `data-icon` + `disabled` 组合。
- **`TabsTrigger` 必须在 `TabsList` 内**。
- **`Avatar` 必须配 `AvatarFallback`**。
- **用现成组件而不是手写标记**：提示用 `Alert`，空状态用 `Empty`，轻提示用 `sonner` 的 `toast()`，分隔用 `Separator`，加载占位用 `Skeleton`，徽标用 `Badge`。
- **图标用 `data-icon` 传入**，不手写尺寸类。

### 4.2 自定义组件约定

- 文件用 kebab-case，导出的组件用 PascalCase，一个文件一个主组件。
- props 显式声明并导出类型；不透传无约束的 `...rest` 到有语义的容器上。
- 变体用 `cva` 定义，风格与 shadcn 组件源码保持一致。
- `'use client'` **只加在确实需要交互的叶子组件上**，不要加在 `page.tsx` 或 Section 上——否则整棵子树失去服务端渲染。
- 服务端组件不 import 客户端组件才能用的 API（`useState`、`useEffect` 等）。

### 4.3 文案与格式化

- 组件内**不得硬编码业务文案**（含中文与英文），一律从字典取。
- 服务端组件：`const dict = await getDictionary(locale)` 后按需取字段。
- 客户端组件：由 `[locale]/layout.tsx` 的 `I18nProvider` 注入**当前语言**的字典，用 `useT()` 读取。不把整个多语言字典打给客户端。
- 金额与数字：`Intl.NumberFormat(locale, { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 })`；中文显示 `¥2,680`，英文显示 `CN¥2,680`。价格与保额必须启用 `tabular-nums`。
- 日期与时长：`Intl.DateTimeFormat(locale, ...)`，不手写 `YYYY-MM-DD` 拼接。

---

## 5. Block 规范

- 一个 Block 一个文件，导出一个组件。
- **Block 不发请求**：数据由 Page 取好后通过 props 传入。这样同一个 Block 在首页分区、列表页、详情页可复用，且 SSR/CSR 都能用。
- Block 的 props 只接收**已本地化的数据 + 回调**，不接收 `locale` 后自己去查字典（避免 Block 依赖 i18n 运行时）。
- 每个 Block 必须定义四种状态的表现，缺一不可：

| 状态 | 表现 |
| --- | --- |
| loading | `Skeleton` 骨架，形状与最终内容一致 |
| empty | `Empty` 组件 + 一句引导 + 一个操作入口 |
| error | `Alert`（`variant="destructive"`）+ 重试按钮 |
| ready | 正常内容 |

- 列表类 Block 的 `key` 用稳定业务 id（`product.id`、`order.id`），**禁止用数组下标**。
- Block 内部不出现 `useEffect` 取数；确有交互状态（展开、筛选）才标 `'use client'`。

**核心 Block 清单**

| Block | 说明 |
| --- | --- |
| `SectionHeading` | 分区抬头模版：眉标 + 大标题（可两段换色）+ 副标题。所有分区必须用它 |
| `ProductCard` | 产品卡片：名称、卖点、价格、保额、服务内容摘要、标签、双 CTA（描边「查看详情」+ 实心「立即投保」） |
| `ProductGrid` | 响应式网格（桌面 3 / 平板 2 / 移动 1），内含 loading / empty / error |
| `Price` | 价格展示：货币格式化 + `tabular-nums` + 可选「/ 年」单位 |
| `StepList` | 投保指引的流程步骤（序号 + 标题 + 说明 + 时长） |
| `CaseCard` | 投保案例卡片：图标 + 「城市 · 车主」+ 车牌与投保产品 + 理赔摘要 + 车主原话 + 理赔天数 |
| `CaseCarousel` | 投保案例横向轨道：匀速从右向左无缝循环（复制一份卡片接尾，`transform` 位移，越界即整体减掉一份），无播放控件；悬停 / 聚焦停住，`prefers-reduced-motion` 时不动；无数据时用 `Empty` |
| `MaterialList` | 所需材料清单（材料名 + 说明 + 是否必需） |
| `FaqAccordion` | 常见问题，基于 `accordion` |
| `OrderStatusBadge` | 订单状态徽标，**颜色 + 文字**，四个状态一一映射 |
| `OrderList` | 订单列表：桌面渲染 `Table`，移动端渲染卡片列表，同一数据源 |
| `StatBlock` | 关于我们的核心数据块 |
| `ContactBlock` | 联系方式块 |

---

## 6. 复用规则

- **使用次数 < 2 不抽象**：只有一处用到的结构直接内联在 Page 里，不要预先造组件。
- **出现第二处相同结构时才提取**成 Block。
- Block 超过约 150 行或承担两个以上独立职责时拆分。
- 不为了「可配置」预留未被使用的 props；`variant` 只有真的出现第二种形态时才加。
- 不复制粘贴视觉细节：颜色、圆角、间距一律走令牌与 shadcn 组件，不在页面里写样式值。
- 相似但不同的块（如「流程步骤」与「材料清单」）不强行合并成一个万能列表组件。

---

## 7. 状态规范

### 7.1 数据四态

每个取数区域都必须实现 loading / empty / error / ready，见 §5。

### 7.2 鉴权态

| 场景 | 行为 |
| --- | --- |
| 未登录看首页 / 产品 / 指引 / 关于 | 正常渲染，Header 右侧显示「登录 / 注册」 |
| 未登录点「立即投保」 | 不跳转，打开 `AuthDialog`；成功后回到该产品的投保表单 |
| 未登录直接访问 `/purchase/*`、`/account/*` | 服务端判定未登录 → 渲染 `RequireAuth` 占位（**不重定向**，保留 URL 与意图）；占位挂载后打开 `AuthDialog`；登录成功后 `router.refresh()` 原地进入页面 |
| 已登录 | Header 右侧显示头像 + 用户名，下拉菜单含「个人中心」「退出登录」 |
| 会话过期（1 小时无请求） | 任意接口返回 401 → 清除前端登录态 → 打开 `AuthDialog` → 成功后回到当前页面 |
| 退出登录 | 调 `/api/auth/logout` → `router.refresh()` → 回到首页 |

### 7.3 表单态

`idle` → `submitting`（`Spinner` + 按钮 `disabled`，防重复提交）→ 成功（`sonner` 轻提示）或失败（内联错误，`aria-invalid`）。

- 字段级错误提示贴在字段下方，由 `Field` 的校验态承载，不用弹窗报错。
- 字段级校验（必填、格式、长度、两次输入一致、密码强度）由前端 zod schema 完成，错误贴到字段下方，不发请求。
- 服务端只返回业务码：能唯一对应到某个字段的码（`EMAIL_TAKEN`、`INVALID_PASSWORD`、`SAME_PASSWORD`、`TOO_WEAK`）按 `prd.md` §10.1 的映射表贴到对应字段；`VALIDATION_ERROR`、`DUPLICATE_ORDER`、`INVALID_CREDENTIALS` 这类无法归属的用表单级 `Alert`。
- 提交失败后保留用户已填内容，不清空表单。

### 7.4 演示数据声明

首页与页脚需出现「演示数据」提示（`Alert` 或脚注文案），满足 `prd.md` §11 的合规约束。

---

## 8. 导航交互模式

### 8.1 SPA 路由导航

- 全站使用 `next/link` 做站内跳转，**不使用 `<a href>` 硬跳转**（语言切换与外部链接除外）。
- Header / Footer 位于 `[locale]/layout.tsx`，路由切换时**不重新挂载**，只有 `<main>` 内容变化。
- 语言段由 `[locale]` 提供，页面内跳转必须带上当前 `locale` 前缀。
- 返回/前进依赖浏览器历史正常工作；除语言切换外都用 `push`。

### 8.2 首页分区滚动导航

- 首页五个分区 id 固定为 `home` / `products` / `guide` / `cases` / `about`，顺序与 Header Tab 严格一致。
- **在首页点击 Tab**：`scrollIntoView({ behavior: 'smooth' })` 平滑滚动；**不改变 URL、不刷新页面**。
- **在其他页面点击 Tab**：先把目标分区写入 `sessionStorage`（键 `swi:pending-section`），再 `router.push` 到 `/{locale}`；首页挂载后读取该值、滚动到分区、随后清除该键。
- **滚动高亮**：用 `IntersectionObserver` 观察五个分区，取可见比例最大的分区高亮对应 Tab；不监听 `scroll` 事件逐帧计算。
- 每个分区加 `scroll-margin-top`，值等于吸顶 Header 高度，避免滚动后被 Header 遮住标题。
- **不使用 hash 路由，也不把 `#section` 写进 URL**。
- 滚动指示轨（`ScrollRail`）仅桌面端显示，复用同一套 `IntersectionObserver` 结果，激活点用 `--highlight`。

### 8.3 个人中心 Tab 导航

- 个人中心四个 Tab 是**独立路由**（`/account`、`/account/orders`、`/account/profile`、`/account/password`），因此侧边栏用 **`next/link` 导航列表**实现，**不用 shadcn 的 `Tabs` 组件**——`Tabs` 是纯客户端状态，不会改 URL，会破坏深链接、刷新与浏览器返回。
- 当前项高亮依据 `usePathname()` 与 `locale` 前缀比对。
- 移动端为顶部横向可滚动导航，样式像 Tab，实现仍是链接。
- 切换 Tab 只替换内容区，`AccountShell` 不重新挂载。

### 8.4 语言切换导航

- 用 `router.replace` 把当前路径的语言段替换为目标语言，**不新增历史记录**（避免返回键在两份语言间反复横跳）。
- 跳转前写入语言 Cookie（`NEXT_LOCALE`，有效期 1 年）。
- 路径其余部分保持不变；首页场景下把当前分区写入 `sessionStorage`，目标语言页面读取后复原位置。
- 根路径 `/` 由 `middleware.ts` 按「Cookie → `Accept-Language` → 默认 `zh`」重定向。
- **入口只在 Header**：Footer 不提供语言切换，避免同一页面出现两个语言入口。

### 8.5 登录注册弹窗导航

- `AuthDialog` 全局挂载在 `[locale]/layout.tsx`，**不引入 `/login` 路由**。
- 通过 `AuthProvider` 暴露 `openAuthDialog({ intent })`，任何地方都能唤起。
- 弹窗内含「登录」「注册」两个 Tab；打开时**不改变 URL**。
- 登录成功后关闭弹窗并**回到原意图**（如投保表单），由调用方传入的回调承接。

### 8.6 移动端导航

- Header 在 `< 1024px` 收纳为 `Sheet` 抽屉，点击导航项后自动关闭。
- 抽屉内的分区 Tab 行为与桌面一致（在首页滚动、在其他页先跳首页）。

---

### 8.7 悬浮工具轨

- `FloatingTools` 只挂在首页（`app/[locale]/page.tsx`），其他页面不出现。
- 断点 `hidden xl:block`：**≥ 1280px 才渲染**。1024–1279px 时内容区右缘会与 48px 宽的轨道重叠，宁可不显示。
- 三个按钮纵向排列，固定在视口右侧、垂直居中，层级 `z-30`（低于 Header 的 `z-40`）。
- 在线客服 → `Popover`（`side="left"`、`sideOffset={8}`），内容为 `ServiceChat`：头部（标题 + 服务时间）、对话区、输入行。对话区由 AI Elements 的 `Conversation` / `Message` / `PromptInput` 组成，消息状态与流式接收来自 `useChat`（`@ai-sdk/react`）。
- 面板宽 320px（`w-[20rem]`），对话区固定高 269px（`h-[16.8rem]`），总高约 474px。矮视口由 Radix 的碰撞检测整体上移，不自己算位置。
- 不用遮罩、不锁滚动、不改 URL。内部点击不关闭，`Esc` 关闭并把焦点还给触发按钮（Radix 默认行为，未覆写）。
- **只发文本**：不渲染附件按钮，`onSubmit` 里直接忽略 `PromptInputMessage.files`。
- 联系方式 → `HoverCard` + `side="left"`，提示框内为电话 / 邮箱 / 微信二维码。
- 返回顶部 → `window.scrollTo({ top: 0, behavior: "smooth" })`；不写 `#top` 锚点、不改 URL。
- 触发元素必须是真的 `button`（键盘可聚焦，名称来自 `sr-only` 文案），`HoverCard` / `Popover` 的 `Trigger` 均用 `asChild` 承载。
- 联系方式内容全部复用 `ContactChannels`（`HoverCard` 与 Footer 共用），只有一份数据源；客服面板同理，只有 `ServiceChat` 一处。

---

## 9. 路由实现规则

- 所有页面位于 `app/[locale]/`，`[locale]` 只接受 `zh` 与 `en`。
- `middleware.ts` 只做两件事：
  1. 根路径 `/` 重定向到 `/{locale}`。
  2. 校验语言段合法性。
  matcher 必须排除 `/api`、`/_next`、静态资源与 `favicon.ico`，**不得拦截接口请求**。
- 非法语言段（如 `/fr`）在 `[locale]/layout.tsx` 中调用 `notFound()`，由 `not-found.tsx` 呈现 404。
- **动态参数是 Promise**：`const { locale, slug } = await params`。这是 Next.js 15 起的变化，忘记 `await` 是最常见的错误来源。
- 默认全部是服务端组件；只有需要交互的叶子组件加 `'use client'`。
- `generateMetadata` 按 `locale` 输出标题与描述，并输出两种语言的 `alternates.languages`（hreflang）。
- 语言相关的 `html lang` 在 `[locale]/layout.tsx` 设置。
- 每个路由段可提供 `error.tsx` 与 `loading.tsx`；`error.tsx` 必须是客户端组件。
- **不使用 hash 路由**（禁止 `#/xxx` 形式）。

### 9.1 数据获取位置的约定

| 数据类型 | 获取方式 |
| --- | --- |
| 产品、投保指引、投保案例（公开只读） | 服务端组件调用 `lib/server/products.ts`、`lib/server/guide.ts`、`lib/server/cases.ts`；这三个函数同时是 `/api/products`、`/api/guide`、`/api/cases` 的数据来源 |
| 用户、订单（需鉴权、需变更） | 客户端组件 `fetch('/api/**')`；服务端组件读取时直接用 `lib/server/auth.ts` 校验会话 |
| 表单提交、取消订单、模拟支付 | 客户端 `fetch` POST，成功后 `router.refresh()` 让服务端数据重新渲染 |
| 客服对话（流式） | `useChat` 走 `POST /api/chat`，**不套统一信封**——AI SDK 的 UI 消息流协议要求响应体就是流本身；历史记录用 `GET /api/chat?sessionId=` 取，那个仍走信封 |

**响应体契约**：所有接口统一返回 `{ success, code, message, data }`，权威定义见 `prd.md` §10.1。客户端只信 `success` 与 `code`，UI 文案由 `code` 查字典得到，**不渲染后端 `message`**（否则英文用户会看到中文）。收到 `code: "UNAUTHORIZED"` 时的统一处理：清除登录态 → 打开 `AuthDialog` → 成功后回到当前页面。

> **一处需要你拍板的张力**：PRD §10.3 写的是「前端经接口请求获取」产品数据。若让服务端组件用 HTTP 去请求自己的 `/api/products`，会产生一次进程内多余往返、需要配置绝对 URL，且缓存语义更绕；因此本文约定**服务端页面直接调用数据函数，接口作为同一份数据的对外出口**。如果你要求产品页也严格走 HTTP 请求，代价是产品列表与详情页失去服务端渲染与 SEO——请在实现前确认。

---

## 10. 通用布局模式

- **`Container`**：统一处理最大宽度 1200px 与响应式左右内边距（20 / 32 / 40px）。页面与分区不得各自写 `max-w-*` 与 `px-*`。
- **分区结构**：每个分区 = `Container` + `SectionHeading` + 内容 + 可选 CTA。抬头模版必须统一，五个分区看起来要像一套系统。
- **分区切换靠留白**，不用分割线或色块硬切（垂直内边距见 `design.md` §4.2）。
- **无缝循环轨道**（投保案例）：全站唯一的自动播放位。结构是「`overflow-hidden` 视口 + `w-max` 行」；卡片渲染两份，用 `requestAnimationFrame` 按时间差匀速位移 `transform: translate3d()`（不是改 `scrollLeft`、不是逐卡跳），位移越过「一份的宽度」就整体减掉一份，因此永远衔接、不会回卷。用 `ResizeObserver` 重量一份宽度（语言 / 字号 / 窗口变化都会改宽度）。必须做到：① 不用 `snap-*`（会和连续位移打架）；② 悬停与聚焦时停住（`tabIndex=0` 让键盘用户也能停）；③ `prefers-reduced-motion: reduce` 时不动画；④ 单帧步长按时间差计算并设上限，避免标签页回到前台时跳一大段。横向溢出只能被视口裁剪，**不得传到页面级**（360px 无横向滚动条）。
- **页面骨架**：

```
<Header />                      吸顶，跨语言共享
<main>{children}</main>         页面内容
<Footer />                      深蓝底反白
<AuthDialog />                  全局弹窗
<Toaster />                     轻提示容器
```

首页在此之上额外挂 `ScrollRail`；`/account/*` 在 `[locale]/account/layout.tsx` 中再套一层 `AccountShell`（侧边栏 + 内容区）。

- **首屏媒体层（首页 Hero）**：`overflow-hidden` 的 Hero 内部叠三层——`next/image` 的 poster（`fill` + `priority` + `sizes="100vw"`）→ `video`（`absolute inset-0 size-full object-cover`）→ 深蓝径向遮罩（`bg-radial`，中心最淡）；内容层 `relative z-10`。媒体层**绝对定位、不是 `fixed`**，滑出视口即随 Hero 一起消失。视频的挂载时机、暂停与降级规则见 `avoid.md` §5。
- **响应式列表模式**：桌面用 `Table`、移动用卡片列表时，**数据源与状态共用一套**，只在渲染层分叉，不要写两份取数逻辑。

---

## 11. UI 架构验收清单

- [ ] 页面里没有原始色值与手写样式常量，全部走令牌与 shadcn 组件。
- [ ] `components/ui/` 下没有业务文案、没有请求、没有 `lib/server` 引用。
- [ ] Block 不发请求，四种状态（loading / empty / error / ready）齐全。
- [ ] `'use client'` 没有出现在任何 `page.tsx` 或 `*-section.tsx` 上（首屏视频层 `hero-media.tsx` 是 Section 内部唯一带交互状态的叶子，允许）。
- [ ] 列表 `key` 均为业务 id，无数组下标。
- [ ] 全站导航用 `next/link`，无 `<a href>` 硬跳转。
- [ ] 首页 Tab 在首页内滚动、在外页跳首页并复原分区；URL 中不出现 `#section`。
- [ ] 个人中心侧边栏是链接而非 `Tabs`，四个 Tab 均可深链接与刷新。
- [ ] 语言切换用 `replace`，不新增历史记录，路径其余部分不变。
- [ ] 未登录访问 `/purchase/*`、`/account/*` 时保留 URL 并打开登录弹窗，未被重定向丢意图。
- [ ] `middleware.ts` 未拦截 `/api` 与静态资源。
- [ ] 动态参数均以 `await params` 方式读取。
- [ ] 金额与日期使用 `Intl` 按语言格式化，价格启用 `tabular-nums`。
- [ ] 遮罩类组件未手写 `z-index`；`Dialog` / `Sheet` 均有 Title。
- [ ] 已出现「演示数据」声明。