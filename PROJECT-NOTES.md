# 工程笔记：设计取舍、踩坑与实现要点

> 汽车保险演示站（Next.js 16 全栈）。线上：https://swi-sh.vercel.app/zh
> 本文记录**为什么这么做**，需求与视觉规范见 `docs/`（`prd.md` / `visual.md` / `design.md` / `ui-patterns.md` / `page-specs.md` / `avoid.md`）。

---

## 1. 这个项目是什么

一个中英双语的汽车保险站：浏览保险产品 → 按四步投保指引填写 → 提交订单 → 个人中心管理订单，右侧悬浮栏提供 AI 在线客服。

功能边界（演示站，不是可上线运营的产品）：

- **有**：产品浏览与详情、四步投保指引、投保案例轮播、关于我们、邮箱注册登录、个人中心（我的订单 / 修改资料 / 修改密码）、订单模拟支付与取消、AI 客服、i18n（`/zh`、`/en`）。
- **无**：真实支付、真实保单、短信/邮件、后台管理、图片上传。

---

## 2. 技术栈与选型考虑

| 技术 | 版本 | 为什么用它 | 放弃了什么 |
| --- | --- | --- | --- |
| Next.js（App Router） | 16.3.5 | 前后端同仓；服务端组件让产品/指引/案例这类内容站天然 SSR，SEO 与首屏都好；Route Handler 提供 HTTP 接口面 | 相比纯前端 SPA，多了一层「服务端/客户端」心智负担 |
| React | 19.2.8 | 跟随 Next 16 的稳定组合 | — |
| TypeScript | 5 | 字典、API 响应体、领域模型全部有类型，改字段能全链路报错 | — |
| Tailwind CSS | v4 | 原子类 + 自定义 token，样式改动不用在两个文件间来回跳 | — |
| shadcn/ui（`radix-ui` + CVA） | shadcn 4.21 | **源码进仓库**而非黑盒依赖，`accordion` 这种要改样式/图标时直接改 | 需要自己维护，重跑 `shadcn add` 会覆盖手改 |
| react-hook-form + zod | 7.88 / 4.6 | 表单校验规则与后端共用一份 schema 思路（`lib/validation/`） | — |
| Upstash Redis（`@upstash/redis`） | 1.39 | Serverless 友好（HTTP 协议，无连接池问题），Vercel 上一键集成；**解决了「Vercel 上登录不上」**（见 §8.1） | 比内存慢一个量级（每次读写一次网络往返） |
| AI SDK（`ai` + `@ai-sdk/react`） | 7.0.107 / 4.0.110 | 流式对话、工具调用、`useChat` 一体；换模型只改 provider | 抽象层较厚，出错时日志要靠 `onError` 显式打 |
| `@ai-sdk/openai-compatible` | 3.0.53 | 国内多家模型都暴露 OpenAI 兼容协议，用它接任意 baseURL | 不是官方 provider，个别高级特性不可用 |
| AI Elements | 源码级 | 官方为 AI SDK 准备的对话 UI 组件，直接进 `components/ai-elements/` | 同样是源码，需自维护 |
| sonner | 2.0 | 轻量 toast | — |

**刻意没引入的**：`next-intl`（见问答与 §7）、任何 ORM/数据库（当前 Redis 够用）、任何状态管理库（Context + `router.refresh()` 够用）。

---

## 3. 架构总览

### 3.1 客户端 / 服务端是怎么分的

**默认服务端组件**，只有需要状态、事件、浏览器 API 的文件才标 `"use client"`（当前 57 个，集中在 `components/`）。`"use server"` 用了 **0 个** —— 所有写操作都走 Route Handler。

