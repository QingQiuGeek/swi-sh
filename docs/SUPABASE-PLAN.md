# Supabase 接入方案（`next_auth` 建表 + 全量数据落库）

> **本文是方案文档，不是已实现功能。** 每条改动都标注了「为什么这么改 / 依赖什么 / 风险在哪」。
> 配套文档：`docs/AUTHJS-PLAN.md`（Auth.js 接入；其 §4 引用本文 §5.1、§5.2，其 §9-P0 依赖本文 §5.1）、
> `frontend-docs/prd.md §10.2 / §10.3`（存储现状）、`docs/PROJECT-NOTES.md §11`、`frontend-docs/avoid.md`（不要做什么）。
>
> **立场：推翻纯 Redis 存储，不做新旧兼容**——该进 Postgres 的进 Postgres，该留 Redis 的留 Redis（逐条判定见 §6.2）。

---

## 0. 结论速览

### 0.1 接入 Auth.js 需要的 SQL 表

**要，而且不止 Auth 自己那 4 张表。** 本方案同时把「原应用的用户数据、订单、客服会话」也搬进了 Postgres：

| 数据 | 谁写 | 表 | 说明 |
| --- | --- | --- | --- |
| OAuth 用户身份 | Auth.js adapter | `next_auth.users` | adapter 硬编码 schema 名，改不了 |
| OAuth 授权凭证 | Auth.js adapter | `next_auth.accounts` | 每次授权/续期 upsert |
| 会话 | **没人写**（jwt 策略） | `next_auth.sessions` | 必须存在，理由见 `AUTHJS-PLAN.md §3.1.1` |
| 邮箱验证令牌 | **没人写**（本期不发魔法链接） | `next_auth.verification_tokens` | 必须存在（同上） |
| **应用用户资料（含密码哈希）** | 我们 | `public.user_profiles` | 邮箱密码用户也进这里 |
| **订单** | 我们 | `public.orders` | |
| **客服会话** | 我们 | `public.chat_sessions` / `public.chat_messages` | 按条建表，理由见 §5.6 |
| 商品 / 案例 | 迁移 seed | `public.products*` / `public.insurance_cases*` | 运行时**真的读**，页面不再依赖构建期 JSON |

**结论：身份 4 张表（`next_auth.*`）+ 业务 8 张表（`user_profiles`、`orders`、`chat_sessions`/`chat_messages`、`products`/`product_translations`、`insurance_cases`/`insurance_case_translations`），共 12 张。** 完整 DDL 在 §5，文件清单在 §4.2。

### 0.2 ⚠️ 安全：密钥轮换

`.example.env` 里曾写进真实 `service_role` 密钥。

**当前状态**：`.example.env` 里那两行**已是空值**（只剩键名），当时的风险点已修掉。

**但仍建议做一次轮换**：

| 事实 | 后果 |
| --- | --- |
| 该密钥已被粘贴到多个地方（编辑器历史、剪贴板、可能的截图与对话） | 泄漏面已经产生，「文件改干净」≠「密钥安全」 |
| `.example.env` 是**已被 git 跟踪**的文件，`.gitignore` 的 `.env*` 规则对它无效 | 将来任何人往里填真实值都会被提交 |
| 那份 JWT 的 payload 是 `"role": "service_role"` | 等于数据库超级凭证，**绕过所有 RLS** |

**处理清单：**

1. Supabase Dashboard → Project Settings → API Keys → 轮换 `service_role`（及新版 `sb_secret_*`）；
2. 更新 `.env` 与 Vercel 环境变量；
3. `git log --all -S "service_role" -- .example.env` 确认历史里没有真值；
4. 在 `.example.env` 给这些键补注释：「服务端专用，**禁止** `NEXT_PUBLIC_` 前缀」。

---

## 1. 现状盘点

### 1.1 已有资产与代码现状

| 事实 | 证据 |
| --- | --- |
| 依赖已装 | `package.json`：`@auth/supabase-adapter@^1.11.3`、`@supabase/supabase-js@^2.117.2`、`next-auth@^5.0.0-beta.32` |
| 代码零引用 | `rg -i "supabase"` 在 `lib/` `app/` `components/` 无命中（只有 package.json / .env / 文档） |
| Vercel 集成已写入变量 | `.env` 有 `swi_SUPABASE_URL`、`swi_SUPABASE_ANON_KEY`、`swi_SUPABASE_SECRET_KEY`、`swi_SUPABASE_SERVICE_ROLE_KEY`、`swi_SUPABASE_JWT_SECRET`、`swi_POSTGRES_*` |
| 变量带 `swi_` 前缀 | 与 Upstash 那组一致；`lib/server/redis.ts` 的私有 `readEnv(names[])` 支持「多名字 + 去引号」，新模块可复用同一套读法 |
| **没有** `supabase/` 目录 | 迁移文件要新建 |
| **没有** `pg` 驱动 | 已确认不引入，走 PostgREST（§7.4） |
| 当前唯一持久层 | Upstash Redis：`lib/server/redis.ts`（键定义 `redisKeys`）+ `lib/server/store.ts`（账户/会话/订单）+ `lib/server/ai/chat-sessions.ts`（客服会话） |
| 目录数据 | 构建期 `import` 的 JSON：`lib/server/{products,cases}.ts` ← `lib/mock/{products,cases}/{base,zh,en}.json` |

### 1.2 Redis 键清单（迁移的起点）

全部来自 `lib/server/redis.ts:64-75` 的 `redisKeys`，前缀 `swi:`：

| 键 | 存什么 | 写入方 |
| --- | --- | --- |
| `swi:user:<userId>` | 用户 JSON（含 `passwordHash`） | `store.ts` |
| `swi:email:<email小写>` | `userId` 字符串（邮箱唯一索引） | `store.ts` |
| `swi:session:<sessionId>` | `{ id, userId, expiresAt }`，TTL 1 小时滑动 | `store.ts` |
| `swi:usessions:<userId>` | 会话 id 的 Set（「登出其它设备」用） | `store.ts` |
| `swi:order:<orderId>` | 订单 JSON | `store.ts` |
| `swi:uorders:<userId>` | 订单 id 的 List（`LPUSH`，倒序） | `store.ts` |
| `swi:dedup:<userId>:<车牌大写>:<productId>` | 去重标记 | `store.ts` |
| `swi:chat:<sessionId>` | 聊天会话 JSON（TTL 7 天） | `chat-sessions.ts` |

### 1.3 「推 GitHub 触发 Supabase 自动迁移」的前置条件

Supabase 的 GitHub 集成在**推送时把 `supabase/migrations/` 里尚未应用的文件按序执行**，并把版本号记进 `supabase_migrations.schema_migrations`。要让它真的生效，必须同时满足：

| # | 条件 | 怎么核对 |
| --- | --- | --- |
| 1 | Supabase 项目已连接本仓库（Dashboard → Integrations → GitHub） | Dashboard 里能看到分支映射与最近一次部署记录 |
| 2 | 迁移目录是 `supabase/migrations/`（相对集成配置的 working directory） | 本仓库是单包、应用在根目录，所以根目录下 `supabase/migrations/` 正确 |
| 3 | 文件名形如 `<14 位时间戳>_<名字>.sql` | 见 §4.1 |
| 4 | 推送的目标分支是集成里配置的 production branch | 若集成只监听 `main`，推 feature 分支不会触发 |
| 5 | 版本号是**尚未应用过的新版本号** | 已应用的版本号不会重跑，**改内容也不会重新生效**（§4.3 最重要的坑） |

**这些条件目前都未验证**（仓库里还没有 `supabase/` 目录，说明集成可能也没开）。所以 §9 的 S1 阶段第一件事是「用一个空迁移验证链路真的通」，而不是假定它通。

---

## 2. 目标架构

### 2.1 现状 → 目标的变更对照

| 主题 | 现状（当前代码） | 目标（本方案） |
| --- | --- | --- |
| 用户与会话真源 | 自研 Cookie `swi_session` + Redis `swi:session:*`（1 小时滑动） | Auth.js JWT Cookie（30 天滑动，见 `AUTHJS-PLAN.md §3.1`） |
| 用户身份 | Redis `swi:user:*`（`usr-*` 自造 id） | `next_auth.users`（uuid）+ `public.user_profiles`（§5.1 / §5.2） |
| 邮箱唯一性 | Redis `swi:email:*` 的 SETNX 抢占 | `next_auth.users.email` 的 `unique` 约束 |
| 演示账号 | Redis SETNX 种子（`usr-demo`） | SQL seed，固定 uuid（§5.7） |
| 订单 | Redis `swi:order:*` / `swi:uorders:*` / `swi:dedup:*` | `public.orders` + 部分唯一索引（§5.5） |
| 客服会话 | Redis `swi:chat:*`（整段 JSON，TTL 7 天） | `public.chat_sessions` + `chat_messages`（§5.6） |
| 商品 / 案例 | 构建期 `import` mock JSON | `public.products*` / `public.insurance_cases*`，运行时读 DB（§5.3 / §5.4） |
| 投保指引 | 构建期 `import` mock JSON | **不进数据库**：保持前端静态内容（已确认决策） |
| 界面字典（i18n） | 随前端代码的文件 | **不进数据库**：随代码走（§3.3） |
| Redis | 唯一持久层 | 8 类键全部「迁」或「删」，可整体下线（§6.2） |
### 2.2 数据落位图

