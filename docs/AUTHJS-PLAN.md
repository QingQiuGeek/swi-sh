# Auth.js（NextAuth v5）接入方案

> **本文是方案文档，不是已实现功能。** 每条改动都标注「为什么这么改 / 依赖什么 / 风险在哪」。
>
> **立场：所有用户（邮箱密码用户、OAuth 用户、演示账号）都以 Supabase `next_auth.users` 为唯一真源，
> 应用侧 `userId` 一律换成 Supabase 的 uuid；会话统一走 jwt、不落库。**
> 相关文档：`docs/SUPABASE-PLAN.md`（Supabase 接入、全部 DDL、Redis 去留）、`docs/PROJECT-NOTES.md`（工程实现）、
> `frontend-docs/prd.md §10.2 / §10.3`（会话与存储现状）、`frontend-docs/avoid.md`（不要做什么）。

---

## 0. 结论速览

| 主题 | 结论 |
| --- | --- |
| 演示账号（只有邮箱 + 密码）的适配 | **能**。这就是 `Credentials` provider 的标准用法，不需要改密码哈希算法（`lib/server/password.ts` 的 scrypt 原样复用） |
| 演示账号的存储 | **不留 Redis**。写进 SQL seed，落在 `next_auth.users` + `public.user_profiles`，与 OAuth 用户同表（§3.7） |
| 邮箱 + 密码的新用户 | **存 Supabase**：`next_auth.users`（身份）+ `public.user_profiles`（密码哈希）（§3.3、§3.6） |
| 用户登录数据 / 用户信息的 SQL 表 | **要**。adapter 自己的 4 张表在 `next_auth`，应用资料表 `public.user_profiles`（§4） |
| 会话策略 | `session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }`（30 天、活跃即续期；§3.1、§3.1.4） |
| `next_auth.sessions` 表 | **必须建，但 JWT 策略下不会被写**。为什么「必须存在」见 §3.1.3 |
| 登录入口 | **保留现有弹窗**（`components/auth/auth-dialog.tsx`），不新增 `/[locale]/signin` 独立页（§6.1） |
| `/api/auth/*` 冲突 | **方案 A**：`/api/auth/*` 整体交给 Auth.js，自研接口搬到 `/api/account/*`（§3.2） |
| 应用里的 `userId` | 一律是 **Supabase `next_auth.users.id`（uuid）**，`usr-demo` 这类文本 id 全部消失（§2.3） |
| 演示账号写进 Supabase 用户表 | **可以**。写进 SQL seed，落在 `next_auth.users` + `public.user_profiles`（§3.7） |

---

## 1. 现状盘点

### 1.1 现在的认证链路（全部自研，基于 Redis）

| 文件 | 职责 |
| --- | --- |
| `lib/server/auth.ts` | 会话核心：`SESSION_COOKIE = "swi_session"`、TTL **1 小时滑动续期**、`startSession` / `readSession` / `renewSession` / `endSession`、`registerUser`、`verifyUserPassword` |
| `lib/server/password.ts` | `hashPassword` / `verifyPassword`（scrypt，`salt:hash` 格式） |
| `lib/server/store.ts` | Redis 数据访问；`DEMO_ACCOUNT = { email: "demo@example.com", password: "Demo1234" }`、演示账号 id `usr-demo` + 2 条演示订单；邮箱唯一性用 `SETNX` 抢占（`claimEmail`） |
| `lib/server/account.ts` | 改资料 / 改密码（`updateUserProfile` / `updateUserPassword`），依赖 Redis 邮箱索引 |
| `lib/api-client.ts` | `apiSend`、`fetchCurrentUser` → `GET /api/auth/session`（失败时静默，不弹登录框） |
| `components/auth/auth-provider.tsx` | 登录态 Context；`initialUser` 由服务端布局注入，变更后靠 `router.refresh()` 同步 |
| `components/auth/{auth-dialog,login-form,register-form}.tsx` | 登录 / 注册弹窗与表单（**弹窗要保留**） |
| `app/api/auth/{login,register,logout,password,profile,session}/route.ts` | 6 个自研认证接口，统一返回 `ApiResponse<T>` |
| `middleware.ts` | 只做语言重定向；`matcher` 已排除 `api`，**因此 `/api/auth/*` 不会被语言中间件改写** |

### 1.2 必须保留的现有行为

1. **演示账号可用**：`demo@example.com` / `Demo1234`，登录后能看到 2 条演示订单。
2. **订单按 `userId` 归属**：`session.user.id` 就是订单的归属键。
3. **客服会话绑定 `userId`**：`lib/server/ai/chat-sessions.ts`。
4. **中英双语**：所有新界面文案走 `lib/i18n/dictionaries/{zh,en}.json`，不写死中文。
5. **账号页三件套**：`/[locale]/account`（概览）、`profile`（改资料）、`password`（改密码）。
6. **未登录访问受保护页**：`app/[locale]/account/layout.tsx` 用 `readSession()` 判定，未登录时由 `require-auth.tsx` 唤起弹窗。
7. **登录/注册走弹窗**，不做独立登录页。

---

## 2. 目标架构

### 2.1 四条登录路径

| 路径 | 入口 | 身份落在哪 | 首次即注册？ |
| --- | --- | --- | --- |
| GitHub OAuth | 弹窗里的 `signIn("github")` | `next_auth.users` + `next_auth.accounts` + `public.user_profiles` | 是（adapter 建 users/accounts，我们的回调补 profile 行） |
| Google OAuth | 弹窗里的 `signIn("google")` | 同上 | 是 |
| 邮箱 + 密码 · 已注册 | `signIn("credentials")` | 已在 Postgres（`next_auth.users` + `public.user_profiles`） | 否 |
| 邮箱 + 密码 · 新用户 | `POST /api/account/register` → `signIn("credentials")` | 同上一行（注册时写入 Postgres） | 是（由我们自己的注册接口完成） |

**四条路径的 `session.user.id` 都是 `next_auth.users.id`（uuid）**，这是本方案最重要的约束。

### 2.2 会话的唯一真源 = Auth.js JWT