```
app/
├── layout.tsx                 # 根布局：只负责 <html lang>（读 middleware 传的 x-locale）+ 字体
├── [locale]/                  # URL 语言段，页面与布局都在这里
│   ├── layout.tsx             # 全站外壳：注入字典 + 登录态，挂 Header/Footer/弹窗/Toaster
│   ├── page.tsx               # 首页（分区滚动导航的各个 section）
│   ├── products/ guide/ about/ purchase/[slug]/ account/{orders,profile,password}
│   └── error.tsx not-found.tsx
└── api/                       # Route Handler（后端）
components/
├── ui/            # shadcn 基础组件
├── ai-elements/   # AI SDK 的对话 UI（源码级）
├── layout/        # Header / Footer / 悬浮工具轨 / 语言切换
├── sections/      # 首页分区（hero、products、guide、cases、about、faq、cta）
├── blocks/        # 业务块（产品卡、订单列表、客服面板、案例轮播…）
└── forms/         # 表单（投保、登录、注册、改资料、改密码）
lib/
├── types/         # 领域模型 + API 响应体类型（前端/后端共用）
├── validation/    # zod schema + 字段级错误码
├── i18n/          # config / dictionaries / provider / server / format / errors / cookie
├── mock/          # 构建期只读数据（base.json + zh.json + en.json）
├── server/        # 仅服务端：redis / store / auth / orders / products / ai（含 tools）
├── api-client.ts  # 客户端 fetch 封装
└── section-nav.ts # 首页分区 id 与滚动导航
```

### 3.2 一条数据的两种走法（重要）

同一个数据函数有两条出口，页面走**直接调用**，接口只作为对外出口：

| 场景 | 走法 | 例子 |
| --- | --- | --- |
| 页面渲染产品/指引/案例 | 服务端组件**直接调用** `lib/server/products.ts` 等 | `app/[locale]/products/page.tsx` |
| 写操作（下单、支付、改资料、登录） | 客户端 `fetch` → Route Handler | `components/forms/purchase-form.tsx` |
| 客服对话 | 客户端 `fetch` → `/api/chat`（流式） | `components/blocks/service-chat.tsx` |
| 外部调用方/浏览器调试 | `GET /api/products` 等 | 目前站内没有调用方（见 §10） |

**为什么不让自己人 HTTP 请求自己的接口**：会产生一次进程内多余往返、要配置绝对 URL、缓存语义更绕，还会失去服务端渲染。所以约定「数据函数是唯一真相，接口是它的对外投影」。

---

## 4. Redis 存储数据结构

键前缀统一 `swi:`，全部定义在 `lib/server/redis.ts` 的 `redisKeys`，读写两侧共用同一份，避免拼错。

| 键 | 值类型 | 内容 | TTL |
| --- | --- | --- | --- |
| `swi:user:{userId}` | JSON | `{ id, username, email, passwordHash, createdAt, updatedAt }` | 无 |
| `swi:email:{email}` | String | `userId`（邮箱统一小写，做唯一索引） | 无 |
| `swi:session:{sessionId}` | JSON | `{ id, userId, expiresAt }` | **3600s**（滑动续期） |
| `swi:usessions:{userId}` | Set | 该用户全部 sessionId | 无 |
| `swi:order:{orderId}` | JSON | 订单完整对象 | 无 |
| `swi:uorders:{userId}` | List | 订单 id，`lpush` 新的在前 | 无 |
| `swi:dedup:{userId}:{车牌}:{productId}` | String | orderId，防同车同产品重复投保 | 无 |
| `swi:chat:{sessionId}` | JSON | `{ id, userId, messages[], updatedAt }` | **7 天** |

设计点：

- **邮箱索引用 SETNX 抢占**，而不是「先查后写」。多实例并发注册同一邮箱时只有一个能成功，另一个拿到 `EMAIL_TAKEN`。写用户失败会 `releaseEmail` 回滚占位（`lib/server/store.ts:47`）。
- **密码不落地明文**：`scryptSync(password, salt, 64)` 存成 `salt:hash`，校验用 `timingSafeEqual` 恒定时间比较（`lib/server/password.ts`）。
- **`usessions` 用 Set** 的目的：改密码时能精准「保留当前设备、踢掉其它设备」（`invalidateOtherSessions`），这是 JWT 做不到的。
- **过期交给 Redis**：会话带 `EX` 落库，服务端不依赖进程存活做清理。这是从「内存 Map」迁移过来的最大收益。
- **只读 mock 不进 Redis**：产品/指引/案例是构建期 `import` 的 JSON，跨实例天然一致，放进 Redis 反而多一份要同步的副本。

---

## 5. 用户登录、注册与会话

### 5.1 凭证设计：不透明 session id，不用 JWT