```
Supabase (Postgres)                      ← 唯一真源
├── next_auth                            ← Auth.js adapter 专用（service_role，仅服务端）
│   └── users / accounts / sessions / verification_tokens
└── public
    ├── user_profiles                    ← 应用用户资料 + scrypt 密码哈希
    ├── orders                           ← 订单（user_id → next_auth.users.id）
    ├── chat_sessions + chat_messages    ← 客服会话
    ├── products + product_translations  ← 运行时真的读
    └── insurance_cases + insurance_case_translations

Upstash Redis（迁完之后只剩「短命数据」）
└── 见 §6.2 的逐键判定表

本地 JSON（改造成 DB 读取后退役）
└── lib/mock/{products,cases}/*.json
```

### 2.3 访问路径：只走 PostgREST

| | 路径 A：PostgREST（`@supabase/supabase-js`，已装） | 路径 B：直连 Postgres（`pg`，未装） |
| --- | --- | --- |
| 依赖 | 已有 | 已确认不装 |
| 凭据 | `swi_SUPABASE_URL` + `swi_SUPABASE_SERVICE_ROLE_KEY` | `swi_POSTGRES_URL`（pooler）或 `swi_POSTGRES_URL_NON_POOLING` |
| 能力 | 单表 / 嵌套查询、RLS 生效；不适合复杂 join、事务 | 完整 SQL、事务、`jsonb` 聚合 |
| 本项目用途 | **全部读写**（adapter + 我们的服务端模块） | 不用 |
| 何时需要 B | —— | 若将来出现「一次请求内多表原子写」或复杂报表查询 |

**三点说明**：

1. **要新增 `lib/server/supabase.ts`**：一个 `service_role` 客户端，只在服务端模块 import。
2. **`next_auth` 与 `public` 是两个 schema，同一个客户端要显式切**：查 `next_auth.users` 必须 `.schema("next_auth")`，否则默认查 `public`，报 `relation "public.users" does not exist`。**这是实现期最容易踩的坑。**
3. **`pg` 仍然不引入**：本期所有查询都是单表 CRUD + 简单筛选，PostgREST 够用；`orders` 的去重既有「先查重再插入」也有唯一索引兜底并发，不需要事务。

---

## 3. 关键决策逐条说明

### 3.1 主键统一用 uuid（不用自增）

**现状事实：**

| 表 | 主键 | 类型 |
| --- | --- | --- |
| `next_auth.users` | `id` | `uuid default gen_random_uuid()`，**没有自增** |
| `next_auth.accounts` | `id` | `uuid default gen_random_uuid()` |
| `next_auth.sessions` | `id` | `uuid default gen_random_uuid()` |
| `next_auth.verification_tokens` | `id` | **`bigint generated by default as identity`** ← 全套里唯一带自增的表 |
| `public.products` / `insurance_cases` | `id` | `text`（`prd-*` / `case-*` 这种稳定业务 id） |
| `public.orders` / `chat_*` / `user_profiles` | `id` | `uuid default gen_random_uuid()` |

**为什么业务表用 uuid 而不是自增：**

| | `uuid` | `bigserial` |
| --- | --- | --- |
| 对外暴露 | 订单号直接给 uuid，不含业务量信息 | 自增 id 会泄漏「平台一共有多少单」 |
| 生成时机 | 可在应用侧先 `crypto.randomUUID()` 再落库 | 必须等数据库返回 |
| 与 `next_auth.users.id` 关联 | 同类型，直接建外键 | 类型不同，要额外映射列 |

**结论**：业务表统一 `uuid default gen_random_uuid()`。
**如果**你将来要求「人类可读的订单号」，正确做法是**再加一列** `order_no text unique`（业务编号），而不是把主键换成自增——换主键会同时破坏所有跨表引用。

**`verification_tokens` 为什么是自增**：那是官方 DDL 的原样。它只做「一次性令牌」用途、不对外暴露，所以自增没坏处。**不要**为了「统一」去改它，改了就和官方 schema 漂移了。

### 3.2 表结构必须镜像现有的「base + locale」拆分

`frontend-docs/prd.md §10.3` 已经定了：语言无关字段（价格、保额……）只在 `base.json` 定义一处，语言相关字段放 `zh.json` / `en.json`，按 `slug` 合并。数据库要**镜像这个拆分**，而不是把两份语言文件塞进一个大宽表：

| | 两张表（推荐） | 一张大宽表 |
| --- | --- | --- |
| 改中文文案 | `update product_translations set name = ... where product_id = ... and locale = 'zh'` | 需要区分 `name_zh` / `name_en` 列 |
| 加第三种语言 | insert 一行，`check` 只加一个枚举值 | 每个文案字段都要加列（`name_ja`、`tagline_ja`……） |
| 漏翻译检测 | `(product_id, locale)` 主键，可查「哪些商品缺 en 文案」 | 只能靠应用层校验 |

**结论**：拆两张表 + `(id, locale)` 复合主键；`locale` 用 `check (locale in ('zh','en'))` 兜住枚举，与 `lib/i18n` 的语言集合对齐。`coverages` 这种「不定长、整体展示、无需单独查询」的数组用 `jsonb` 存，避免为它再拆一张 detail 表。

### 3.3 翻译 JSON（zh/en）：界面字典不入库，业务文案入库

**必须区分两类「翻译 JSON」，它们的答案相反：**

| | 文件 | 内容 | 存 DB？ |
| --- | --- | --- | --- |
| ① 界面字典 | `lib/i18n/dictionaries/{zh,en}.json`（15.6KB / 16.4KB） | 「登录」「提交」「订单状态」这类**界面文案** | **不存**。它是**代码资源**：与组件同生命周期、要随代码版本一起回滚、改它要跑构建。放 DB 只会带来「构建期查库」的复杂度 |
| ② 业务内容文案 | `lib/mock/{products,cases}/{zh,en}.json` | 商品名 / 卖点 / 案例故事 / FAQ 答案这类**业务内容** | **存**。这正是运营要改的东西，也是「后台改文案」需求的前提 |

**入库对翻译流程的影响（要说清楚）：**

| | 入库前（现在） | 入库后 |
| --- | --- | --- |
| 改一个商品名 | 改 `lib/mock/products/zh.json` → 提 PR → 部署 | 改 DB（SQL / Dashboard / 将来的后台页）→ **立即生效，无需部署** |
| 漏翻译怎么发现 | 构建期 `assertSlugsAligned()` 直接抛错，**构建失败** | 构建期不再检查（不读 JSON 了），改为 **DB 侧健康检查**（见下） |
| 版本回滚 | 跟着代码一起回滚 | **不跟代码回滚**（数据独立）。改错了要用 SQL 改回来 |
| 新增语言 | 加 `ja.json` + 改 `locales` 常量 | insert `locale='ja'` 的行 + 改 `check` 约束 + 改 `locales` 常量 |

**补偿措施**（把原来靠构建期断言换来的保障，用 DB 侧手段补回来）：

1. **保留 `lib/server/products.ts` / `cases.ts` 的函数签名**（`getProducts(locale)` 等），只改内部实现 → 上层页面零改动。
2. **加运行时回退**：`locale='en'` 缺行时回退到 `zh` 并打服务端 warning，**不要让页面 500**。
3. **加一条健康检查查询**（可挂进 §9 验收）：
   ```sql
   select p.id from public.products p
   where not exists (
     select 1 from public.product_translations t
     where t.product_id = p.id and t.locale = 'en'
   );
   ```
   应当返回空集。

**如果你更在意「构建期就发现漏翻译」，那就不要入库**，保留 JSON —— 但那样「后台改文案」这个需求就实现不了。取舍已确认：**业务文案入库、界面字典不入库**。

### 3.4 schema 边界：`next_auth` 独立 schema，业务表进 `public`

- `next_auth.*`：**只服务 adapter**，只授权 `service_role`，开 RLS 但**不建任何策略**（= 对 anon / authenticated 全拒绝），并加进 Exposed schemas（PostgREST 必须显式暴露才服务该 schema）。
- `public.*`：开 RLS 且**只给需要的策略**。这条不是多余的：Supabase 默认会把 `public` 里新建表的**全部权限**授予 `anon` / `authenticated`，不写策略的话拿 anon key 就能 `insert` / `delete`。
  - 目录表（`products` / `insurance_cases`）：`for select using (true)` —— 本来就是公开内容。
  - `user_profiles` / `orders` / `chat_*`：**不给 anon / authenticated 任何策略**，只有服务端 `service_role` 能碰。