```
浏览器 ──(authjs.session-token Cookie)──> auth()
                                            │
                                     session.user.id = next_auth.users.id (uuid)
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
   OAuth 用户                                                            凭据用户
  next_auth.users ← adapter 写                                    next_auth.users ← 注册接口写
  public.user_profiles ← jwt 回调补                                public.user_profiles ← 注册时同时写
        └───────────────────────────────────┬───────────────────────────────────┘
                                            │
                    public.orders / public.chat_sessions（user_id uuid 外键）
```

要点：

- 自研的 `swi_session` Cookie 与那套会话读写**整体退役**（不是并存）。改造上线后所有人被登出一次，重新登录即可。
- `next_auth.sessions` 表在 `strategy: "jwt"` 下**不会被写入**，但必须存在（§3.1.3）。
- 老用户的历史数据（Redis 里的 `usr-*` 用户、订单、聊天记录）**不做迁移**：既然推翻了旧方案，`swi:*` 键直接弃用即可（这是演示站，Redis 里没有需要保护的真实资产）。

### 2.3 用户 id 统一成 uuid 带来的连锁改动

| 位置 | 影响 |
| --- | --- |
| `public.orders.user_id` | `uuid not null references next_auth.users(id)`，替代原来的 `swi:uorders:<userId>` 列表 |
| `public.chat_sessions.user_id` | `uuid null references next_auth.users(id)`（匿名会话为 null） |
| `lib/server/ai/chat-sessions.ts` 的 `ChatSession.userId` | 类型由 `string` 改为 `string`（uuid 也是 string），语义变化但签名不变 |
| `lib/types` 的 `User` / `PublicUser` | `id: string` 不变；`passwordHash` 从 `User` 里消失（移到仅服务端可见的读取路径，见 §3.5） |
| `POLICY-LEADS-PLAN.md` 里的 `userId` | 必须以同一个 uuid 为准，不要再造第二套用户 id |
---

## 3. 关键决策逐条说明

> 这一节就是本轮你提的问题的正文答案，每条都附「源码依据」或「为什么」。

### 3.1 会话策略：为什么必须是 `jwt`，它和 `database` 到底差在哪

**先看两个策略的本质区别：**

| | `database` 策略 | `jwt` 策略 |
| --- | --- | --- |
| 会话实体存在哪 | `next_auth.sessions` 表里的一行 | 浏览器 Cookie `authjs.session-token` 里的一段签名 JWT |
| 每次请求怎么校验登录态 | 拿 Cookie 里的 `sessionToken` 去 `sessions` 表查一次 | 只验签名 + 解 payload，**不查库** |
| 登出 | 删 `sessions` 行 → 立刻全端失效 | 删 Cookie → 只在这台浏览器失效 |
| 改完资料 | 下次请求直接读到最新值 | JWT 里是**签发时的快照**，必须重新签发才更新 |
| 能否精确撤销某个会话 | 能 | 不能（除非自己再维护一张黑名单） |
| 每请求的数据库开销 | 1 次读 | 0 |
| 支持 `Credentials`（邮箱密码）登录 | **不支持** | 支持 |

**源码依据（我逐行打开确认过）：**

- `@auth/core/lib/init.js:74`：`strategy: config.adapter ? "database" : "jwt"`。
  → **只要传了 adapter 而不显式写 `strategy`，默认就是 `database`。** 我们传了 `SupabaseAdapter`，所以这一行**必须**显式写 `jwt`，否则会以 `database` 跑起来。
- `@auth/core/lib/actions/session.js:21`：`if (sessionStrategy === "jwt")` 分支只解 Cookie，**一次 adapter 都不调**；`:67-88` 才是 `database` 分支（调 `getSessionAndUser` / `deleteSession` / `updateSession`）。

**为什么本项目「必须」是 `jwt`：**

只有一个硬性原因，但它是致命的——**`Credentials` provider 在 `database` 策略下不可用。**

`@auth/core/lib/utils/assert.js:115-118`：当 `strategy === "database"` 且**所有** provider 都是 credentials 时，直接抛 `UnsupportedStrategy`。本项目还有 GitHub / Google，所以这条断言**不会**触发——问题被推迟到运行时：

用户用邮箱密码登录 → `signIn("credentials")` → `@auth/core/lib/actions/callback/index.js:227` 的 credentials 分支 → `:244 handleAuthorized` → `:267 jwt.encode`。**这条路径从设计上就不打算给 credentials 用户建 `sessions` 行**，它假定你走 JWT。结果：`database` 策略下凭据用户登录后拿不到会话，`auth()` 返回 `null`，表现为「登录成功但还是未登录」。

> 结论：**凭据用户也进 `next_auth.users`，会话统一走 jwt**。在 `database` 策略下凭据用户拿不到会话，这正是它只能走 jwt 的根本原因。

第二个原因（非硬性）：你要的 30 天会话在 jwt 下不产生任何数据库读，Serverless 冷启动更快；本项目是演示站，不需要「精确撤销单个会话」。

**你要设的 jwt 策略，配置原文：**

```ts
session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 } // 30 天，Auth.js 默认值
```

### 3.1.1 「jwt 策略下会话不会被写入，但必须存在」是什么意思

拆成三句：

1. **「不会被写入」= `next_auth.sessions` 表在 jwt 策略下永远不会有新行。** 会话不落库，它活在浏览器 Cookie 里。
2. **「必须存在」= 这张表仍然要建。** `@auth/supabase-adapter` 是一个「完整实现 `Adapter` 接口」的类，它的 `createSession` / `getSessionAndUser` / `updateSession` / `deleteSession` 方法都在，且都会对 `next_auth.sessions` 发 SQL。显式选了 jwt 之后这些方法不会被调用——但**表必须存在**，因为：① adapter 的类型契约与官方 DDL 里它就在；② 一旦哪天有人把 `strategy` 改回 `database`（或删掉这一行），代码会立刻开始查这张表，表不存在就是 500。所以它是「保险丝」，不是「运行时依赖」。
3. **「存在哪里」= 存在浏览器 Cookie `authjs.session-token` 里**（https 环境下前缀是 `__Secure-`，依据 `@auth/core/lib/utils/cookie.js:48-49`）。内容是 `{ sub: <uuid>, name, email, picture, iat, exp, jti }` 的签名 JWT，密钥是 `AUTH_SECRET`。服务端零存储。

### 3.1.2 「凭据用户」是什么意思

凭据 = **Credentials**，指「用我们自己发的邮箱 + 密码登录」的用户（对应 `signIn("credentials", { email, password })`），区别于 GitHub / Google 这种第三方 OAuth 用户。