Cookie `swi_session` 里只放一个 UUID，值本身不含任何身份信息，服务端拿它去 Redis 查：

```
swi_session=ee816c55-...; Path=/; Expires=...; Max-Age=3600; HttpOnly; SameSite=lax
```

- `HttpOnly`：JS 读不到，防 XSS 偷会话。
- `SameSite=lax`：跨站不发送、顶层导航发送，防 CSRF 又不破坏「从外链进来仍是登录态」。
- `Max-Age=3600`：浏览器侧 1 小时。
- 已知缺口：**没加 `secure`**。Vercel 有 HSTS 兜底，但规范做法是 `secure: process.env.NODE_ENV === "production"`。

选它而不选 JWT 的理由：JWT 无法真正作废，「改密码踢掉其它设备」这条需求只有服务端有 session 表才做得到。

### 5.2 注册流程

1. `POST /api/auth/register` → zod 校验
2. 查邮箱占用 → `claimEmail()` 用 SETNX 原子抢占
3. `hashPassword()` → 写入 `swi:user:{id}`
4. `startSession()` 签发会话 + 下发 Cookie
5. 返回 201 + `PublicUser`（**不含 `passwordHash`**，由 `toPublicUser()` 剥离）

`userId` 是 `randomUUID()`（UUID v4）。演示账号 `usr-demo` 是固定 id，用 SETNX 幂等种子写入（只写不覆盖），所以新注册用户不会影响它。

### 5.3 登录流程

1. `POST /api/auth/login` → zod 校验
2. `findUserByEmail()` → `verifyUserPassword()`
3. **用户不存在或密码错误统一回 `INVALID_CREDENTIALS`**，不泄露「邮箱是否注册过」
4. `startSession()` → 下发 Cookie → 返回 `PublicUser`

### 5.4 登录态怎么在前端生效（关键）

**不是改前端 state，而是让服务端重读 Cookie。**

- `app/[locale]/layout.tsx` 在服务端调 `readSession()`，把结果作为 `initialUser` 注入 `AuthProvider`。
- 前端登录成功后调 `router.refresh()`，服务端布局重新渲染，Header 就从「登录 / 注册」变成用户名。
- 未登录访问 `/purchase/*`、`/account/*`：**不重定向**，服务端渲染 `RequireAuth` 占位并自动弹登录框，URL 不变、用户意图不丢。
- 任何接口回 `UNAUTHORIZED` → `lib/api-client.ts` 的全局 handler 触发 refresh + 弹窗（`fetchCurrentUser` 显式跳过，否则每次探测登录态都会弹窗）。

### 5.5 滑动续期（1 小时）

- `renewSession()` 把 `expiresAt` 顺延 1 小时并重写 Cookie。**只能在 Route Handler 调用**——服务端组件渲染路径改不了响应头。
- 前端 `AuthProvider` 挂载时探一次 `GET /api/auth/session` 完成续期；所有写接口（下单、支付、取消、改资料、改密码）也会过一遍。
- 服务端组件只能用只读的 `readSession()`。

### 5.6 会话 id 有两个概念，别混

| | 登录态会话 `swi_session` | 客服会话 `swi_chat_session` |
| --- | --- | --- |
| 存哪 | Cookie（服务端签发） | `localStorage`（浏览器生成） |
| 一个用户几个 | **不限**，每次登录签发新的，多设备多浏览器各一个 | **每个浏览器一个**，生成后不再变 |
| 谁生成 | 服务端 `randomUUID()` | 浏览器 `crypto.randomUUID()` |
| 生命周期 | 1 小时滑动续期 | Redis 侧 7 天，localStorage 永久 |
| 登录前后 | — | **id 不变**，只是 Redis 记录的 `userId` 被绑上 |

---

## 6. AI 客服会话流程

```
用户点悬浮栏「在线客服」
  → Popover 打开 ServiceChat
  → localStorage 取/建 sessionId
  → GET /api/chat?sessionId= 拉历史（决定初始消息）
  → useChat 挂载，发消息时 POST /api/chat { sessionId, messages, locale }
  → 服务端：readSession() 判登录态 → saveChatSession() 存一份
  → createSupportAgent({ locale, userId, userName })
  → createAgentUIStreamResponse({ sendReasoning: false, onEnd, onError })
  → onEnd 用完整列表（含助手回复）覆盖存一次
```