- 为什么业务表不放 `next_auth`：`next_auth` 的语义是「第三方 adapter 的落地表」，将来换 adapter 或重跑官方 SQL 时可能被整体重建；业务数据不能住在别人家。

### 3.5 用「脚本从 JSON 生成 seed」而不是手工抄写

`lib/mock/products/{zh,en}.json` 合计约 11 KB、`cases` 约 5 KB。手工把 6 个商品 × 2 语言 × 4~6 条 coverage 抄进 SQL，出错概率高、且下次改 JSON 时无从对齐。

**做法（实现阶段）**：写一个一次性脚本（`node` / `tsx`，不提交也行）读 `lib/mock/*` 的 JSON，按 §5 的列映射生成 `insert ... on conflict do nothing` 语句，人工 review 后贴进迁移文件。本文 §5.3 / §5.4 给出**完整的表结构与全量 base 数据 + 一条完整的双语文案样例**，其余行按同一模式生成。

> ⚠️ **提醒**：切到 DB 读取之后，`lib/mock/*.json` 就不再是运行时真源。要么删掉它们（推荐，避免「两份数据谁是准的」），要么保留但明确标注「已废弃，仅作 seed 来源」。**不要**留着又改又不同步。

---

## 4. 迁移文件规划（`supabase/migrations/`）

### 4.1 命名与幂等约定

| 约定 | 内容 |
| --- | --- |
| 命名 | `<14 位时间戳>_<snake_case 描述>.sql`，如 `20260927090000_next_auth_schema.sql`。时间戳决定执行顺序，**必须严格递增** |
| 幂等 | 全部用 `create schema if not exists` / `create table if not exists` / `create index if not exists` / `drop policy if exists` + `create policy` / `insert ... on conflict ... do nothing`。这样即使手工在 SQL Editor 里跑过一遍，GitHub 集成再跑也不会报错 |
| 顺序依赖 | 见 §4.2，外键方向决定先后 |
| 一条迁移一件事 | 不把「建表」和「改数据」混在同一个文件 |
| 不在迁移里做 DROP | 除 `drop policy if exists`（为了重建策略）外，迁移只做加法，避免误删生产数据 |

### 4.2 文件清单（7 个）

| # | 文件 | 内容 | 依赖 |
| --- | --- | --- | --- |
| 1 | `20260927090000_next_auth_schema.sql` | `next_auth` schema、4 张表、外键、唯一键、索引、RLS 开启、`service_role` 授权（§5.1） | — |
| 2 | `20260927090100_user_profiles.sql` | `public.user_profiles`（外键 → `next_auth.users`）（§5.2） | #1 |
| 3 | `20260927090200_products.sql` | `public.products` + `public.product_translations` + 6 条商品与其 zh/en 文案（§5.3） | — |
| 4 | `20260927090300_insurance_cases.sql` | `public.insurance_cases` + `insurance_case_translations` + 10 条案例与 zh/en 文案（§5.4） | #3 |
| 5 | `20260927090500_orders.sql` | `public.orders` + 状态检查约束 + **部分唯一索引**（去重）（§5.5） | #1、#3 |
| 6 | `20260927090600_chat.sql` | `public.chat_sessions` + `public.chat_messages`（§5.6） | #1 |
| 7 | `20260927090700_seed_demo_account.sql` | 演示账号（`next_auth.users` + `user_profiles`）+ 2 条演示订单（§5.7） | #1、#2、#5 |

> **执行顺序由时间戳决定，与本文 §5 的章节编号一一对应。**

> **不新增** `supabase/config.toml`：那是本地 Supabase CLI（`supabase start` / `db push`）用的，GitHub 集成不需要（已确认不做本地预演）。

### 4.3 GitHub 集成的真实行为（重要，容易踩）

1. **只按版本号应用一次。** 已在 `supabase_migrations.schema_migrations` 里登记过的版本号，即使文件内容变了也**不会重跑**。所以「改 seed 数据」必须**新增一个文件**，不能改老文件。这是本方案最容易踩的坑。
2. **按时间戳顺序执行，遇错中断。** 如果 `…0100` 失败，后面的文件都不会执行，并且会停在半个状态。所以每个文件都写成幂等的，失败后修好重推（**换新时间戳**）即可。
3. **只做迁移，不做构建。** 迁移就是纯 SQL，不要指望在迁移里调 Next.js 的东西。
4. **集成需要手工开启并且只监听指定分支。** 推 feature 分支可能完全不触发。

---

## 5. DDL

### 5.1 `next_auth`（Auth.js adapter 专用，4 张表）

列名与类型严格对齐 `node_modules/@auth/supabase-adapter/src/index.ts` 的 `Database` 接口（`accounts` / `sessions` / `users` / `verification_tokens`）。**注意驼峰列必须带双引号**，否则 Postgres 会折叠成小写，adapter 查询报 `column does not exist`。

```sql
-- 20260927090000_next_auth_schema.sql
-- 目的：为 @auth/supabase-adapter 建出它硬编码依赖的 next_auth schema。
-- 幂等：可重复执行。GitHub 集成按版本号只应用一次。

create schema if not exists next_auth;

-- Supabase 的默认权限只覆盖 public；自定义 schema 必须显式授权，
-- 且 PostgREST 要求 schema 出现在 Dashboard → Settings → API → Exposed schemas 里。
grant usage on schema next_auth to service_role;
grant all on all tables in schema next_auth to service_role;
grant all on all routines in schema next_auth to service_role;
grant all on all sequences in schema next_auth to service_role;
alter default privileges in schema next_auth grant all on tables to service_role;
alter default privileges in schema next_auth grant all on routines to service_role;
alter default privileges in schema next_auth grant all on sequences to service_role;

-- 1) 用户：OAuth 首次登录时由 adapter.createUser() 写入
create table if not exists next_auth.users (
  id              uuid        not null default gen_random_uuid(),
  name            text,
  email           text,
  "emailVerified" timestamptz,
  image           text,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email)
);

-- 2) 第三方账号绑定：每次 OAuth 授权都会 upsert/insert
create table if not exists next_auth.accounts (
  id                  uuid   not null default gen_random_uuid(),
  type                text   not null,
  provider            text   not null,
  "providerAccountId" text   not null,
  refresh_token       text,
  access_token        text,
  expires_at          bigint,
  token_type          text,
  scope               text,
  id_token            text,
  session_state       text,
  oauth_token_secret  text,
  oauth_token         text,
  "userId"            uuid   not null,
  constraint accounts_pkey primary key (id),
  -- 必须存在：adapter.getUserByAccount() 用的是 PostgREST 的
  -- `select("users (*)")`，没有外键 PostgREST 推导不出关系，
  -- 老用户 OAuth 登录会拿到 null，表现为「登录后没有用户」。
  constraint accounts_userId_fkey foreign key ("userId")
    references next_auth.users (id) on delete cascade,
  constraint accounts_provider_providerAccountId_key unique (provider, "providerAccountId")
);

-- 3) 会话：strategy: "jwt" 下不会被写入，但 adapter 的配置校验要求它存在
create table if not exists next_auth.sessions (
  id             uuid        not null default gen_random_uuid(),
  "sessionToken" text        not null,
  "userId"       uuid        not null,
  expires        timestamptz,
  constraint sessions_pkey primary key (id),
  constraint sessions_sessionToken_key unique ("sessionToken"),
  constraint sessions_userId_fkey foreign key ("userId")
    references next_auth.users (id) on delete cascade
);

-- 4) 验证令牌：本期不发邮箱魔法链接（无任何写入方），但表必须存在（同上，属 adapter 类型契约）
create table if not exists next_auth.verification_tokens (
  id         bigint generated by default as identity,
  identifier text,
  token      text,
  expires    timestamptz,
  constraint verification_tokens_pkey primary key (id),
  constraint verification_tokens_identifier_token_key unique (identifier, token)
);

create index if not exists accounts_userId_idx on next_auth.accounts ("userId");
create index if not exists sessions_userId_idx on next_auth.sessions ("userId");

-- RLS：真正生效的访问控制是「service_role 只存在于服务端」（service_role 绕过 RLS）；
-- 这里开 RLS 且**不建任何策略** = 对 anon / authenticated 全拒绝，是安全的默认值。
-- 注意：Auth.js 的会话是我们自己签的 JWT，不是 Supabase Auth 签发的 JWT，
-- 请求里没有 Supabase 的 claim，auth.uid() 恒为 null；将来若要让浏览器直连，
-- 再单独加策略 + next_auth.uid() 函数（官方文档示例里有那个函数）。
alter table next_auth.users               enable row level security;
alter table next_auth.accounts            enable row level security;
alter table next_auth.sessions            enable row level security;
alter table next_auth.verification_tokens enable row level security;
```