**它不是「登录态」，是一个用户类别。** 对应的密码哈希存放在 `public.user_profiles.password_hash`（见 §3.5）。

### 3.1.3 那 `next_auth` 到底有没有 session 表？

**有。** `next_auth.sessions` 会建出来（DDL 见 `SUPABASE-PLAN.md §5.1`）。只是 jwt 策略下不写它、不读它。

---

### 3.1.4 30 天怎么续期：活跃即续期，不需要额外代码

jwt 策略下**每次读取会话都会重签 Cookie、并把 `exp` 顺延一个 `maxAge`**：

- `@auth/core/lib/actions/session.js` 的 jwt 分支在每次 `/api/auth/session` 请求里都重新计算到期时间（`:33` `fromDate(sessionMaxAge)`），再重新编码 JWT 并 push 带新 `expires` 的 Cookie（`:46-51`）。
- `session.updateAge` **只作用于 `database` 策略**（同文件 `:77` 起的分支），jwt 策略不读它。
- 客户端默认在窗口重新获得焦点时请求一次 `/api/auth/session`（`next-auth/react.js:305` `refetchOnWindowFocus = true`，`:309-313` 监听 `visibilitychange`），所以正常使用不会掉线。

**结论**：`maxAge: 30 * 24 * 60 * 60` 是「连续闲置 30 天」的上限，活跃用户会被自动续期，**不需要在 `jwt` 回调里写任何刷新逻辑**。

### 3.2 `/api/auth/*` 路由冲突 → 采用方案 A

NextAuth 默认 `basePath = "/api/auth"`（`node_modules/next-auth/lib/env.js`），所以 `app/api/auth/[...nextauth]/route.ts` 会**接管整个 `/api/auth/*` 前缀**。我们现有 6 个自研接口正好在这个前缀下，必须让路。

**方案 A（采用）**：Auth.js 独占 `/api/auth/*`，自研接口全部搬到 `/api/account/*`。

| 旧路径 | 新路径 | 处理 |
| --- | --- | --- |
| `POST /api/auth/login` | — | **删除**，改用 `signIn("credentials", ...)` |
| `POST /api/auth/logout` | — | **删除**，改用 `signOut()` |
| `GET /api/auth/session` | `GET /api/auth/session` | **改用 NextAuth 内置**（路径不变，但返回结构不同，见下） |
| `POST /api/auth/register` | `POST /api/account/register` | 改路径 |
| `POST /api/auth/password` | `POST /api/account/password` | 改路径 |
| `PATCH /api/auth/profile` | `PATCH /api/account/profile` | 改路径 |

**返回值差异（容易漏）**：自研的 `GET /api/auth/session` 返回 `PublicUser`（`{ id, username, email, createdAt }`）；NextAuth 内置返回 `{ user: { id, name, email, image }, expires }`。`lib/api-client.ts:85` 的解析逻辑要跟着改。

**受影响的调用点（共 6 处，全部要改）：**

| 文件 | 行 | 现状 |
| --- | --- | --- |
| `components/auth/auth-provider.tsx` | 88 | `fetch("/api/auth/logout", { method: "POST" })` → `signOut()` |
| `components/auth/login-form.tsx` | 45 | `apiSend("/api/auth/login")` → `signIn("credentials", ...)` |
| `components/auth/register-form.tsx` | 49 | `apiSend("/api/auth/register")` → `/api/account/register` |
| `components/forms/password-form.tsx` | 62 | `apiSend("/api/auth/password")` → `/api/account/password` |
| `components/forms/profile-form.tsx` | 65 | `apiSend("/api/auth/profile")` → `/api/account/profile` |
| `lib/api-client.ts` | 85 | 解析 `/api/auth/session` 的返回体 |

**方案 B（不采用）**：给 NextAuth 换 basePath（如 `basePath: "/api/authjs"`），自研接口原地不动。不采用的理由：登录/登出是 Auth.js 的核心语义，与业务接口混在一起会让「哪条是认证主干」变模糊；而且 `/api/auth/*` 是全体 Auth.js 使用者的默认认知，改掉后每个新加入的人都要重新学一遍。
---

### 3.3 凭据用户也进 `next_auth.users`

凭据用户（邮箱 + 密码）会写进 `next_auth.users`。在 `database` 策略下它拿不到会话（§3.1），换成 jwt 之后就能、也应该进这张身份表——它和 OAuth 用户共用同一个 `users` 表，这正是「用户 id 统一」的前提。

**新流程（注册）：**

```
POST /api/account/register
  ├─ 1. zod 校验（复用 lib/validation/auth.ts）
  ├─ 2. hashPassword(password)              ← lib/server/password.ts 原样复用，不换算法
  ├─ 3. insert into next_auth.users   (id, name, email)          ← id = crypto.randomUUID()
  ├─ 4. insert into public.user_profiles (id, username, password_hash)  ← 与第 3 步同一个 uuid
  └─ 5. 前端 await signIn("credentials", { email, password, redirect: false })
```

**为什么两处都要写、且 id 必须一致：**

- `next_auth.users` 是 Auth.js 的**身份表**：登录态、OAuth 账号绑定都以它为准，也是 `sessions` / `accounts` 外键的指向。
- `public.user_profiles` 是我们的**业务资料表**：放密码哈希和我们自己的字段（见 §3.5）。
- 两者用**同一个 uuid** 作主键关联（`user_profiles.id → next_auth.users.id` 外键）。

**邮箱唯一性**：由 `next_auth.users.email` 的 `unique` 约束保证（数据库层原子，比原来的 Redis `SETNX` 更可靠）。插入冲突 → 唯一键报错 → 接口返回「邮箱已注册」。

**随之删除的旧代码**：`lib/server/store.ts` 里的 `claimEmail` / `saveUserEmailIndex` / `releaseEmail` / `getEmailOwner` 这套 Redis 邮箱索引**整体废弃**。

> ⚠️ **大小写细节**：Postgres 的 `text unique` 是**大小写敏感**的，`Demo@example.com` 与 `demo@example.com` 会被当成两个邮箱。所以：注册接口必须先把邮箱 `trim().toLowerCase()` 再入库（保留 `normalizeEmail` 这个纯函数，它不再读写 Redis）；OAuth 侧 Auth.js 自己会转小写（`@auth/core/lib/actions/callback/oauth/callback.js:225` 的 `email: userFromProfile.email?.toLowerCase()`），两边口径一致。