设计点：

- **登录态只由服务端判定**。前端传 `userId` 不起作用——「未登录请先登录」这道门无法被前端伪造。
- **绑定时机巧妙**：请求前那次 `saveChatSession()` 顺带把匿名会话绑到 `userId`（`userId: input.userId ?? existing?.userId ?? null`），不需要单独的「绑定接口」。
- **`onEnd` 必须再存一次**：只在请求前存的话，助手回复只存在于浏览器内存，刷新后就只剩用户自己的提问。
- **`sendReasoning: false`**：上游模型会吐思维链，界面只渲染正文，关掉省流量。
- **`onError` 显式打日志**：流已开始后上游才报错时，AI SDK 默认只回「An error occurred.」，前端拿不到原因。
- **读取权限**：未绑定（`userId: null`）凭随机 id 可读；已绑定则只回给本人（`canReadChatSession`）。
- **会话 id 正则约束** `^[A-Za-z0-9_-]{16,64}$`，避免脏 key 与超长 key。
- **单会话只留最近 60 条**，Redis 侧 7 天过期。
- **首次 hydration 竞态**：`GET /api/chat` 在 `useChat` 之后返回会把历史覆盖成空数组。当前靠「外层先取完历史、拿到后才挂载内层对话」规避（`service-chat.tsx` 的外层 / `ChatPanel` 内层拆分）。

Agent 侧（`lib/server/ai/agent.ts`、`tools.ts`）：

- `ToolLoopAgent` + 两个 zod 工具：`searchProducts`（查产品，**未登录也能用**）、`queryOrders`（查订单，模型传的 `userId` 与服务端 `authedUserId` 再比对，未登录返回 `requiresLogin`）。
- instructions 里带语言与登录态，因此**回答语言跟随页面语言**。
- 模型配置全在环境变量：`AI_PROVIDER_NAME` / `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`。

---

## 7. i18n 实现

手写四层，没有用 `next-intl`。

### 7.1 URL 带语言前缀

`/zh/products/compulsory-traffic`、`/en/products/compulsory-traffic` 是**两个真实可索引的 URL**（不是切语言不改 URL 的客户端方案），因为要做 SEO 的 hreflang。

### 7.2 各层职责

| 文件 | 职责 |
| --- | --- |
| `lib/i18n/config.ts` | 语言集合、默认语言、Cookie 名 `NEXT_LOCALE`、请求头名 `x-locale`、`Accept-Language` 解析。**被 middleware 引用，不能碰 Node API** |
| `middleware.ts` | `/` 按偏好重定向；把语言段写进 `x-locale` 透传给根布局 |
| `lib/i18n/dictionaries/{zh,en}.json` | 全站 UI 文案。以 `zh.json` 推导 `Dictionary` 类型，`en.json` 漏键会类型报错 |
| `lib/i18n/provider.tsx` | 客户端 `useT()` / `useI18n()` / `useLocale()`；**只注入当前一种语言**的字典 |
| `lib/i18n/server.ts` | `resolveLocaleParam()` 把非法语言段（`/fr`）收口成 404；`buildAlternates()` 生成 hreflang |
| `lib/i18n/format.ts` | 金额/日期交给 `Intl`（中文 `¥2,680`，英文 `CN¥2,680`） |
| `lib/i18n/errors.ts` | 后端只回业务码，UI 用 code 去字典 `errors` 命名空间取文案 |
| `components/layout/language-switcher.tsx` | 只替换路径首段，`router.replace` 不新增历史；写 Cookie；首页记住当前分区 |
| `components/layout/html-lang.tsx` | 客户端切语言时根布局不重建，`<html lang>` 会停在旧值，用 effect 同步 |
| `lib/server/request-locale.ts` | 接口侧语言解析：`?locale=` → `Accept-Language` → 默认 |

### 7.3 流程

**URL 决定语言 → middleware 透传 → 布局注入字典 → 客户端组件取字典 → API 调用显式带 locale。**

### 7.4 为什么不用 next-intl