**SQL 做不到的一步（必须手工）**：Dashboard → Project Settings → API → **Exposed schemas** 里勾上 `next_auth`。不勾的话 PostgREST 报 `Invalid schema: next_auth`，OAuth 首次登录直接 500。这一步已写进 `AUTHJS-PLAN.md §9` 的 P0 验收项。

**为什么 `users.id` 是 `uuid` 且不需要额外映射列**：`@auth/core/lib/actions/callback/oauth/callback.js:219-226` 里，用户对象的 id 被显式覆盖成 `crypto.randomUUID()`（注释原文：*the user should remain independent of the provider*），provider 的 id 只落在 `accounts."providerAccountId"`。所以 adapter 传给 `users.id` 的永远是合法 uuid，`uuid` 类型 + `gen_random_uuid()` 默认值都能对上。

### 5.2 应用用户资料（`public.user_profiles`）

`next_auth.users` 是 Auth.js 的**身份真源**，但它的列由 adapter 决定，不该往里加业务字段（§3.4）。所以「用户名 + 密码哈希」单独建一张 `public.user_profiles`，主键与 `next_auth.users.id` **同值**（不是另发一个 id）。

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `uuid` 主键 | 外键 → `next_auth.users(id)`；注册时与身份行共用同一个 uuid |
| `username` | `text` not null | 对应 `lib/types/index.ts` 的 `User.username` |
| `password_hash` | `text` 可空 | `lib/server/password.ts` 的 `salt:hash`（scrypt / 64 字节 hex）；纯 OAuth 用户为 `null` |
| `created_at` / `updated_at` | `timestamptz` not null default now() | `updated_at` 由写入方显式更新，不建触发器（保持简单） |

```sql
-- 20260927090100_user_profiles.sql
-- 目的：应用侧用户资料（用户名 + 密码哈希）。
-- 幂等：可重复执行。

create table if not exists public.user_profiles (
  id            uuid        not null,
  username      text        not null,
  password_hash text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_user_fkey foreign key (id)
    references next_auth.users (id) on delete cascade
);

comment on table  public.user_profiles is '应用用户资料；身份真源在 next_auth.users，本表只放业务字段';
comment on column public.user_profiles.password_hash is 'scrypt salt:hash（见 lib/server/password.ts）；纯 OAuth 用户为 null';

-- RLS：本表只有服务端 service_role 能碰。
-- 这里**刻意不写任何 policy**：Supabase 默认会把 public 新表的全部权限授给 anon / authenticated，
-- 「开 RLS + 无策略」= 全部拒绝，才是安全默认值。不要"顺手补一个 select 策略"。
alter table public.user_profiles enable row level security;
```

> 为什么不在 `next_auth.users` 上加 `password_hash` 列：adapter 的 `createUser` / `updateUser` 会把整个对象写回，自定义列一旦被覆盖或写成 `null` 就会静默丢数据。**adapter 表只放 adapter 认识的列。**

### 5.3 商品（`public.products` + `public.product_translations`）

字段映射表（`lib/mock/products/base.json` → 列）：

| JSON | 列 | 类型 | 备注 |
| --- | --- | --- | --- |
| `id` | `id` | `text` 主键 | `prd-compulsory-traffic` 这类 |
| `slug` | `slug` | `text` 唯一 | 语言文件靠它对上 |
| `category` | `category` | `text` | 取值来自 `PRODUCT_CATEGORIES` |
| `price` | `price` | `integer` | 单位「元」 |
| `coverageAmount` | `coverage_amount` | `integer` 可空 | `own-damage` 是 `null` |
| `period` | `period` | `text` | 现在只有 `"1y"` |
| `badge` | `badge` | `text` 可空 | `statutory` / `hot` / `new` / `null` |
| `active` | `active` | `boolean` 默认 true | |
| `sortOrder` | `sort_order` | `integer` | |

语言映射（`lib/mock/products/{zh,en}.json` → `product_translations`）：`slug → product_id`（先按 slug 查出 id），`name`、`tagline`、`applicableVehicles → applicable_vehicles`、`coverageText → coverage_text`（可空，只有车损险有值）、`coverages → coverages jsonb`。

```sql
-- 20260927090200_products.sql
create table if not exists public.products (
  id              text        not null,
  slug            text        not null,
  category        text        not null,
  price           integer     not null,
  coverage_amount integer,
  period          text        not null,
  badge           text,
  active          boolean     not null default true,
  sort_order      integer     not null,
  created_at      timestamptz not null default now(),
  constraint products_pkey primary key (id),
  constraint products_slug_key unique (slug)
);

create table if not exists public.product_translations (
  product_id          text  not null,
  locale              text  not null,
  name                text  not null,
  tagline             text  not null,
  applicable_vehicles text  not null,
  coverage_text       text,
  coverages           jsonb not null default '[]'::jsonb,
  constraint product_translations_pkey primary key (product_id, locale),
  constraint product_translations_locale_check check (locale in ('zh', 'en')),
  constraint product_translations_product_id_fkey foreign key (product_id)
    references public.products (id) on delete cascade
);

-- 目录数据对所有人只读：开 RLS + 只给 select 策略。
-- （Supabase 默认会把 public 新表的全部权限授给 anon/authenticated，
--   不写策略的话持 anon key 就能写库。）
alter table public.products             enable row level security;
alter table public.product_translations enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select using (true);

drop policy if exists "product_translations_public_read" on public.product_translations;
create policy "product_translations_public_read" on public.product_translations
  for select using (true);

grant select on public.products, public.product_translations to anon, authenticated;

-- 语言无关字段（镜像 lib/mock/products/base.json 全量 6 条）
insert into public.products
  (id, slug, category, price, coverage_amount, period, badge, active, sort_order)
values
  ('prd-compulsory-traffic',    'compulsory-traffic',    'statutory',          950,  200000, '1y', 'statutory', true, 1),
  ('prd-commercial-basic',      'commercial-basic',      'commercial-package', 1280, 500000, '1y', null,        true, 2),
  ('prd-commercial-comfort',    'commercial-comfort',    'commercial-package', 2680, 1000000, '1y', 'hot',      true, 3),
  ('prd-commercial-premium',    'commercial-premium',    'commercial-package', 4580, 2000000, '1y', 'new',      true, 4),
  ('prd-third-party-liability', 'third-party-liability', 'single',             1150, 1000000, '1y', null,       true, 5),
  ('prd-own-damage',            'own-damage',            'single',             1860, null,    '1y', null,       true, 6)
on conflict (id) do nothing;

-- 语言相关字段：下面给出 1 条完整样例（两种语言各一份），
-- 其余 5 条按同一模式从 lib/mock/products/zh.json / en.json 生成（见 §3.5）。
insert into public.product_translations
  (product_id, locale, name, tagline, applicable_vehicles, coverage_text, coverages)
values
  (
    'prd-compulsory-traffic', 'zh', '交强险',
    '国家强制投保的基础保障，未生效不得上路行驶。',
    '家庭自用汽车、非营业客车',
    null,
    '[
       {"title":"第三者人身伤亡","desc":"在责任限额内赔偿第三方的人身伤亡，包含医疗费、误工费与护理费。"},
       {"title":"第三者财产损失","desc":"赔偿事故造成的第三方财产直接损失，在限额内按事故责任比例承担。"},
       {"title":"无责代赔","desc":"被保险车辆在事故中无责任时，仍在责任限额内先行赔付第三方损失。"},
       {"title":"法定上路凭证","desc":"未投保交强险的车辆不得上路行驶，也无法通过车辆年检。"}
     ]'::jsonb
  ),
  (
    'prd-compulsory-traffic', 'en', 'Compulsory Traffic Insurance',
    'The mandatory baseline cover. A vehicle may not be driven until it is in force.',
    'Private cars and non-commercial passenger vehicles',
    null,
    '[
       {"title":"Third-party injury and death","desc":"Pays for injury or death caused to a third party within the liability limit, including medical costs, lost earnings, and care."},
       {"title":"Third-party property damage","desc":"Pays for direct property damage caused to a third party, shared by the degree of fault and capped by the limit."},
       {"title":"Settlement without fault","desc":"Where the insured vehicle is not at fault, the third party is still paid first within the liability limit."},
       {"title":"Legal proof of roadworthiness","desc":"A vehicle without compulsory cover may not be driven and cannot pass its annual inspection."}
     ]'::jsonb
  )
on conflict (product_id, locale) do nothing;
```

### 5.4 投保案例（`public.insurance_cases` + `public.insurance_case_translations`）