---

### 3.4 OAuth 同邮箱冲突：必须显式处理

**为什么会发生**：凭据用户已经进 `next_auth.users`（§3.3），所以 OAuth 回来查同邮箱一定查得到，冲突真实存在。

**具体场景**：用户先用 `demo@example.com` 注册了邮箱密码账号 → 后来又点「用 GitHub 登录」，而他的 GitHub 主邮箱正好也是 `demo@example.com`。

**Auth.js 的实际行为**（源码 `@auth/core/lib/actions/callback/handle-login.js`）：

- OAuth 回调先 `:174 getUserByAccount(...)`；查不到 → 落到 `:231-252` 的检查：`getUserByEmail(profile.email)` 命中、且不是同一个 userId → `:250` 抛 `OAuthAccountNotLinked("Another account already exists with the same e-mail address")`。前端只看到「登录失败」。
- `:236` 有一个开关 `provider.allowDangerousEmailAccountLinking`，设 `true` 会跳过该检查，直接把 OAuth 账号绑到已存在的同邮箱用户上。

**三个可选方案：**

| 方案 | 做法 | 体验 | 风险 |
| --- | --- | --- | --- |
| ① 危险合并 | GitHub / Google provider 上加 `allowDangerousEmailAccountLinking: true` | 同邮箱自动绑到同一账号，最顺 | 若 OAuth 侧邮箱未验证（GitHub 无公开邮箱时会调 `/user/emails` 取 primary，**未必是 verified**），理论上存在「用别人邮箱注册的账号被他人 OAuth 登录接管」的风险 |
| ② 自定义 `signIn` 回调拦截 | 回调里检测同邮箱，`return false` 并给出明确提示：「请先用邮箱密码登录，再到账号页绑定第三方」 | 安全、提示清晰 | 要么把「绑定第三方」做成功能（**本期超范围**），要么用户被卡住 |
| ③ 不支持 | 保持默认抛错 | 最差 | 用户看到的是无解释的失败 |

**已定方案 ①**：本项目是**演示站**，用方案 ①（同邮箱自动并入同一账号），并注明这条风险的适用边界；将来若接真实用户，换成方案 ②。

---

### 3.5 `passwordHash` 放哪：`public.user_profiles`，不污染 adapter 表

`next_auth.users` 的列（`name` / `email` / `"emailVerified"` / `image`）由 adapter 的 SQL 写死。往里加 `password_hash` 会造成：① 语义混淆；② adapter 升级改动 insert 语句时我们要重新核对；③ 「它的表」和「我们的表」边界消失。

所以另建一张业务资料表：