1. 本项目需要的功能很有限：**两种语言、URL 前缀、一份字典、Cookie 记忆**——`config.ts` + `middleware.ts` + Context 约 150 行就覆盖完了。
2. next-intl 的强项是 ICU 消息格式化（复数、插值、日期相对时间），本项目文案里几乎没有这类场景；金额/日期直接用 `Intl` 更直接。
3. 少一个依赖就少一层「它怎么渲染的」不确定性，报错栈也短。
4. 代价要如实说：**复数/插值/嵌套消息要自己写**，语言多到 5 种以上、或需要按命名空间懒加载字典时，就该换 next-intl 了。

---

## 8. 踩坑与设计点

### 8.1 Vercel 上「登录不上」：内存存储的根因

**现象**：本地登录正常，线上用演示账号也登不上，重启、刷新都没用。

**根因**：早期账户/订单存在**模块级变量**里。Vercel 是 Serverless 多实例，每个函数实例各有一份内存：

- 注册请求打到实例 A → 账号只存在 A 的内存里；
- 登录请求打到实例 B → B 没有这个账号 → `INVALID_CREDENTIALS`；
- 实例空闲被回收 → 数据直接消失。

所以是「**看起来偶发、实际必错**」，跟密码、Cookie 都没关系。

**修法**：把账户/订单/会话/聊天记录迁到 Upstash Redis（HTTP 协议，Serverless 友好）。产品/指引/案例不用迁——它们是构建期 `import` 的 JSON，天然跨实例一致。

**这个限制是什么**：内存 mock 只能跑在**单进程**环境（本地 `next dev`、或自托管 `next start` 单实例）。放到 Serverless / 多实例平台上，"同一次会话里的多次请求落到不同实例" 就会读到不同的内存。

### 8.2 React：副作用不能写进 `setState` 的更新函数

**现象**：登录成功时控制台报 `Cannot update a component (Router) while rendering a different component`，且**偶发**。

**根因**：`auth-provider.tsx` 原本把登录后回调写在了更新函数里：

```tsx
setDialog((current) => {
  current.onSuccess?.();   // = () => router.push(purchasePath)
  return { open: false };
});
```

`setDialog` 的更新函数会被 React 放到**渲染期**求值（为了延迟计算、合并更新）。在里面调 `router.push`，就成了「渲染 A 组件时更新 Router 组件」。

**为什么偶发**：更新函数是否真在渲染期调用，取决于那一刻组件有没有待处理的更新（批量时机）。有 pending 更新走渲染期求值 → 报错；没有则同步执行 → 不报错。

**修法**：把回调挪到 `useRef`，state 只留 `{ open, description }`，副作用不在渲染期跑了。

### 8.3 React：`router.push()` 必须在 `router.refresh()` 之前

**现象**：修完 8.2 后回归测试发现，从产品卡「立即投保」登录后，Header **仍显示「登录 / 注册」**，手动刷新才对。其他两条登录路径（首页 Header 直接登录、投保页门禁自动弹窗）都正常。

**根因**：`router.refresh()` 与 `router.push()` **同批发出时，push 会让 refresh 落空**，共享的 `[locale]` 布局不会重新取，Header 的 `initialUser` 停在未登录。投保页自己渲染出来了，是因为它的取数随导航发生，掩盖了这个问题。

**修法**（顺序纪律）：

```tsx
setDialog({ open: false });   // 关弹窗
onSuccess?.();                 // 执行调用方后续动作（可能 push）
router.refresh();              // refresh 作用在新路由上
```

**教训**：这两类 bug 都只在「特定顺序 + 特定路由」下暴露，所以修完必须**三条登录路径都回归**，不能只测一条。

### 8.4 媒体：4.7MB 首屏视频不能参与 LCP

`public/hall.mp4` 4.68MB。直接挂到 Hero 上会把 LCP 拖垮。四层保护（`components/sections/hero-media.tsx`）：

1. `hall-poster.jpg` 用 `next/image` + `priority` 先上，作为首屏图片立刻加载；
2. 视频等窗口 `load` 之后的空闲时机才挂载，`preload="none"`，不与 poster 抢带宽；
3. 视频真正 `onPlaying` 后才 600ms 淡入，避免挂载瞬间的黑帧；
4. `prefers-reduced-motion: reduce` 时完全不挂载 video，只保留 poster（**请求根本不发出**）。