| JSON（`lib/mock/cases/base.json`） | 列 |
| --- | --- |
| `id` | `id`（主键） |
| `sortOrder` | `sort_order` |
| `productId` | `product_id`（外键 → `public.products.id`） |
| `icon` | `icon`（`check` 约束对齐 `lib/types` 的 `CASE_ICONS`） |
| `claimDays` | `claim_days` |
| `plateNo` | `plate_no` |

语言侧（`zh.json` / `en.json`，以 `id` 为键）：`city`、`ownerName → owner_name`、`summary`、`quote`。

```sql
-- 20260927090300_insurance_cases.sql
-- 依赖 20260927090200_products.sql（外键指向 public.products）
create table if not exists public.insurance_cases (
  id         text        not null,
  sort_order integer     not null,
  product_id text        not null,
  icon       text        not null,
  claim_days integer     not null,
  plate_no   text        not null,
  created_at timestamptz not null default now(),
  constraint insurance_cases_pkey primary key (id),
  -- 与 lib/types 的 CASE_ICONS 对齐；图标集合变化时要新增迁移
  constraint insurance_cases_icon_check
    check (icon in ('car','rain','wind','bike','wrench','health','sparkles','key')),
  constraint insurance_cases_product_id_fkey foreign key (product_id)
    references public.products (id)
);

create table if not exists public.insurance_case_translations (
  case_id    text not null,
  locale     text not null,
  city       text not null,
  owner_name text not null,
  summary    text not null,
  quote      text not null,
  constraint insurance_case_translations_pkey primary key (case_id, locale),
  constraint insurance_case_translations_locale_check check (locale in ('zh', 'en')),
  constraint insurance_case_translations_case_id_fkey foreign key (case_id)
    references public.insurance_cases (id) on delete cascade
);

alter table public.insurance_cases            enable row level security;
alter table public.insurance_case_translations enable row level security;

drop policy if exists "insurance_cases_public_read" on public.insurance_cases;
create policy "insurance_cases_public_read" on public.insurance_cases
  for select using (true);

drop policy if exists "insurance_case_translations_public_read" on public.insurance_case_translations;
create policy "insurance_case_translations_public_read" on public.insurance_case_translations
  for select using (true);

grant select on public.insurance_cases, public.insurance_case_translations
  to anon, authenticated;

insert into public.insurance_cases
  (id, sort_order, product_id, icon, claim_days, plate_no)
values
  ('case-01',  1, 'prd-commercial-comfort',    'car',      2, '浙A***86'),
  ('case-02',  2, 'prd-own-damage',            'rain',     3, '川A***21'),
  ('case-03',  3, 'prd-own-damage',            'sparkles', 2, '苏E***07'),
  ('case-04',  4, 'prd-compulsory-traffic',    'car',      3, '粤B***33'),
  ('case-05',  5, 'prd-commercial-basic',      'wrench',   3, '鄂A***15'),
  ('case-06',  6, 'prd-commercial-comfort',    'car',      5, '陕A***62'),
  ('case-07',  7, 'prd-commercial-basic',      'health',   2, '粤A***48'),
  ('case-08',  8, 'prd-commercial-premium',    'key',      5, '苏A***90'),
  ('case-09',  9, 'prd-own-damage',            'wind',     3, '鲁B***27'),
  ('case-10', 10, 'prd-third-party-liability', 'bike',     4, '津A***53')
on conflict (id) do nothing;

-- 文案样例（case-01 两种语言），其余 9 条同模式生成
insert into public.insurance_case_translations
  (case_id, locale, city, owner_name, summary, quote)
values
  ('case-01', 'zh', '杭州', '王先生',
   '高架追尾后线上报案，定损确认后赔款直接打到账户。',
   '「全程在手机上办完，没跑一次柜台。」'),
  ('case-01', 'en', 'Hangzhou', 'Mr. Wang',
   'Rear-ended on the elevated road; the payout was credited right after the assessment.',
   '“All done on my phone — I never visited a counter.”')
on conflict (case_id, locale) do nothing;
```

**外键方向的选择**：`insurance_cases.product_id` 不加 `on delete cascade`——删商品时不应该静默删掉案例，让删除直接失败（`RESTRICT`，默认行为）更安全，也正好对应 `lib/server/cases.ts` 里「productId 必须能在产品里找到」的断言。

### 5.5 订单（`public.orders`）

订单从 Redis 的 `swi:order:*` / `swi:uorders:*` / `swi:dedup:*` 三套键迁到一张表。列与 `lib/types/index.ts` 的 `Order` 一一对应（`productSnapshot` / `insured` / `vehicle` 三组嵌套对象拍平成列）。

| 原 JSON 字段 | 列 | 备注 |
| --- | --- | --- |
| `id` | `id uuid` | uuid v4，同时当订单号展示，不另设 orderNo |
| `userId` | `user_id uuid` | 外键 → `next_auth.users(id)`；**不再是 `usr-demo` 这类自造 id** |
| `productId` | `product_id text` | 外键 → `public.products(id)` |
| `productSnapshot.{nameZh,nameEn,price}` | `product_name_zh` / `product_name_en` / `product_price` | 下单时快照，后续改价不影响历史单 |
| `insured.*` | `insured_name` / `insured_id_no` / `insured_phone` | |
| `vehicle.*` | `vehicle_plate_no` / `vehicle_brand_model` / `vehicle_vin` / `vehicle_register_year` | |
| `amount` | `amount integer` | 单位「元」 |
| `status` | `status text` + check | `PENDING` / `ACTIVE` / `CANCELLED` / `EXPIRED` |
| `createdAt` / `effectiveAt` / `expireAt` | `created_at` / `effective_at` / `expire_at` | `effective_at` / `expire_at` 可空（待支付订单） |

```sql
-- 20260927090500_orders.sql
-- 目的：订单从 Redis 迁到 Postgres。依赖 next_auth.users（用户 id）与 public.products（产品外键）。
-- 幂等：可重复执行。

create table if not exists public.orders (
  id                    uuid        not null default gen_random_uuid(),
  user_id               uuid        not null,
  product_id            text        not null,
  -- 下单时的产品快照（对应 lib/types/index.ts 的 productSnapshot）
  product_name_zh       text        not null,
  product_name_en       text        not null,
  product_price         integer     not null,
  -- 被保险人与车辆（对应 InsuredInfo / VehicleInfo）
  insured_name          text        not null,
  insured_id_no         text        not null,
  insured_phone         text        not null,
  vehicle_plate_no      text        not null,
  vehicle_brand_model   text        not null,
  vehicle_vin           text        not null,
  vehicle_register_year integer     not null,
  amount                integer     not null,
  status                text        not null,
  created_at            timestamptz not null default now(),
  effective_at          timestamptz,
  expire_at             timestamptz,
  constraint orders_pkey primary key (id),
  constraint orders_user_fkey foreign key (user_id)
    references next_auth.users (id) on delete cascade,
  constraint orders_product_fkey foreign key (product_id)
    references public.products (id),
  constraint orders_amount_check check (amount >= 0),
  constraint orders_status_check check (status in ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED'))
);

-- 订单列表：按 user 过滤 + 按下单时间倒序（替代 swi:uorders:<uid> 那个 List）
create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);
create index if not exists orders_product_idx on public.orders (product_id);

-- 「同车同产品不能重复投保」：替代 swi:dedup:<uid>:<车牌>:<产品> 这套手工索引。
-- ① upper(vehicle_plate_no) 表达式等价于原代码的 plateNo.toUpperCase()，避免大小写绕过；
-- ② 只对 PENDING / ACTIVE 生效，取消或过期后可以重新下单。
create unique index if not exists orders_active_dedup_idx
  on public.orders (user_id, upper(vehicle_plate_no), product_id)
  where status in ('PENDING', 'ACTIVE');

-- RLS：订单是私有数据，只给服务端 service_role；不给 anon / authenticated 任何策略。
alter table public.orders enable row level security;
```

> **到期结算（`syncExpiry`）怎么迁**：`lib/server/orders.ts` 现在是「读到 ACTIVE 且已过期 → 改内存 + 回写 Redis」。迁 SQL 后有两条路：
> - **① 读取时判定（用于展示）**：列表 / 详情把 `status = 'ACTIVE' and expire_at <= now()` 视为 `EXPIRED`，不写库。
> - **② 惰性结算（用于去重）**：部分唯一索引的谓词**不能**用 `now()`（必须是 immutable 表达式），所以一条「ACTIVE 但已过期」的行会继续占着去重位、挡住用户重新投保。`findDuplicateOrder` 之前应先跑一条幂等 UPDATE：
>   `update public.orders set status = 'EXPIRED' where user_id = $1 and status = 'ACTIVE' and expire_at <= now();`
>   一条语句覆盖该用户全部订单，替代现在逐单 `saveOrder` 的 N+1 回写。
> **结论：展示走 ①，去重走 ②。**