```sql
create table if not exists public.user_profiles (
  id            uuid primary key references next_auth.users (id) on delete cascade,
  username      text not null,
  password_hash text,                                  -- OAuth 用户为 null；可用 /api/account/password 设置
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

- 凭据用户：注册时写 `password_hash`。
- OAuth 用户：`ensureProfile` 时只写 `username`，`password_hash` 留 null。
- 校验密码时 `select password_hash`；这一列**永远不出服务端**，`PublicUser` 里不带它。

---

### 3.6 `ensureProfile` 改成 Postgres 版

**OAuth 用户第一次登录时，在 `jwt` 回调里补一行 `public.user_profiles`。**

```ts
async jwt({ token, user, account }) {
  // 只有「刚完成登录」的那一次会同时拿到 user 和 account
  if (user && account?.type === "oauth") {
    await supabase.from("user_profiles").upsert(
      { id: user.id, username: user.name ?? user.email?.split("@")[0] ?? "user" },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }
  return token;
}
```

用 `ignoreDuplicates: true`（即 `on conflict do nothing`）：老用户第二次登录不该覆盖他改过的 `username`。

---

### 3.7 演示账号：写进 SQL seed，不再留在 Redis

演示账号 `demo@example.com` / `Demo1234` **不再留在 Redis**，随迁移文件进 Supabase：

| 步骤 | 内容 |
| --- | --- |
| 1 | `next_auth.users` 写入固定 uuid `00000000-0000-4000-8000-000000000001`、`name='DemoDriver'`、`email='demo@example.com'` |
| 2 | `public.user_profiles` 写入同一 uuid、`username='DemoDriver'`、`password_hash`（scrypt） |
| 3 | `public.orders` 写入原来那 2 条演示订单，`user_id` = 上面的 uuid |

固定 uuid 是为了让订单 seed 能直接引用它，也方便排查时一眼认出来。

**scrypt 哈希不能手写**（随机盐每次不同）。下面这个值是我用 `node:crypto` 的 `scryptSync('Demo1234', salt, 64)` 现算并回验过的，可以直接写进迁移文件：

```
5f2a9c1e7b3d4608a1c9e5f20b7d3846:6e1fd46b9ce9367d422c59fe8088c3ce91b7dcfa3a0e78fc602b3b052aec60a7ba0114fa4d4c2fcf4d8dfd7654aaee517195809764f5d4c348666235b80e5ec2
```

（格式与 `lib/server/password.ts` 一致：`salt:hash`，salt 为 32 个 hex 字符、hash 为 128 个 hex 字符。已用 `timingSafeEqual` 验证 `verifyPassword("Demo1234", 上面这串) === true`。）

---

### 3.8 历史数据：不做迁移

推翻旧方案就是推翻旧数据。`swi:user:*`、`swi:session:*`、`swi:uorders:*` 这些 Redis 键**直接弃用，不写迁移脚本**。理由：

- 这是演示站，Redis 里没有需要保护的真实资产。
- 旧会话与旧用户 id 是 `usr-*` / uuid 混杂的形态，迁过来要造映射表，收益为负。
- 改造上线后所有人被登出一次，重新登录即可。

**但要注意一个例外**：`POLICY-LEADS-PLAN.md` 里如果已经定义了以 `userId` 关联的业务表，必须以 `next_auth.users.id` 这套 uuid 为准，**不要再造第二套用户 id**。
---

## 4. 要建哪些表（Auth 侧视角）

**完整 DDL 在 `SUPABASE-PLAN.md §5`，这里只讲「有哪些表、各干什么」。**

| Schema | 表 | 谁写它 | jwt 策略下会被读到吗 |
| --- | --- | --- | --- |
| `next_auth` | `users` | adapter（OAuth 首次登录）、我们的注册接口（邮箱密码） | 是（`jwt` 回调需要、`getUserByAccount` 用） |
| `next_auth` | `accounts` | adapter（OAuth 绑定/续期） | 是（OAuth 回访时 `getUserByAccount`） |
| `next_auth` | `sessions` | **没人写** | **不读**（只是必须存在的保险丝，见 §3.1.1） |
| `next_auth` | `verification_tokens` | 本期不发魔法链接，**没人写** | 否（必须存在） |
| `public` | `user_profiles` | 我们的注册接口、`jwt` 回调的 `ensureProfile` | 是（读 `username` / `password_hash`） |
| `public` | `orders` | 下单/支付/取消接口 | 是 |
| `public` | `chat_sessions` / `chat_messages` | 客服聊天接口 | 是 |
| `public` | `products*` / `insurance_cases*` | 迁移 seed | 是（改造成读 DB 后） |

**schema 边界一句话**：`next_auth` 归 Auth.js adapter（列名由它硬编码，别动）；`public` 归我们自己。**绝不往 `next_auth.users` 加业务列**（§3.5）。

---

## 5. 环境变量

Auth.js 的变量名是**框架硬编码**的，不支持 `swi_` 前缀。最终需要的变量：

| 变量 | 用途 | 现有情况 |
| --- | --- | --- |
| `AUTH_SECRET` | 签发/校验 JWT 的密钥（jwt 策略必需） | **要新增**。用 `npx auth secret` 或 `openssl rand -base64 33` 生成 |
| `AUTH_URL` | 部署后的站点根地址，**不要带 pathname**（next-auth 固定 `basePath = "/api/auth"`；带别的 pathname 会被忽略并打 `env-url-basepath-redundant` 警告） | 本地可不设；Vercel 上设为正式域名 |
| `AUTH_TRUST_HOST` | 非 Vercel 环境（自建/预览）需要 `true`，否则回调报 `UntrustedHost` | Vercel 部署可省 |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App | **要新增**（`.env` / `.example.env` 已建好空键名） |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth Client | **要新增**（`.env` / `.example.env` 已建好空键名） |
| `swi_SUPABASE_URL` | Supabase 项目地址 | ✅ `.env` 已有 |
| `swi_SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥，**adapter 用**（绕过 RLS，见下条说明） | ✅ `.env` 已有 |

**几点必须注意：**

- **`next-auth@5` 的变量名没有 `NEXTAUTH_` 前缀**（v4 才叫 `NEXTAUTH_SECRET` / `NEXTAUTH_URL`）。写错名字不会报错，只会表现为「本地能登、线上登不上」或「重启后会话全部失效」，排查很费时。
- **绝不能加 `NEXT_PUBLIC_`**：`AUTH_SECRET` 一旦被浏览器拿到，任何人都能伪造会话。
- ⚠️ **变量名前缀：只对「框架自己按名字读」的变量才是问题**。Vercel 的 Supabase 集成按项目名把变量加上了 `swi_` 前缀（`swi_SUPABASE_URL` / `swi_SUPABASE_SECRET_KEY` / `swi_SUPABASE_SERVICE_ROLE_KEY` / `swi_SUPABASE_JWT_SECRET` / `swi_POSTGRES_*`）。要分成两类看：
  1. **Auth.js 自己读的变量**（`AUTH_SECRET` / `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` / `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_URL`）→ 名字是框架硬编码的（见下面两条），**没有 `swi_` 变体，只能新配**；
  2. **我们自己显式传进去的值**（Supabase 的 url / key）→ **带 `swi_` 前缀完全没问题**，因为读它的是我们自己写的代码，不是框架。§7 骨架里就是这么写的：`SupabaseAdapter({ url: process.env.swi_SUPABASE_URL, secret: process.env.swi_SUPABASE_SERVICE_ROLE_KEY })`。
  所以 `lib/server/env.ts` 的职责是「集中读取 `swi_SUPABASE_*` + 缺失即抛错」，**不要**在 Vercel 里再配一套不带前缀的重复变量（两套值必然漂移）。
- **adapter 到底用哪个密钥**：默认用 `swi_SUPABASE_SERVICE_ROLE_KEY`（legacy JWT，payload 里就是 `role: service_role`，PostgREST 直接认，也与 Auth.js 官方示例的 `SUPABASE_SERVICE_ROLE_KEY` 对应）。`.env` 里另有新版的 `swi_SUPABASE_SECRET_KEY`（`sb_secret_*`），理论上等价，但它的角色是 Supabase 网关解析出来的，**要在 P0 用一次真实请求确认**（能 `select` 到 `next_auth.users` 即算通过）。两者都**绝不能**给浏览器（不加 `NEXT_PUBLIC_`）。
- ⚠️ **`AUTH_SECRET` 必须先有，否则 `/api/auth/*` 每个请求都会失败**：`@auth/core/index.js:72` 在每次 `Auth()` 之前跑 `assertConfig()`，而 `@auth/core/lib/utils/assert.js:59-60` 在 `secret` 为空时返回 `MissingSecret`；`config.secret` 由 `setEnvDefaults()` 从 `AUTH_SECRET`（以及 `AUTH_SECRET_1/2/3`）注入（`@auth/core/lib/utils/env.js`）。所以「先有 `AUTH_SECRET`、再填 `AUTH_GITHUB_ID`」是前置条件，不是建议。
- **provider 变量名是从 provider id 推导出来的**：`AUTH_<ID>_ID` / `AUTH_<ID>_SECRET`（`@auth/core/lib/utils/env.js` 里 `id.toUpperCase().replace(/-/g, "_")`）→ `github` → `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`；`google` → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`。**代码里不要手动读这几个变量**，Auth.js 自己会读。
- **`trustHost` 在 Vercel 上自动成立**：回退链是 `AUTH_URL ?? AUTH_TRUST_HOST ?? VERCEL ?? CF_PAGES ?? NODE_ENV !== "production"`（同上文件）。Vercel 会注入 `VERCEL=1`，所以线上不必设 `AUTH_TRUST_HOST`（本地非 production 也成立）。
- ⚠️ **`swi_SUPABASE_SERVICE_ROLE_KEY` 与 `swi_SUPABASE_SECRET_KEY` 需要在 Supabase Dashboard 轮换一次**（详见 `SUPABASE-PLAN.md §0.2`）。

---

## 6. 文件级改动清单

### 6.1 新增

| 文件 | 职责 |
| --- | --- |
| `auth.ts`（项目根） | `NextAuth({...})` 唯一配置入口，导出 `handlers` / `auth` / `signIn` / `signOut` |
| `app/api/auth/[...nextauth]/route.ts` | 只需 `export const { GET, POST } = handlers` |
| `app/api/account/register/route.ts` | 邮箱密码注册（迁自 `/api/auth/register`） |
| `app/api/account/password/route.ts` | 改密码（迁自 `/api/auth/password`） |
| `app/api/account/profile/route.ts` | 改资料（迁自 `/api/auth/profile`） |
| `lib/server/env.ts` | 集中读取 + 校验 Auth.js / Supabase 环境变量 |
| `lib/server/supabase.ts` | `service_role` 客户端（仅服务端） |
| `types/next-auth.d.ts` | 给 `Session.user` / `JWT` 补 `id`、`username` 的类型声明 |
| `components/auth/oauth-buttons.tsx` | 弹窗里的「GitHub / Google」按钮 |
| `supabase/migrations/*.sql` | 见 `SUPABASE-PLAN.md §4.2` 文件清单 |

### 6.2 修改

| 文件 | 改什么 |
| --- | --- |
| `components/auth/auth-dialog.tsx` | 加 OAuth 按钮区、加「已有账号 / 注册」切换说明；**弹窗形态保留** |
| `components/auth/login-form.tsx:45` | `apiSend("/api/auth/login")` → `signIn("credentials", { redirect: false })` |
| `components/auth/register-form.tsx:49` | `/api/auth/register` → `/api/account/register`，成功后 `signIn("credentials")` |
| `components/auth/auth-provider.tsx:88` | `fetch("/api/auth/logout")` → `signOut()`；`refreshUser` 改从 NextAuth session 取 |
| `components/forms/password-form.tsx:62` | 路径改为 `/api/account/password` |
| `components/forms/profile-form.tsx:65` | 路径改为 `/api/account/profile` |
| `lib/api-client.ts:85` | 适配 NextAuth `/api/auth/session` 的返回结构 |
| `lib/server/auth.ts` | `readSession()` 内部改为调 `auth()`，**对外签名不变**（§8.1）；删掉自研 Cookie 会话那一套 |
| `lib/server/store.ts` | 删掉用户 / 会话 / 邮箱索引部分，只留订单→（迁到 SQL 后整文件退役，见 `SUPABASE-PLAN.md §6`） |
| `app/[locale]/layout.tsx` | `initialUser` 改为 `auth()` 的返回值转换 |
| `app/[locale]/account/layout.tsx` | 同上 |
| `lib/types/index.ts` | `User` 去掉 `passwordHash`；补 OAuth 相关可选字段 |

### 6.3 删除

| 文件 | 理由 |
| --- | --- |
| `app/api/auth/login/route.ts` | 被 `signIn("credentials")` 取代 |
| `app/api/auth/logout/route.ts` | 被 `signOut()` 取代 |
| `app/api/auth/session/route.ts` | 被 NextAuth 内置 `/api/auth/session` 取代 |
| `app/api/auth/register|password|profile/route.ts` | 搬到 `/api/account/*`（先迁后删，不要先删） |

### 6.4 明确「不新增」

- **不新增 `app/[locale]/signin/page.tsx`（独立登录页）。** 已确认登录入口保留弹窗；Auth.js 的默认 `signIn` 页面不会出现，因为我们始终从弹窗里以 `redirect: false` 主动调用 `signIn()`。
- **不新增 `app/[locale]/error/page.tsx`。** 同理，OAuth 出错以 Toast 呈现（`AuthError` 从 `signIn` 的 resolve 值里读）。
- 不加 `pg` / `postgres` 驱动（已确认走 PostgREST）。

---

## 7. `auth.ts` 实现骨架

> 下面是**示意骨架**，不是最终代码；目的是把「决策落在哪一行」固定下来，避免实现时走偏。

```ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";

import { getSupabaseAdmin } from "@/lib/server/supabase";
import { verifyPassword } from "@/lib/server/password";
import { credentialsSchema } from "@/lib/validation/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.swi_SUPABASE_URL!,
    secret: process.env.swi_SUPABASE_SERVICE_ROLE_KEY!,
  }),

  // ★ 必须显式写 jwt：传了 adapter 不写就默认 database，凭据用户会拿不到会话（§3.1）
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  providers: [
    GitHub({
      // 同邮箱自动绑定：演示站取体验，风险见 §3.4；如改方案 ②，删掉这一行并加 signIn 回调
      allowDangerousEmailAccountLinking: true,
    }),
    Google({ allowDangerousEmailAccountLinking: true }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const supabase = getSupabaseAdmin();

        // 1) 身份表取 id
        const { data: user } = await supabase
          .from("users")
          .select("id, name, email")
          .eq("email", email)
          .maybeSingle();      // ⚠️ schema 是 next_auth，见下方注释
        if (!user) return null;

        // 2) 业务表取密码哈希（永不出服务端）
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("password_hash")
          .eq("id", user.id)
          .maybeSingle();
        if (!profile?.password_hash) return null;

        if (!verifyPassword(parsed.data.password, profile.password_hash)) return null;

        // 返回的对象会进入 jwt 回调的 user 参数
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // 首次登录：把 uuid 与 username 写进 JWT
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username ?? user.name ?? null;
      }
      // OAuth 首次登录：补一行 public.user_profiles（§3.6）
      if (user && account?.type === "oauth") {
        await getSupabaseAdmin().from("user_profiles").upsert(
          { id: user.id, username: user.name ?? user.email?.split("@")[0] ?? "user" },
          { onConflict: "id", ignoreDuplicates: true },
        );
      }
      return token;
    },
    async session({ session, token }) {
      // 把 id / username 透出给客户端
      session.user.id = token.id as string;
      session.user.username = (token.username as string | null) ?? undefined;
      return session;
    },
  },
});
```

**骨架里两处必须留意的点：**

1. **`supabase.from("users")` 默认查 `public` schema。** 要查 `next_auth.users`，客户端必须带 schema 选项：
   ```ts
   const { data } = await getSupabaseAdmin().schema("next_auth").from("users")...
   ```
   这是实现时最容易踩的坑（表现为 `relation "public.users" does not exist`）。而 `user_profiles` 在 `public` 下，不用带。**两个客户端（一个带 schema、一个不带）或每次显式 `.schema()`，实现时二选一并写注释。**

2. **`Credentials` 的 `authorize` 返回对象里没有 `username`** 时，`token.username` 会 fallback 到 `user.name`；注册时把 `next_auth.users.name` 填成用户名即可，两者一致。

3. `AUTH_SECRET` 由 NextAuth 自动读取同名环境变量，**不需要**在配置里显式写 `secret:`。

---

## 8. 兼容性检查

### 8.1 `readSession()` 的签名保持不变（关键设计）

`lib/server/auth.ts` 的 `readSession()` 现在被服务端页面直接调用（`app/[locale]/layout.tsx`、`app/[locale]/account/layout.tsx`、`app/[locale]/account/page.tsx` 等）。改造时**只改它的内部实现**：

```ts
// 签名不变：() => Promise<Session | null>，Session.user 仍是 PublicUser 形状
export async function readSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { user: await toPublicUser(session.user.id) };  // 内部查 user_profiles
}
```

这样 account / orders 那些页面**一行都不用改**。同理 `renewSession()`（API 路由里用的那个）内部改成调 `auth()` 即可——30 天会话由 JWT 的 `exp` 管，续期靠每次读会话时重签 Cookie，不再有 Redis 写。

> **行为变化（要说清楚）**：1 小时滑动续期 → 30 天滑动续期。jwt 策略下每次读会话都会把 `exp` 顺延 30 天（依据见 §3.1.4），所以活跃用户不会掉线；只有连续闲置满 30 天才需要重登。

### 8.2 中英双语

- 所有新界面文案（OAuth 按钮、错误提示）走 `lib/i18n/dictionaries/{zh,en}.json`，**不写死中文**。
- 服务端返回的错误码沿用现有 `lib/i18n/errors.ts` / `FIELD_MESSAGE_CODES` 那套，不新增裸字符串。
- Auth.js 内置页面（错误页等）**不会出现**，因为我们不在页面上跳转到它，全走弹窗 + `redirect: false`。

### 8.3 与 `POLICY-LEADS-PLAN.md` 的边界

那份方案如果定义了「谁提交了报价/线索」，其 `userId` 必须指向 `next_auth.users.id`。**不要**再引 `usr-*` 或另建 `users` 表。

### 8.4 middleware

`middleware.ts` 的 `matcher` 已排除 `api`，所以 `/api/auth/*` 不会被语言重定向干扰，**不需要改**。
---

## 9. 分阶段实施与验收

每一步都有**可执行的验收动作**，做完一步再进下一步。

### P0 — Supabase 侧就绪（无代码）

| 步骤 | 验收 |
| --- | --- |
| 执行 `supabase/migrations/` 里的迁移（或推 GitHub 触发自动迁移） | Supabase Dashboard 里能看到 `next_auth` 四表 + `public` 各表 |
| **Dashboard → Project Settings → API → Exposed schemas 勾上 `next_auth`** | 不勾的话 PostgREST 报 `Invalid schema: next_auth`，OAuth 首次登录直接 500 |
| 轮换 `service_role` / `secret` 密钥，更新本地与 Vercel 的环境变量 | 新密钥生效且旧密钥失效 |
| 生成 `AUTH_SECRET`，配置 `AUTH_GITHUB_*` / `AUTH_GOOGLE_*` | 本地与 Vercel 都有；**确认没有 `NEXT_PUBLIC_` 前缀** |
| 手工插一行测试用户，验证 Supabase 客户端能读 `next_auth.users` | 一个 node/tsx 脚本能查到它 |

### P1 — Auth.js 接上，仅 GitHub 登录可用

| 步骤 | 验收 |
| --- | --- |
| 写 `auth.ts` + `app/api/auth/[...nextauth]/route.ts` | `GET /api/auth/session` 返回 `{ user: null }`（未登录）；`GET /api/auth/providers` 列出 github / google / credentials |
| 弹窗加 GitHub 按钮 | 点击 → GitHub 授权页 → 回调 → 弹窗关闭且显示用户名 |
| 查库 | `next_auth.users` 多一行、`next_auth.accounts` 多一行、`public.user_profiles` 多一行、`next_auth.sessions` **零行**（jwt 生效的实证） |
| 刷新页面 | 仍是登录态（JWT 来自 Cookie） |

**这一步就把「jwt 策略真的生效」验证掉了**：`next_auth.sessions` 为空就是最硬的证据。

### P2 — Google 登录

| 步骤 | 验收 |
| --- | --- |
| 加 Google provider | 弹窗里 Google 按钮可用，流程同上 |
| 用同一个 Google 账号登两次 | `next_auth.users` 不新增行、`accounts` 不新增行（`providerAccountId` 命中） |

### P3 — 邮箱密码：注册 + 登录

| 步骤 | 验收 |
| --- | --- |
| `/api/account/register` 上线 | 注册新邮箱 → `next_auth.users` + `public.user_profiles` 各一行，**id 相同** |
| 弹窗注册后自动登录 | 注册完立刻是登录态，不需要再输一次 |
| 重复邮箱注册 | 返回「邮箱已注册」，库里仍只有一行 |
| 大写邮箱 | `Demo@Example.com` 与 `demo@example.com` 视为同一邮箱（`normalizeEmail`） |
| **演示账号 `demo@example.com` / `Demo1234` 能登录** | 登录成功，能看到 2 条演示订单 |

### P4 — 账号页三件套打通

| 步骤 | 验收 |
| --- | --- |
| 改资料 `/api/account/profile` | 改用户名后**页面立刻显示新值**（jwt 快照问题，见 §10.2 的解法） |
| 改密码 `/api/account/password` | 旧密码可登录、新密码可登录、旧密码失效 |
| 改邮箱 | 唯一约束生效，占用他人邮箱被拒 |
| 未登录访问 `/account` | `require-auth.tsx` 唤起弹窗，不跳转独立登录页 |
| 登出 | `signOut()` 后 `/api/auth/session` 返回 `{ user: null }` |

### P5 — 数据迁 Postgres + 清理

| 步骤 | 验收 |
| --- | --- |
| 订单 / 客服会话迁 `public.orders` / `public.chat_*`（`SUPABASE-PLAN.md §9`） | 下单、支付、取消、查订单全链路正常；聊天记录持久化 |
| 商品 / 案例 / 指引改读 DB | 首页、产品页、指引页内容与 JSON 版一致 |
| 删除 Redis 用户 / 会话 / 邮箱索引代码 | `rg "swi:user|swi:session|swi:email|swi:usessions" lib/` 无结果 |
| 交付前整体回归 | 中英双语各走一遍四条登录路径 |

---

## 10. 风险与回滚

### 10.1 回滚

| 阶段 | 回滚手段 |
| --- | --- |
| P1–P2（只加 OAuth） | 摘掉按钮即回到原状态；`next_auth` 表留着不碍事 |
| P3 之后（凭据用户进 Postgres） | **不可平滑回滚**：用户数据已在 Postgres。回滚 = 重新启用旧 Redis 认证代码 + 用户重新注册。**这是「不兼容旧方案」的必然代价**，见 `SUPABASE-PLAN.md §10.1` |
| 迁移文件 | Supabase 迁移是单向的；每个迁移文件都要先想好 `drop` 语句，写在文件末尾注释里 |

### 10.2 已知风险清单

| 风险 | 触发条件 | 应对 |
| --- | --- | --- |
| **jwt 快照过期**（改完资料页面还是旧值） | `session.user` 来自 JWT，不在每次请求时刷新 | 改资料成功后调客户端 `useSession().update()` 重签 JWT；或改完直接 `router.refresh()` + 重取 `/api/auth/session`。**P4 验收项已覆盖** |
| **PostgREST schema 没暴露** | 忘了勾 Exposed schemas | P0 验收项；错误表现为 OAuth 首次登录 500 |
| **`strategy` 被漏写** | 复制配置时删掉了 `session` 段 | `next_auth.sessions` 出现行 = 立刻发现（P1 验收项） |
| **OAuth 同邮箱被拦** | 用户先注册密码账号再用同邮箱 OAuth | §3.4 方案 ①（`allowDangerousEmailAccountLinking: true`，演示站取舍） |
| **`AUTH_SECRET` 缺失/改名** | 变量名写成 `NEXTAUTH_SECRET` 或用 `NEXT_PUBLIC_` 前缀 | `lib/server/env.ts` 启动即校验并抛错；`NEXT_PUBLIC_` 前缀一经发现立即改回 |
| **`password_hash` 泄漏到客户端** | `toPublicUser` 顺手把整行返回 | `PublicUser` 类型里没有该字段；服务端查询显式 `select` 列名，不 `select("*")` |
| **会话到期** | 用户连续闲置满 30 天 | jwt 策略下每次读会话顺延 30 天（活跃用户不掉线，§3.1.4 / §8.1）；无需额外代码 |

### 10.3 安全注意事项

- `.env` 里的 Supabase 密钥（`service_role` / `secret`）**曾在工作区出现过真值**，虽然当前 diff 已干净，仍建议轮换一次（`SUPABASE-PLAN.md §0.2`）。
- `service_role` 客户端**只能**在服务端模块里创建，文件顶部加 `import "server-only"`（如项目已有该依赖）。
- RLS 保持「开 RLS + 不给 anon/authenticated 任何策略」，全量拒绝；服务端用 `service_role` 绕过。

---

## 11. 已确认的决策

> 与 `SUPABASE-PLAN.md §11` 结构一致：这一节只记录已确认的结论，不再保留问句。

| # | 问题 | 结论 |
| --- | --- | --- |
| 1 | GitHub / Google OAuth App 由谁申请？ | **用户本人在各自控制台创建**，回调填 `https://<域名>/api/auth/callback/{github,google}`（本地调试另加 `http://localhost:3000/...`）；`.env` 空键名已备好，填值即可 |
| 2 | OAuth 用户能不能设置密码？ | **能**。`password_hash` 为 null 时 `/api/account/password` 视为「设置密码」，设置后可用邮箱密码登录，账号自然合并 |
| 3 | OAuth 同邮箱冲突采用哪个方案？ | **方案 ①**（`allowDangerousEmailAccountLinking: true`，演示站取体验，§3.4）；将来接真实用户再换方案 ② |
| 4 | 演示账号的 scrypt 哈希怎么落库？ | **直接写死** §3.7 那串已回验的哈希，不加生成脚本 |
| 5 | `session.maxAge` 的续期方式？ | **30 天滑动续期（活跃即续期）**。这是 jwt 策略的默认行为，无需额外代码（§3.1.4 / §8.1） |

---

## 12. 落地后要同步更新的文档

| 文档 | 要改什么 |
| --- | --- |
| `frontend-docs/prd.md §10.2 / §10.3` | 把「Redis 会话 / 用户真源」改写为「Supabase Postgres + Auth.js jwt 会话」 |
| `frontend-docs/prd.md §9 技术栈` | 认证一节补 Auth.js + Supabase adapter；存储一节补 Postgres 角色 |
| `frontend-docs/ui-patterns.md` | 若弹窗内新增 OAuth 按钮区，补组件规范 |
| `frontend-docs/page-specs.md` | 账号页补「OAuth 用户可设置密码」的展示差异 |
| `frontend-docs/avoid.md` | 增加反模式：「在 `next_auth.users` 上加业务列」「把 `AUTH_SECRET` 加 `NEXT_PUBLIC_` 前缀」 |
| `docs/SUPABASE-PLAN.md` | §5.1 已被本文引用；任何 DDL 改动要两边同步 |
| `docs/PROJECT-NOTES.md §11` | 更新「后续迁 Supabase」的条目为「已落地」 |
| `.example.env` | ✅ 已补：`AUTH_SECRET` / `AUTH_GITHUB_*` / `AUTH_GOOGLE_*` / `AUTH_URL` / `AUTH_TRUST_HOST` 空键名（值留空） |

---

## 附：结论一句话总结

**凭据用户、OAuth 用户、演示账号，三者共用 `next_auth.users` 一张身份表；业务资料放 `public.user_profiles`；会话是 Cookie 里的签名 JWT（30 天、不落库）；`/api/auth/*` 交给 Auth.js，自研接口搬到 `/api/account/*`；登录入口仍是弹窗。**