另外两点：

- **只服务首屏**：整层用 `absolute` 定位在 Hero 内部（不是 `fixed`），滑到下面分区时自然滚出视口，不会变成全局背景、也不会在别的页面出现；再用 `IntersectionObserver`（阈值 0.25）滑出时 `pause()` 停解码。
- **自动播放的硬约束**：浏览器只允许 `muted + autoPlay + playsInline` 组合自动播。缺 `muted` 会被拦截，缺 `playsInline` 在 iOS 会被强制全屏。

CDN 只能缓解传输，改不了「4.7MB 要解码」这件事；真正的解法是压到 1MB 以内（或换更短的循环片段）。

### 8.5 媒体：首屏遮罩返工两轮

- **第一版整体太深** → 视频观感被压死。改成**径向遮罩：中心最淡、向四周渐深**（`bg-radial from-primary/38 via-primary/55 to-primary/72`），推理是「文案在中心，只需要中心有对比度」。
- **第二版白色区域突兀** → 遮罩与 poster 的亮度衔接不自然。给媒体层加 `brightness-[0.6]` 统一压暗，视频与 poster 同一亮度基准，色块过渡才顺。
- **约束**：中心处白字对比度仍须过 4.5:1，所以中心只微调，降幅主要落在中段与四角。

### 8.6 mock 数据：base + 语言文件拆分

早期把中英各写成一份完整对象，问题是**改价漏改一边**就会出现「中文 2680、英文 1280」。改成三层：

- `base.json`：语言无关（`id / slug / category / price / coverageAmount / period / badge / active / sortOrder`）
- `zh.json` / `en.json`：按 `slug`（案例按 `id`）只存文案

加载时按 key 合并，并**校验两侧键集合完全一致**，漏翻译直接构建失败。

### 8.7 i18n：为什么最终选了 URL 前缀

最初参考站的切语言**不改 URL**（纯客户端）。改成本项目要求 URL 带前缀，原因是：

- 要 SEO：`/zh/...` 与 `/en/...` 是两个可索引页面 + hreflang 互指；
- 要可分享：把链接发给别人，对方看到的就是同一语言；
- 要服务端渲染：语言在服务端就能确定，首屏不闪。

代价是切语言会走一次导航（`router.replace` 不新增历史），首页还要额外记住当前分区位置才能复原滚动位置。

### 8.8 AI 接入的排查顺序

按「先证明链路通、再证明模型通」推进，避免把两类问题混在一起：

1. provider 用错包（装过 `@ai-sdk/openai`，应删掉，用 `@ai-sdk/openai-compatible`）；
2. `.env` 缺 `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`（先写 `.example.env`，密钥不进仓库）；
3. 模型侧权限/欠费（表现为流已开始才报错，所以 `onError` 必须打日志，否则只看得到「暂时不可用」）。

### 8.9 组件库：重跑 `shadcn add` 会覆盖手改

`components/ui/accordion.tsx` 被改成 `+ / −` 图标，这属于**改源码**。以后重跑 `npx shadcn@latest add accordion` 会被官方版本覆盖，需要重打补丁。用 shadcn 的代价就是这个：灵活性与「不能无脑更新」并存。

### 8.10 Next 16：Middleware 已改名 Proxy

Next 16 起 `middleware.ts` 正式叫 `proxy.ts`（构建输出里的标签也变成 `ƒ Proxy (Middleware)`）。当前项目仍用 `middleware.ts`，**Next 16 两个文件名都接受**，但新写的项目建议直接用 `proxy.ts`，函数名也写成 `proxy`。

---

## 9. 开发流程思路

1. **先文档后代码**：`docs/` 六份文件各管一件事（做什么 / 什么感觉 / 怎么设计 / 怎么搭 / 每页怎么搭 / 不要做什么），动手前先对齐，改设计就先改文档。
2. **按模块推进，每步可验收**：每个功能做完先在浏览器里实测一遍再往下走，避免最后一次性调试。
3. **mock 数据先行**：数据结构定下来后前后端分头走，产品/指引/案例一开始就走「JSON + 合并函数」，后面换真实来源不用改页面。
4. **类型即契约**：请求/响应体（`lib/types/api.ts`）、领域模型（`lib/types/index.ts`）、校验 schema（`lib/validation/`）集中定义，改字段全链路报错。
5. **验证要覆盖分支**：8.3 的教训——同一个功能有多条入口时（三条登录路径），只测一条会漏。
6. **不留半成品**：注册/登录/下单/支付/客服每条链路都要能端到端跑通才算完成。