### 5.6 客服会话（`public.chat_sessions` + `public.chat_messages`）

现在 `swi:chat:<sid>` 存的是**整段会话 JSON**（`{id, userId, messages: UIMessage[], updatedAt}`，TTL 7 天，最多 60 条）。迁到 Postgres 后拆成两张表：会话一行、每条消息一行。

| 现状 | 迁移后 |
| --- | --- |
| `ChatSession.userId` | `chat_sessions.user_id uuid`（可空：未登录的匿名会话为 null）← 外键 → `next_auth.users(id)` |
| `ChatSession.messages[]` | `chat_messages` 的 N 行 |
| `UIMessage.id` / `role` / `parts` | `message_id` / `role` / `parts jsonb` |
| `MAX_MESSAGES_PER_SESSION = 60` | 写入后按 `id` 只保留最后 60 条（保持现状） |
| TTL 7 天（Redis 自动清理） | **改为不自动过期**；用 `updated_at` 支撑一个未来的清理任务（本期不建定时任务） |

```sql
-- 20260927090600_chat.sql
-- 目的：客服会话从「Redis 整段 JSON」迁到两张表。
-- 幂等：可重复执行。

create table if not exists public.chat_sessions (
  id         text        not null,
  user_id    uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_sessions_pkey primary key (id),
  -- 与 lib/server/ai/chat-sessions.ts 的 CHAT_SESSION_ID_PATTERN 同一约束
  constraint chat_sessions_id_check check (id ~ '^[A-Za-z0-9_-]{16,64}$'),
  constraint chat_sessions_user_fkey foreign key (user_id)
    references next_auth.users (id) on delete cascade
);

create index if not exists chat_sessions_user_idx
  on public.chat_sessions (user_id, updated_at desc);

create table if not exists public.chat_messages (
  id         bigint      generated by default as identity,
  session_id text        not null,
  message_id text        not null,
  role       text        not null,
  parts      jsonb       not null default '[]'::jsonb,
  metadata   jsonb,
  created_at timestamptz not null default now(),
  constraint chat_messages_pkey primary key (id),
  constraint chat_messages_session_fkey foreign key (session_id)
    references public.chat_sessions (id) on delete cascade,
  constraint chat_messages_role_check check (role in ('system', 'user', 'assistant')),
  -- 客户端每条消息自带 id：重发同一条消息时 upsert 覆盖，不会写出重复行
  constraint chat_messages_session_message_key unique (session_id, message_id)
);

create index if not exists chat_messages_session_idx
  on public.chat_messages (session_id, id);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
```

> `chat_messages.id` 用 `bigint generated by default as identity` 而不是 uuid：消息是「有序追加」的，自增列本身就是顺序键，省掉一个排序字段（`next_auth.verification_tokens` 用自增也是同一个理由，见 §3.1）。
> **注意**：`chat_sessions.id` 是**客户端生成的**（浏览器 localStorage 里的随机串），所以这一列既不是 uuid、也不该由数据库生成，`check` 约束只负责挡住脏值。

### 5.7 演示账号 seed（`20260927090700_seed_demo_account.sql`）

把 `lib/server/store.ts` 的 `buildSeedData()` 从「Redis SETNX 种子」改成「SQL `on conflict do nothing` 种子」。三条数据全部与现有代码对齐，前端的演示书签 / 截图不会失效。

| 现状（`buildSeedData`） | 迁移后 |
| --- | --- |
| `user.id = "usr-demo"` | 固定 uuid `00000000-0000-4000-8000-000000000001`（§2.3 的 uuid 改造：`usr-demo` 这类自造 id 不再存在） |
| `username = "DemoDriver"` | `public.user_profiles.username` |
| `passwordHash = hashPassword("Demo1234")` | 预先算好的 `salt:hash`（已用 scrypt + `timingSafeEqual` 回验 = `true`） |
| 订单 `8f0c1f6e-…`（ACTIVE，沪A12345，交强险 950） | 同一 id、同数据 |
| 订单 `b7d4a2c9-…`（PENDING，沪B67890，商业险 · 畅行版 2680） | 同一 id、同数据 |

```sql
-- 20260927090700_seed_demo_account.sql
-- 目的：演示账号 / 演示订单从 Redis seed 改为 SQL seed（等价于 lib/server/store.ts 的 buildSeedData）。
-- 幂等：on conflict do nothing；只写不覆盖，不会冲掉用户后来注册或下单的数据。
-- 依赖：090000（next_auth.users）、090100（user_profiles）、090200（products）、090500（orders）。

-- 1) 身份行（Auth.js 的身份真源）
insert into next_auth.users (id, name, email, "emailVerified", image)
values (
  '00000000-0000-4000-8000-000000000001',
  'DemoDriver',
  'demo@example.com',
  null,
  null
)
on conflict do nothing;   -- 不指定目标：id 或 email 任一冲突都跳过

-- 2) 业务资料。密码哈希 = scrypt('Demo1234')，salt:hash，64 字节 hex
--    （与 lib/server/password.ts 的 KEY_LENGTH = 64 一致，已回验通过）
insert into public.user_profiles (id, username, password_hash, created_at, updated_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'DemoDriver',
  '5f2a9c1e7b3d4608a1c9e5f20b7d3846:6e1fd46b9ce9367d422c59fe8088c3ce91b7dcfa3a0e78fc602b3b052aec60a7ba0114fa4d4c2fcf4d8dfd7654aaee517195809764f5d4c348666235b80e5ec2',
  now() - interval '120 days',
  now() - interval '120 days'
)
on conflict (id) do nothing;

-- 3) 两条演示订单（id 与 buildSeedData 完全一致）
insert into public.orders (
  id, user_id, product_id,
  product_name_zh, product_name_en, product_price,
  insured_name, insured_id_no, insured_phone,
  vehicle_plate_no, vehicle_brand_model, vehicle_vin, vehicle_register_year,
  amount, status, created_at, effective_at, expire_at
)
values
  (
    '8f0c1f6e-3d8a-4a1f-9f2b-6a1d0c7b5e41',
    '00000000-0000-4000-8000-000000000001',
    'prd-compulsory-traffic',
    '交强险', 'Compulsory Traffic Insurance', 950,
    'Demo Driver', '310101199001011234', '13800000000',
    '沪A12345', '大众 帕萨特 2021', 'LSVAM4185M2123456', 2021,
    950, 'ACTIVE',
    now() - interval '40 days',
    now() - interval '40 days',
    now() - interval '40 days' + interval '1 year'
  ),
  (
    'b7d4a2c9-5e63-4f08-8a71-2c9e4b0f7d13',
    '00000000-0000-4000-8000-000000000001',
    'prd-commercial-comfort',
    '商业险 · 畅行版', 'Commercial Cover · Comfort', 2680,
    'Demo Driver', '310101199001011234', '13800000000',
    '沪B67890', '比亚迪 秦 PLUS', 'LGXC76C42N0123456', 2022,
    2680, 'PENDING',
    now() - interval '3 days',
    null,
    null
  )
on conflict do nothing;   -- id 冲突或去重索引冲突都跳过
```

> **「演示账号只有邮箱 + 密码，能适配 Auth.js 登录吗？」——能，而且不需要任何额外东西。**
> Auth.js 的 `Credentials` provider 只要求 `authorize()` 返回一个 user 或 null。演示账号的校验链是：按 email 查 `next_auth.users` → 取 `user_profiles.password_hash` 走 `verifyPassword()` → 返回 `{ id, name, email }`。
> 它不需要 GitHub / Google 那套 `next_auth.accounts` 行；`next_auth.sessions` 在 jwt 策略下也不需要行（会话在 Cookie 里）。
> 唯一的前置条件：**这个邮箱必须先在 `next_auth.users` 里存在**——因为 `user_profiles.id` 是指向它的外键，这正是上面第 1 步要做的事。

---

## 6. 迁移执行：顺序、依赖、Redis 去留

### 6.1 执行顺序与依赖

| 顺序 | 文件 | 依赖 | 说明 |
| --- | --- | --- | --- |
| 1 | `20260927090000_next_auth_schema.sql` | — | Auth.js adapter 的硬编码 schema；**Auth 侧联调 OAuth 之前必须先跑完这一条** |
| 2 | `20260927090100_user_profiles.sql` | #1 | 外键指向 `next_auth.users` |
| 3 | `20260927090200_products.sql` | — | 目录数据，无外键依赖 |
| 4 | `20260927090300_insurance_cases.sql` | #3 | `product_id` → `public.products` |
| 5 | `20260927090500_orders.sql` | #1、#3 | `user_id` → `next_auth.users`；`product_id` → `public.products` |
| 6 | `20260927090600_chat.sql` | #1 | `user_id` → `next_auth.users` |
| 7 | `20260927090700_seed_demo_account.sql` | #1、#2、#3、#5 | 演示账号 + 2 条演示订单 |

