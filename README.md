# 汽车保险 · AutoShield Insurance

[中文](#中文) · [English](#english)

车险在线投保演示站：Next.js 全栈（前后端同仓）+ shadcn/ui，中英双语（`/zh`、`/en`）。
保险产品、投保指引、投保案例均为 mock 数据，账户 / 会话 / 订单存放于服务端进程内存。

> 演示项目，非真实保险业务：公司名、地址、电话、备案号均为占位内容，价格与保障条款为演示费率，不代表任何真实保单。

---

## 中文

### 项目简介

一个「看产品 → 走投保流程 → 管订单」的完整车险网站演示：

- 首页由 5 个纵向分区组成，Header 点击分区 Tab 平滑滚动定位，滚动时 Tab 高亮跟随；
- 保险产品、投保指引、关于我们各有独立页面，产品可进入详情与投保表单；
- 提供登录 / 注册、个人中心（概览 / 我的订单 / 修改资料 / 修改密码）；
- 首页右下角悬浮工具轨集成 **AI 在线客服**，可回答产品、投保流程与订单问题。

### 线上部署

- 部署平台：**Vercel**
- 语言入口：`/zh`（默认）、`/en`；访问 `/` 会按「语言 Cookie → `Accept-Language` → `zh`」重定向
- 不使用 hash 路由，全部走 App Router 真实路由

### 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | Next.js 16（App Router，Server Components + Route Handlers 全栈） |
| 运行时 / 语言 | Node.js、React 19、TypeScript 5（`strict`） |
| 样式 | Tailwind CSS v4（`@tailwindcss/postcss`）、`tw-animate-css` |
| UI 组件 | shadcn/ui（`radix-nova` 风格，基于 Radix UI）、lucide-react 图标 |
| 表单与校验 | react-hook-form + zod + `@hookform/resolvers`（前后端共用 zod schema） |
| 国际化 | 自建 i18n：`lib/i18n` + `middleware.ts`，URL 语言前缀 + `NEXT_LOCALE` Cookie，字典 `zh.json` / `en.json` |
| AI 客服 | AI SDK 7（`ToolLoopAgent` + zod 工具）、`@ai-sdk/react` 的 `useChat`、AI Elements 对话组件、`@ai-sdk/openai-compatible` 接 OpenAI 兼容模型、streamdown 渲染 Markdown |
| 其他 | sonner（toast）、next-themes（主题）、use-stick-to-bottom（对话吸底） |
| 代码检查 | ESLint 9 + `eslint-config-next` |
| 包管理器 | npm |

### 功能设计

**首页（`/[locale]`）**

- 首屏：`public/hall.mp4` 背景视频 + 暗色遮罩 + 文案压层。poster 先上保证 LCP，视频等窗口 `load` 后挂载并淡入、滑出视口暂停、`prefers-reduced-motion` 时不加载
- 五个分区：首页 / 保险产品 / 投保指引 / 投保案例 / 关于我们；左侧竖向滚动指示轨（桌面端）+ 移动端顶部抽屉共用同一份 `SECTION_IDS`
- 投保案例：横向**无缝自动轮播**（约 80px/s，从右向左），鼠标悬浮暂停，数据来自 `/api/cases`（10 条演示案例）
- 悬浮工具轨（仅首页、≥ 1280px）：在线客服（Popover 内嵌 AI 对话）/ 联系方式（HoverCard：电话、邮箱、微信二维码）/ 返回顶部

**保险产品**

- 产品卡：名称、一句话卖点、年保费、保额、标签、保障内容摘要；卡片右侧「查看详情」+ 深色「立即投保」两个按钮
- 详情页展示完整保障内容与适用车型，「立即投保」未登录时唤起登录注册弹窗，登录后进入投保表单

**投保指引**

- 固定四步：选择产品 → 填写投保信息 → 在线支付保费 → 保单生效
- 材料清单（含是否必需）与 5 条常见问题（手风琴）

**投保与订单**

- 投保表单：被保人信息、车辆信息、费用确认，提交后真实生成订单
- 个人中心左侧边栏 Tab：概览 / 我的订单 / 修改资料 / 修改密码（移动端降级为顶部横向 Tab）
- 订单：列表支持状态筛选；详情可「取消订单」与「模拟支付成功」（支付后订单转为已生效）

**账户**

- 登录 / 注册为全局弹窗，不改变 URL；字段含邮箱、密码、用户名，密码框右侧带「小眼睛」切换明文
- 会话：HttpOnly Cookie `swi_session`，有效期 1 小时并**滑动续期**；密码用 `node:crypto` 的 scrypt + 随机盐哈希存储，不落地明文

**AI 在线客服**

- 前端：AI Elements 的 `Conversation` / `Message` / `PromptInput`，仅支持文本输入（忽略文件 / 图片），回答语言跟随页面语言
- 后端：`/api/chat` 流式输出，按请求构造 `ToolLoopAgent`，两个 zod 工具：
  - `searchProducts`：查产品（关键词 / 类别 / 价格上限），**必须先查再答，禁止编造价格与保障**
  - `queryOrders`：按 `userId` 查本人真实订单；未登录或 `userId` 与会话不符时返回 `requiresLogin`，助手只提示「请先注册登录」
- 登录态一律由服务端读 Cookie 判定，前端传参无法绕过
- 会话：浏览器用 `localStorage` 保存会话 id，服务端用 `Map` 维护「会话 id → 消息列表」，**登录后发消息即把该会话绑定到 `userId`**，绑定后仅本人可读

**全局**

- Header 吸顶：品牌 + 5 个分区 Tab + 语言切换 + 登录注册 / 用户名与个人中心入口
- Footer 四栏：品牌简介 / 导航 / 联系方式（电话、邮箱可点击）/ 微信客服二维码
- 响应式：PC 与移动端两套布局（导航抽屉、个人中心 Tab 形态、案例卡片宽度均自适应）

### 页面与路由

| Route | 页面 | 需登录 |
| --- | --- | --- |
| `/` → `/[locale]` | 按语言偏好重定向 | 否 |
| `/[locale]` | 首页（五分区） | 否 |
| `/[locale]/products`、`/[locale]/products/[slug]` | 产品列表 / 详情 | 否 |
| `/[locale]/purchase/[slug]` | 投保表单 | 是 |
| `/[locale]/guide` | 投保指引 | 否 |
| `/[locale]/about` | 关于我们 | 否 |
| `/[locale]/account`、`/orders`、`/orders/[id]`、`/profile`、`/password` | 个人中心 | 是 |

### 接口一览

所有业务接口返回统一信封 `{ success, code, message, data }`，`code` 为字符串业务码（如 `OK`、`VALIDATION_ERROR`、`EMAIL_TAKEN`），HTTP 状态码同时正确设置。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/products`、`/api/products/[slug]` | 产品列表 / 详情（按 `locale` 取语言数据） |
| GET | `/api/guide` | 投保指引（步骤 / 材料 / FAQ） |
| GET | `/api/cases` | 投保案例列表 |
| POST | `/api/auth/register`、`/api/auth/login`、`/api/auth/logout` | 注册 / 登录 / 退出 |
| GET | `/api/auth/session` | 当前登录用户 |
| PATCH | `/api/auth/profile`、POST `/api/auth/password` | 修改资料 / 修改密码 |
| GET / POST | `/api/orders` | 我的订单 / 创建订单 |
| GET | `/api/orders/[id]` | 订单详情 |
| POST | `/api/orders/[id]/cancel`、`/api/orders/[id]/pay` | 取消订单 / 模拟支付成功 |
| POST | `/api/chat` | 客服对话，流式返回（响应体为 AI SDK 的 UI 消息流，**不套统一信封**） |
| GET | `/api/chat?sessionId=` | 取该会话聊天记录（走统一信封） |

### 目录结构

```
app/
├── [locale]/            # 语言段内的所有页面（首页、产品、指引、关于、账户…）
└── api/                 # Route Handlers：auth / products / guide / cases / orders / chat
components/
├── ui/                  # shadcn/ui 基础组件
├── ai-elements/         # AI Elements 对话组件（源码入库，可改）
├── layout/              # Header、Footer、语言切换、悬浮工具轨、移动端导航
├── sections/            # 首页分区（Hero、产品、指引、案例、关于）
├── blocks/              # 业务组件（产品卡、订单列表、案例轮播、客服面板…）
├── auth/ forms/         # 登录注册弹窗与各类表单
lib/
├── server/              # 服务端逻辑：auth、orders、products、cases、store（内存）、ai/
├── mock/                # mock 数据：products / guide / cases 各自 base + zh + en
├── i18n/                # 语言配置、字典、格式化、Provider
├── validation/          # 前后端共用的 zod schema
├── types/               # 共享类型（含统一响应体 ApiResponse）
└── hooks/               # 分区滚动、高亮跟随
docs/                    # 需求与设计文档（prd / visual / design / ui-patterns / page-specs / avoid）
```

### 快速开始

```bash
npm install
cp .example.env .env   # Windows: copy .example.env .env，并填入模型配置
npm run dev            # http://localhost:3000
```

其他脚本：`npm run build`、`npm run start`、`npm run lint`。

### 环境变量

只需配置 AI 客服（模型走 OpenAI 兼容接口）。模板见 `.example.env`，真实 `.env` 已被 `.gitignore` 忽略，不会提交：

| 变量 | 说明 |
| --- | --- |
| `AI_PROVIDER_NAME` | 提供方名称，仅用于标识与日志 |
| `AI_BASE_URL` | 接口地址，需带 `/v1` 这类版本前缀 |
| `AI_API_KEY` | 接口密钥 |
| `AI_MODEL` | 模型 id |

未配置时产品、订单、账户等业务功能不受影响，只有客服对话会返回「未配置」的错误提示。

### 演示账号

| 邮箱 | 密码 |
| --- | --- |
| `demo@example.com` | `Demo1234` |

### 数据与存储

- **产品 / 指引 / 案例**：JSON 文件，按「语言无关字段 + 语言相关字段」拆成 `base.json` / `zh.json` / `en.json`，加载时按 `slug`（或 `id`）合并并校验两侧键集合一致
- **账户 / 会话 / 订单 / 聊天记录**：服务端进程内存（`lib/server/store.ts`、`lib/server/ai/chat-sessions.ts`），自建 `Map`/数组结构，挂在 `globalThis` 上以扛住开发环境热更新
- **当前状态**：**尚未接入任何数据库**。后续计划接入 [Supabase](https://supabase.com/) 做持久化，替换内存存储（届时账户、订单与聊天记录可在多实例与 Serverless 环境下共享）

### 已知限制

- 内存存储只在单进程内有效：重启进程或热更新后回到种子状态，多实例 / Serverless 之间不共享。在 Vercel 上这意味着登录态与订单可能不稳定，需要在接入 Supabase 后才能真正可用
- 全部为 mock 数据，模拟支付不产生真实保单；PDF 保单、理赔、续保提醒、第三方登录等均未实现
- 客服对话记录上限：最多 200 个会话（超出淘汰最久未更新者），单会话保留最近 60 条消息

### 项目文档

`docs/` 下按职责拆分：`prd.md`（做什么）、`visual.md`（视觉方向）、`design.md`（具体设计规范）、`ui-patterns.md`（UI 分层与代码规范）、`page-specs.md`（逐页规格）、`avoid.md`（不要做什么）。

---

## English

### Overview

A full-stack car insurance demo site built with Next.js, shadcn/ui and bilingual routing (`/zh`, `/en`).
All product, guide and case data is mocked; accounts, sessions and orders live in the server process memory.

> Demo project, not a real insurance business: company name, address, phone and filing number are placeholders, and all prices and coverage terms are sample rates.

### Highlights

- Home page made of five scroll-linked sections; clicking a header tab smooth-scrolls and the active tab follows scrolling
- Dedicated pages for products, purchase guide and about; product detail leads into the purchase form
- Sign in / sign up, plus an account area (overview / my orders / profile / password)
- A floating tool rail with an **AI support assistant** that answers product, purchase-process and order questions

### Deployment

- Hosted on **Vercel**
- Locale entry points: `/zh` (default) and `/en`; visiting `/` redirects by language cookie → `Accept-Language` → `zh`
- No hash routing: everything uses real App Router routes

### Tech Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components + Route Handlers) |
| Runtime / Language | Node.js, React 19, TypeScript 5 (`strict`) |
| Styling | Tailwind CSS v4, `tw-animate-css` |
| UI kit | shadcn/ui (`radix-nova` style, Radix UI primitives), lucide-react |
| Forms & validation | react-hook-form + zod (shared schemas between client and server) |
| i18n | Custom: `lib/i18n` + `middleware.ts`, locale-prefixed URLs, `NEXT_LOCALE` cookie, `zh.json` / `en.json` dictionaries |
| AI assistant | AI SDK 7 (`ToolLoopAgent` + zod tools), `useChat` from `@ai-sdk/react`, AI Elements chat components, `@ai-sdk/openai-compatible` provider, streamdown for Markdown |
| Misc | sonner (toasts), next-themes, use-stick-to-bottom |
| Linting | ESLint 9 + `eslint-config-next` |
| Package manager | npm |

### Features

**Home**

- Hero: `public/hall.mp4` background video with a dark overlay and overlaid copy. The poster image ships first to protect LCP; the video mounts after window `load`, fades in, pauses when scrolled out of view, and is skipped under `prefers-reduced-motion`
- Five sections (home / products / guide / cases / about) with a desktop scroll rail and a mobile drawer driven by the same section ids
- Cases: a seamless auto-scrolling marquee (right to left, ~80px/s) that pauses on hover, fed by `/api/cases`
- Floating tool rail (home page, ≥ 1280px): AI support chat (inside a popover), contact details (hover card with phone, email and a WeChat QR code), and back-to-top

**Products**

- Product cards with name, tagline, yearly price, coverage amount, badges and coverage summary, plus "View details" and a dark "Buy now" button
- Detail pages list full coverage and eligible vehicles; "Buy now" opens the auth dialog when signed out

**Purchase guide**

- Four fixed steps: choose a plan → fill in details → pay online → policy takes effect
- Document checklist (required or optional) and five FAQs in an accordion

**Purchase & orders**

- Purchase form with insured person, vehicle and cost confirmation; submitting creates a real order record
- Account area with a left sidebar (overview / my orders / profile / password), collapsing to horizontal tabs on mobile
- Orders can be filtered by status, cancelled, and marked as paid through a simulated payment endpoint

**Accounts**

- Sign in / sign up live in a global dialog that never changes the URL; password fields have a show/hide toggle
- Sessions use an HttpOnly `swi_session` cookie, valid for one hour and sliding-renewed; passwords are stored as scrypt hashes with a random salt

**AI support assistant**

- UI built from AI Elements (`Conversation` / `Message` / `PromptInput`); text only, and answers follow the page language
- Backend streams from `/api/chat` through a per-request `ToolLoopAgent` with two zod tools:
  - `searchProducts` — looks up plans by keyword, category or price ceiling; the model must call it before quoting prices or coverage
  - `queryOrders` — returns the signed-in user's own orders; when signed out (or when the passed `userId` does not match the session) it returns `requiresLogin` and the assistant asks the user to sign in
- Auth state is always resolved server-side from the cookie, so it cannot be spoofed by the client
- Chat history: the browser keeps a session id in `localStorage`, the server keeps a `Map` from session id to messages, and the session is bound to `userId` once the user sends a message while signed in

**Global**

- Sticky header: brand, section tabs, language switcher, and sign-in / account entry
- Four-column footer with brand blurb, navigation, contact links and a WeChat QR code
- Responsive layouts for desktop and mobile across navigation, account tabs and case cards

### Routes

| Route | Page | Auth |
| --- | --- | --- |
| `/` → `/[locale]` | Language redirect | No |
| `/[locale]` | Home (five sections) | No |
| `/[locale]/products`, `/[locale]/products/[slug]` | Product list / detail | No |
| `/[locale]/purchase/[slug]` | Purchase form | Yes |
| `/[locale]/guide` | Purchase guide | No |
| `/[locale]/about` | About | No |
| `/[locale]/account`, `/orders`, `/orders/[id]`, `/profile`, `/password` | Account area | Yes |

### API

Business endpoints share one envelope, `{ success, code, message, data }`, where `code` is a string code such as `OK`, `VALIDATION_ERROR` or `EMAIL_TAKEN`, with correct HTTP status codes alongside.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/products`, `/api/products/[slug]` | Product list / detail (locale aware) |
| GET | `/api/guide` | Purchase guide (steps, documents, FAQs) |
| GET | `/api/cases` | Case list |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Register / sign in / sign out |
| GET | `/api/auth/session` | Current user |
| PATCH | `/api/auth/profile`, POST `/api/auth/password` | Update profile / change password |
| GET, POST | `/api/orders` | List / create orders |
| GET | `/api/orders/[id]` | Order detail |
| POST | `/api/orders/[id]/cancel`, `/api/orders/[id]/pay` | Cancel / simulated payment |
| POST | `/api/chat` | Support chat, streamed (AI SDK UI message stream, no envelope) |
| GET | `/api/chat?sessionId=` | Chat history for a session (uses the envelope) |

### Getting Started

```bash
npm install
cp .example.env .env   # then fill in the model credentials
npm run dev            # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

### Environment Variables

Only the AI assistant needs configuration (any OpenAI-compatible endpoint). See `.example.env`; the real `.env` is gitignored.

| Variable | Purpose |
| --- | --- |
| `AI_PROVIDER_NAME` | Provider label, used for logging only |
| `AI_BASE_URL` | Base URL including a version prefix such as `/v1` |
| `AI_API_KEY` | API key |
| `AI_MODEL` | Model id |

Without these, products, orders and accounts still work — only the support chat reports that it is not configured.

### Demo Account

| Email | Password |
| --- | --- |
| `demo@example.com` | `Demo1234` |

### Data & Storage

- **Products / guide / cases**: JSON files split into locale-agnostic (`base.json`) and locale-specific (`zh.json`, `en.json`) parts, merged by `slug` (or `id`) at load time with key-set validation
- **Accounts / sessions / orders / chat history**: in-process memory (`lib/server/store.ts`, `lib/server/ai/chat-sessions.ts`) using plain `Map`/array structures pinned to `globalThis` to survive dev hot reloads
- **Current status**: **no database yet**. The plan is to move persistence to [Supabase](https://supabase.com/) so accounts, orders and chat history survive restarts and work across instances

### Known Limitations

- In-memory storage is single-process only: restarting the server resets it to seed data, and separate instances do not share state. On Vercel this makes sign-in and orders unreliable until Supabase lands
- Everything is mocked; the simulated payment creates no real policy. PDF policies, claims, renewal reminders and social sign-in are out of scope
- Chat history keeps at most 200 sessions (least recently updated evicted) and the last 60 messages per session

### Documentation

The `docs/` folder holds the project specs: `prd.md` (what to build), `visual.md` (visual direction), `design.md` (design tokens and rules), `ui-patterns.md` (UI layers and code conventions), `page-specs.md` (per-page specs) and `avoid.md` (anti-patterns).