---

## 10. API 一览与实际调用位置

响应体统一信封：`{ success, code, message, data }`（`lib/server/api-response.ts`），HTTP 状态码由业务码映射（不一律返 200）。

| 方法 | 路径 | 谁在调用 |
| --- | --- | --- |
| GET | `/api/auth/session` | `lib/api-client.ts:85` `fetchCurrentUser()`（探测 + 续期） |
| POST | `/api/auth/register` | `components/auth/register-form.tsx:49` |
| POST | `/api/auth/login` | `components/auth/login-form.tsx:45` |
| POST | `/api/auth/logout` | `components/auth/auth-provider.tsx:88` |
| PATCH | `/api/auth/profile` | `components/forms/profile-form.tsx:65` |
| POST | `/api/auth/password` | `components/forms/password-form.tsx:62` |
| POST | `/api/orders` | `components/forms/purchase-form.tsx:71` |
| POST | `/api/orders/[id]/pay`、`/cancel` | `components/blocks/order-actions.tsx:45` |
| POST / GET | `/api/chat` | `components/blocks/service-chat.tsx:73,109` |
| GET | `/api/products`、`/api/products/[slug]` | **站内无调用方**（页面直接调数据函数） |
| GET | `/api/guide` | **站内无调用方**（同上） |
| GET | `/api/cases` | **站内无调用方**（同上） |
| GET | `/api/orders`、`/api/orders/[id]` | **站内无调用方**（`account/orders` 页在服务端直接读） |

> 说明：产品/指引/案例/订单的 GET 接口是保留的**公开只读出口**，便于外部调用与调试；站内页面为拿到服务端渲染与 SEO，都走数据函数直调。若不需要对外暴露，这一层可以精简。

---

## 11. 已知限制与后续计划

**存储**

- 当前 Upstash Redis 作唯一持久层。后续计划接 **Supabase（Postgres）**：需要关系查询、事务、外键约束时 Redis 的键值模型会开始别扭（例如「按状态 + 时间范围 + 分页查订单」）。
- `swi:usessions:{userId}` 无 TTL，会话自然过期后 id 会残留（改密码时会顺手清掉）。可给这个 Set 也加过期时间。

**安全**

- Cookie 缺 `secure` 标志，建议按环境补上。
- `scryptSync` 是同步实现，单次派生约 100ms 且会阻塞事件循环（登录接口 `application-code` 约 3s，其中包含冷启动种子的一次哈希）。它同时起到限流作用，所以当前**有意不改**；若要提速，改异步 `scrypt` + 把种子里的 `hashPassword` 换成预生成常量。

**客服会话**

- 登出后 localStorage 的会话 id 不变，Redis 记录的 `userId` **不会解除绑定**：登出再聊会被 `canReadChatSession` 拒读（前端回落成空列表），新消息仍写进那条旧记录。可选修法：登出时清掉 localStorage 的会话 key。

**接口面**

- 产品/指引/案例/订单的 GET 接口站内无调用方，属于保留出口（见 §10）。

**内容**

- 所有公司信息（名称、地址、电话、备案号）与产品数据均为演示 mock；`public/hall.mp4` 4.68MB 仍偏大，理想目标是压到 1MB 以内。

---

## 12. 环境变量

见 `.example.env`（无密钥，可进仓库）：

| 变量 | 用途 |
| --- | --- |
| `swi_KV_REST_API_URL` / `swi_KV_REST_API_TOKEN` | Upstash Redis（Vercel 集成会加项目前缀，本地也可以直接写 `KV_REST_API_URL` 等无前缀名，`lib/server/redis.ts` 两套都读） |
| `AI_PROVIDER_NAME` / `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | 客服模型（OpenAI 兼容协议，可指向任意厂商） |

`.env` 已在 `.gitignore` 中，不提交。