**执行顺序由文件名的时间戳决定**，不靠 push 的先后；外键方向已经用时间戳表达了。

**每个文件都必须幂等**（§4.1）：GitHub 集成「按版本号只应用一次」，但如果你手工在 SQL Editor 里预演过，集成再跑一遍不能报错。

**失败时**：修好 SQL 之后**换一个新时间戳**再推，不要改原文件（§4.3 第 1、2 条）。

### 6.2 Redis 去留逐键判定

先定标准，再看每一类键：

- **进 Postgres**：丢了就是「丢用户资产」的数据——账号、订单、会话记录、目录内容。这类数据需要事务、唯一约束、外键与可查询能力。
- **留 Redis**：丢了可以重做的**短命**数据——限流计数、幂等锁、验证码 / 一次性 token、有时效的缓存。特征是「TTL 本身就是它的语义」。

| Redis 键 | 现在存什么 | 判定 | 去向 |
| --- | --- | --- | --- |
| `swi:user:<id>` | 用户 JSON（含 `passwordHash`） | **迁** | `next_auth.users`（身份）+ `public.user_profiles`（资料与密码） |
| `swi:email:<email>` | 邮箱 → userId（唯一索引） | **迁，并升级** | `next_auth.users.email` 的 `unique` 约束（数据库原子，不再需要 SETNX 抢占） |
| `swi:session:<sid>` | 自研会话（1h 滑动续期） | **删** | Auth.js 的 JWT Cookie（`authjs.session-token`） |
| `swi:usessions:<uid>` | 会话 id Set（「登出其它设备」） | **删** | jwt 策略下没有「按设备撤销单个会话」的能力（§8.1） |
| `swi:order:<oid>` | 订单 JSON | **迁** | `public.orders` |
| `swi:uorders:<uid>` | 用户订单 id 的 List | **迁，并消解** | 不再需要单独结构，用 `orders_user_created_idx` 查询 |
| `swi:dedup:<uid>:<车牌>:<产品>` | 重复投保索引 | **迁，并升级** | `orders_active_dedup_idx` 部分唯一索引（由数据库保证，绕不过去） |
| `swi:chat:<sid>` | 整段聊天 JSON（TTL 7 天） | **迁** | `public.chat_sessions` + `public.chat_messages` |

**结论（三句）：**

1. **可以全部迁走。** 8 类键全部落在「迁」或「删」两栏，**没有一类符合「留 Redis」的标准**。
2. **迁完 Redis 就没有职责了。** 本项目当前没有任何短命数据需求（无限流、无验证码、无分布式锁），所以本方案落地后 Redis 可以整体下线——Redis 的「该用」场景在这个项目里属于**未来需求**，不属于当前代码。
3. **但不要现在删代码。** `lib/server/redis.ts` 与 `@upstash/redis` 依赖留到 S5（全部功能验收通过）再决定；在这之前**不要新增任何 Redis 键**。

### 6.3 数据访问层映射

| 现在（Redis / JSON） | 迁移后（Postgres） |
| --- | --- |
| `lib/server/store.ts`（用户 / 会话 / 邮箱索引 / 订单） | **整文件退役**：用户与会话部分直接删（交给 Auth.js 与 `/api/account/*`）；订单的 4 个函数改成 SQL |
| `store.ts` 的 `ensureStoreReady()` / `buildSeedData()` | 由 `…090700_seed_demo_account.sql` 取代；`DEMO_ACCOUNT` 常量保留（演示文案还引用它） |
| `lib/server/orders.ts` | 读写从 `store.ts` 改到 `public.orders`（`syncExpiry` → §5.5 的 UPDATE；重复投保 → 唯一索引 + 捕获冲突） |
| `lib/server/ai/chat-sessions.ts` | 改成对 `chat_sessions` / `chat_messages` 的 SQL；`canReadChatSession()` 的规则不变 |
| `lib/server/products.ts` / `cases.ts`（构建期读 JSON） | 改成读 `public.*` 表；`lib/mock/*.json` 降级为 seed 来源（§3.5） |
| `lib/server/redis.ts` | S5 前保持原样，但不再被调用 |

---

## 7. 文件级改动清单

**这一期不只是「加 SQL」**：既要加 7 个迁移文件，也要把 6 个 `lib/server/*` 模块从 Redis / JSON 切到 Postgres。

### 7.1 新增

| 文件 | 内容 | 必须？ |
| --- | --- | --- |
| `supabase/migrations/` 下 7 个 `.sql` | §4.2 文件清单 | 必须 |
| `lib/server/supabase.ts` | 服务端 `service_role` 客户端 | 必须（订单 / 会话 / 资料都要用它）。**与 `AUTHJS-PLAN.md §6.1` 是同一个文件，不要建两份** |

### 7.2 修改

| 文件 | 改什么 |
| --- | --- |
| `lib/server/orders.ts` | 4 个数据访问函数从 `store.ts` 改到 `public.orders` 的 SQL |
| `lib/server/ai/chat-sessions.ts` | 读写改成 SQL（会话 upsert + 消息 upsert） |
| `lib/server/products.ts` / `cases.ts` | 数据源从 mock JSON 改成 `public.*` 表 |
| `lib/server/store.ts` | 删掉用户 / 会话 / 邮箱索引部分；订单函数移出后整文件退役 |

### 7.3 删除（本期不删，S5 一起清）

| 文件 / 数据 | 什么时候删 | 为什么现在不删 |
| --- | --- | --- |
| `lib/server/redis.ts` + `@upstash/redis` 依赖 | S5 | 删早了若有遗漏调用点会直接编译不过；先保持可用，等全部验收通过再统一清 |
| `lib/mock/**/*.json` | S5 | 它们是 seed 的数据来源（§3.5），seed 落地前不能删 |
| Redis 里的历史键（`swi:*`） | 上线后手工清 | 迁移不删旧数据；`swi:session:*` 会自然过期，其余手工删 |

### 7.4 不该新增（容易手滑加进去）

| 不该加 | 原因 |
| --- | --- |
| `supabase/config.toml` | 那是本地 Supabase CLI 的配置，GitHub 集成不需要（已确认不做本地预演） |
| `pg` / `postgres` 直连驱动 | 走 PostgREST（HTTP）就够，不引入新依赖（已确认走 PostgREST） |
| 第二个 Supabase 客户端模块 | `lib/server/supabase.ts` 一个就够；adapter 内部自己建自己的客户端，两者不要互相复用 |
| ORM（Prisma / Drizzle） | 本方案的查询都是单表 CRUD，没有复杂关系模型；引入 ORM 属于新技术栈，要先单独讨论 |

---

## 8. 兼容性与影响

### 8.1 与 Upstash Redis / 现有 loader

- **Redis**：迁完后无剩余职责（§6.2）；`lib/server/redis.ts` 在 S5 前保持原样、不再被调用。
- **「登出其它设备」能力会消失**：现在靠 `swi:usessions:<uid>` + `invalidateOtherSessions()` 实现「改密码踢掉其它设备」。jwt 策略下会话在 Cookie 里、服务端没有会话清单，**这个能力会没有**。取舍：本项目是演示站，30 天 JWT + 改密码后要求当前设备重新登录（前端主动 `signOut()`）足够；真要恢复，需要自己再维护一张「已撤销 jti」黑名单表——**本期不做**，但要在 `frontend-docs/prd.md §10.3` 记一笔能力变化。
- **现有 loader**：`products.ts` / `cases.ts` 的加载期校验（语言文件 slug/id 集合必须与 base 一致、`cases.productId` 必须能命中 products）在切 SQL 后由**数据库约束**接管：`locale` 的 check 约束、`product_id` 外键、`product_translations` 的主键。两种表达不冲突。

### 8.2 与 `POLICY-LEADS-PLAN.md` 的边界

`POLICY-LEADS-PLAN.md` 设计的是线索 / 保单 / 诊断等**另一个领域**，本轮不动它。按 §6.2 的标准，**线索、保单这类业务数据将来应该进 Postgres**，只有它里面的验证码 / 限流 / 幂等锁才该留 Redis。要不要为它建表，等该计划进入实现阶段再定（「先有稳定的查询需求，再建表」）。

**唯一共享的点是用户 id**：`next_auth.users.id` 是全局唯一的用户标识，线索 / 保单里的 `userId` 必须引用同一个值，不要再造第二套（`POLICY-LEADS-PLAN.md §4.3`「身份合并」讲的正是这件事）。

### 8.3 OAuth 同邮箱冲突必须显式处理

因为凭据用户（邮箱 + 密码）也会写进 `next_auth.users`（§3.3），「先用邮箱密码注册、再用同邮箱走 GitHub / Google 登录」必然命中 Auth.js 的同邮箱拦截分支，前端只会看到「登录失败」。

| 环节 | 事实 |
| --- | --- |
| 触发条件 | 该 email 已存在于 `next_auth.users`，但它的名下没有对应的 `next_auth.accounts` 行 |
| 依据 | Auth.js 在 `handle-login` 里按 email 查到已有用户后不会隐式合并，直接抛 `OAuthAccountNotLinked` |
| 后果 | 用户无法用自己刚注册的邮箱走 OAuth 登录，且错误提示不反映真实原因 |

处理方案（`allowDangerousEmailAccountLinking: true`）见 `AUTHJS-PLAN.md §3.4`。

### 8.4 与 Supabase 其它组件的隔离

| 组件 | 影响 |
| --- | --- |
| PostgREST（HTTP API） | `next_auth` 与 `public` 都要在 Dashboard → Settings → API → Exposed schemas 里显式勾选，否则查不到 |
| `auth` / `storage` schema | 本文不碰；Supabase 自带的 Auth **不启用**，我们只用它的 Postgres |
| Realtime / Edge Functions | 本期不用 |
| RLS | 目录表（products / cases）公开只读；`user_profiles` / `orders` / `chat_*` 只给 `service_role`（§5.2 / §5.5 / §5.6 每张表后都内联了这句） |

---

## 9. 分阶段实施与验收

| 阶段 | 内容 | 验证 |
| --- | --- | --- |
| **S0 — 安全止血**（0.5h，无代码） | 轮换 `service_role`、更新 `.env` / Vercel、`git log --all -S "service_role" -- .example.env` | §0.2 清单 4 项全绿 |
| **S1 — 验证 GitHub 集成的真实行为**（0.5h） | 新增 `20260926990000_probe.sql`（`create table if not exists public.__probe(id int);`）推上去 | ① 迁移状态变 `applied`；② `schema_migrations` 出现该版本号；③ 事后用**新时间戳**的迁移 `drop table if exists public.__probe;`（不要改原文件） |
| **S2 — `next_auth` + `user_profiles`**（0.5h） | 推 #1 #2；把 `next_auth` 加进 Exposed schemas | 4 张表存在；`select column_name ... where table_name='users'` 里是 `emailVerified`（**不是** `emailverified`）；用 anon key 读 `next_auth.users` 返回空数组或 401/403，**不是**带数据的 200 |
| **S3 — 商品 / 案例**（1h） | 推 #3 #4 | `products` = 6 行、`insurance_cases` = 10 行；`select p.slug ... having count(t.locale) <> 2` 返回 0 行；案例 `product_id` 无断链（`where p.id is null` = 0） |
| **S4 — 订单 / 客服会话 / 演示数据**（1h） | 推 #6 #7 #8；改 `lib/server/{orders,ai/chat-sessions}.ts` | 演示账号能登录；2 条演示订单在列表页可见；同车牌 + 同产品重复下单被唯一索引挡住；聊天记录刷新后仍在 |
| **S5 — 目录切换 + 清理**（1h） | `products.ts` / `cases.ts` 改读 SQL；确认无 Redis 调用后删除 `redis.ts` 与 mock JSON | 页面数据与迁移前逐字段一致；`rg "@upstash/redis"` 只命中 `package.json` |

**明确不在本期范围**：线索 / 保单建表（§8.2）、ORM、本地 Supabase CLI、`pg` 直连。

---

## 10. 风险与回滚

### 10.1 回滚策略

| 场景 | 怎么回滚 |
| --- | --- |
| 还没推送 | 删掉 `supabase/migrations/*.sql` 即可，零影响 |
| 已应用、想撤销 | **不能靠删文件回滚**。集成只在 `supabase_migrations.schema_migrations` 登记版本号，删文件既不重跑也不撤销。要撤销必须写一个**新的**迁移做反向操作（`drop table if exists ...`），并换新时间戳 |
| 推送后中途报错、停在半状态 | 修好 SQL 后**换新时间戳**重推；已成功的部分因为幂等不会重复报错 |
| 代码侧想退回 Redis | 代码可以 `git revert`，**但数据不会回滚**。若迁移期间已产生新数据（新用户 / 新订单），回退代码会让这些数据读不到 → 顺序必须是「先切代码、观察稳定，再清理旧路径」 |

**心法：迁移是单向的、只增不减的。** 回滚靠「往前修」，不靠撤销。

### 10.2 风险清单

| 风险 | 触发条件 | 影响 | 缓解 |
| --- | --- | --- | --- |
| GitHub 集成未开启 / 监听分支不同 | 推到非监听分支 | 迁移根本没跑，却以为已生效 | S1 探针先验证 |
| RLS 忘开或策略写漏 | 只建表不写策略 | Supabase 默认把 `public` 新表全权限授给 anon / authenticated → 拿公开 key 就能写库 | §5 每张表后内联 `enable row level security`；S2 / S3 专门验 |
| `service_role` 密钥泄漏 | `.example.env` 已中招 | 绕过全部 RLS，最高危 | S0 先处理并轮换 |
| 驼峰列名没加双引号 | 手写 DDL 图省事 | adapter 查询全部失败，OAuth 报错且难定位 | §5.1 原文照抄；S2 用 `information_schema` 验证 |
| 迁移文件被误改 | 「顺手修」历史 seed | 改了不生效，白忙一场 | 遵守 §4.3 第 1 条：seed 变更一律新增文件 |
| 演示账号邮箱被别人抢占 | 有人先用 `demo@example.com` 注册 | seed 的 `on conflict do nothing` 会静默跳过 → 演示账号没有密码行 | 部署后跑一次 `select * from public.user_profiles where id = '00000000-0000-4000-8000-000000000001';` 确认存在 |
| 「登出其它设备」能力丢失 | jwt 策略的固有取舍 | 改密码不能踢掉其它设备 | 已知取舍（§8.1），记进 `prd.md §10.3` |
| 目录切换后 JSON 与 DB 不同步 | 有人改了 JSON 忘了改 DB | 「两份数据谁是准的」说不清 | §3.5：切完就删 JSON 或明确标注废弃 |

---

## 11. 已确认的决策

> 与 `AUTHJS-PLAN.md §11` 结构一致：这一节只记录已确认的结论，不再保留问句。

| # | 问题 | 结论 |
| --- | --- | --- |
| 1 | 本地 Supabase CLI（`supabase start` / `db push`）做迁移预演？ | **不引入**。只用 GitHub 集成，不建 `supabase/config.toml`；出错靠幂等 + 新时间戳修（§4.3） |
| 2 | 引入 `pg` 驱动直连数据库？ | **不引入**。走 PostgREST（`@supabase/supabase-js`，已装），服务端用 `service_role` |
| 3 | `guide`（投保指引）入库？ | **不入库**。保持前端写死的静态内容，迁移文件从 8 个减到 7 个（§4.2） |
| 4 | 界面字典（i18n）的翻译 JSON 入库？ | **不入库**。字典是代码资产、随代码走；只有业务内容文案（商品 / 案例）入库（§3.3） |

---

## 12. 落地后要同步更新的文档

| 文档 | 要改什么 |
| --- | --- |
| `frontend-docs/prd.md §10.2 / §10.3` | 「Redis 存账户 / 会话 / 订单」→「Supabase Postgres」；补「登出其它设备能力移除」（§8.1） |
| `frontend-docs/prd.md §9 技术栈` | 存储一节补 Postgres 的职责划分（业务表 / 目录表） |
| `frontend-docs/ui-patterns.md` | 若目录数据改为异步读取，补「加载 / 失败」状态规范 |
| `frontend-docs/avoid.md` | 补反模式：「在 `next_auth.users` 上加业务列」「给 `orders` / `chat_*` 写 anon 策略」「改历史迁移文件」 |
| `docs/AUTHJS-PLAN.md` | §3.3 / §3.7 引用了本文的 `users` / `user_profiles` / seed；DDL 改动两边同步 |
| `docs/PROJECT-NOTES.md §11` | 「后续迁 Supabase」→「已落地」 |
| `docs/POLICY-LEADS-PLAN.md` | 按 §8.2 修正「数据全部放 Redis」的表述 |
| `.example.env` | ✅ 已补：`AUTH_SECRET` / `AUTH_GITHUB_*` / `AUTH_GOOGLE_*` / `AUTH_URL` / `AUTH_TRUST_HOST` 空键名已写入 |

---

## 附：结论一句话总结

**身份真源是 `next_auth.users`（凭据用户、OAuth 用户、演示账号共用这一张表），业务资料在 `public.user_profiles`，订单与客服会话分别落 `public.orders` / `public.chat_sessions` + `chat_messages`；8 类 Redis 键全部「迁」或「删」，Redis 在本项目可整体下线；7 个迁移文件按时间戳顺序幂等执行，由 GitHub 集成自动应用。**
