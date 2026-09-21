P2-展示 OK P1-验收 OK P5-验收 OK P4-两次一致 OK P3-强度 OK P2-提交流程 OK P1-校验规则 OK # 汽车保险网站 页面规格

> 版本：v0.1
> 上游：`prd.md` v0.5（路由与业务规则）、`visual.md` v0.1、`design.md` v0.1、`ui-patterns.md` v0.1
> 本文回答**「每个页面具体怎么搭」**：页面内容、Route、页面结构、使用的 Components/Blocks、核心操作、数据、状态、响应式、页面间跳转。
> 阅读方式：先看 §1 全局外壳与 §2 导航地图，再按页查阅。每页的结构树可直接作为实现顺序。

---

## 1. 全局外壳

由 `app/[locale]/layout.tsx` 渲染，路由切换时不重新挂载。

### 1.1 Header

| 项 | 桌面（≥ 1024px） | 移动 / 平板（< 1024px） |
| --- | --- | --- |
| 高度 | 72px | 60px |
| 左侧 | `public/next.svg` + 文字「汽车保险」 | 同左 |
| 中间 | 导航 4 项：首页 / 保险产品 / 投保指引 / 关于我们 | 收起进抽屉 |
| 右侧 | 语言切换（中 / EN）+ 登录注册按钮；已登录时显示头像 + 用户名下拉菜单 | 语言切换 + 汉堡按钮 |
| 定位 | `sticky top-0 z-40`，底色 `bg-background/95` + 顶部细描边 | 同左 |

- 导航项的点击行为见 `ui-patterns.md` §8.2（在首页滚动、在外页先回首页再滚动）。
- 当前项高亮：首页按滚动位置高亮分区；其他页面按当前路由高亮。
- 已登录的下拉菜单（`dropdown-menu`）：个人中心、退出登录。
- 头像用 `avatar` + `avatar-fallback`（取用户名首字）。

### 1.2 Footer

- 底色 `--primary`，文字 `--primary-foreground`，上内边距 64px / 下 32px。
- 四栏：品牌简介 / 导航链接 / 联系方式（地址、电话、邮箱，全部 mock）/ 语言切换。
- 底部条：备案号（mock）+ 版权 + **「本站为演示数据」声明**。

### 1.3 全局弹窗与提示

- `AuthDialog`：登录 / 注册双 Tab 弹窗，全局挂载，通过 `openAuthDialog({ intent, onSuccess })` 唤起，**不改变 URL**。
- `Toaster`：`sonner`，位置右下。
- `ScrollRail`：仅首页、仅桌面显示，左侧竖向滚动指示轨。

### 1.4 数据获取方式

| 页面类型 | 方式 |
| --- | --- |
| 公开只读（首页、产品、指引、关于） | 服务端组件调用 `lib/server/products.ts` / `lib/server/guide.ts` |
| 需鉴权（投保、个人中心） | 服务端组件读会话；变更操作由客户端组件 `fetch('/api/**')` |

响应体契约见 `prd.md` §10.1。

---

## 2. 导航地图

```
/[locale]  首页
  ├─ Tab「保险产品」→ 滚动到本页 products 分区
  │     └─ 产品卡片 → /[locale]/products/[slug]
  ├─ Tab「投保指引」→ 滚动到本页 guide 分区
  ├─ Tab「关于我们」→ 滚动到本页 about 分区
  └─ 「查看全部产品」→ /[locale]/products

/[locale]/products  产品列表
  └─ 产品卡片 → /[locale]/products/[slug]

/[locale]/products/[slug]  产品详情
  └─ 「立即投保」
        ├─ 未登录 → AuthDialog → 成功后原地进入下方路由
        └─ 已登录 → /[locale]/purchase/[slug]

/[locale]/purchase/[slug]  投保表单
  └─ 提交成功 → /[locale]/account/orders/[id]

/[locale]/guide  投保指引
/[locale]/about  关于我们

/[locale]/account  个人中心（左侧边栏）
  ├─ 概览       /[locale]/account
  ├─ 我的订单   /[locale]/account/orders
  │                └─ 订单行 → /[locale]/account/orders/[id]
  │                      ├─ 「模拟支付」→ 原地刷新为已生效
  │                      └─ 「取消订单」→ AlertDialog 确认 → 原地刷新为已取消
  ├─ 修改资料   /[locale]/account/profile
  └─ 修改密码   /[locale]/account/password
```

- 语言切换：替换路径首段，路径其余部分不变（`ui-patterns.md` §8.4）。
- 未登录访问 `/purchase/*` 与 `/account/*`：不重定向，渲染 `RequireAuth` 占位并弹出登录框。

---

## 3. 首页 `/[locale]`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件 |
| 需登录 | 否 |
| 数据 | `getProducts(locale)`（取前 3 或全部 6 张卡片）、`getGuide(locale)` |
| 主要 Blocks | `SectionHeading`、`ProductCard`、`ProductGrid`、`StepList`、`Price`、`StatBlock`、`ContactBlock`、`ScrollRail` |
| 核心操作 | 分区 Tab 滚动、跳转产品详情、跳转完整指引 / 关于页 |

### 3.1 页面结构

```
Hero（分区 id=home）
├─ 眉标（eyebrow，大写 + 字距）
├─ 主标题（两行；第二行用 --primary 做同色相深浅对比）
├─ 副标题（body-lg）
├─ 价格行：「年保费 低至 ¥950 起」——取产品列表最低价，用 Price 组件
└─ 双 CTA：实心「浏览保险产品」（滚动到 products）+ 描边「查看投保指引」（滚动到 guide）

Products 分区（id=products）
├─ SectionHeading：眉标 + 「保险产品」+ 副标题
├─ ProductGrid（6 张卡片，桌面 3 列 / 平板 2 列 / 移动 1 列）
└─ 文字链接「查看全部产品」→ /[locale]/products

Guide 分区（id=guide）
├─ SectionHeading
├─ StepList（4 步流程）
└─ 文字链接「查看完整投保指引」→ /[locale]/guide

About 分区（id=about）
├─ SectionHeading
├─ 公司介绍摘要（两到三句）
├─ StatBlock（4 项核心数据）
└─ 文字链接「了解我们」→ /[locale]/about
```

- 四个分区垂直顺序与 Header Tab 顺序严格一致。
- 每个分区加 `scroll-margin-top`，值为 Header 高度。
- 分区之间靠留白切分，不用分割线。

### 3.2 状态

| 状态 | 表现 |
| --- | --- |
| loading | 分区内容用 `Skeleton` 骨架，形状与最终布局一致 |
| empty | 产品为 0 时，Products 分区显示 `Empty` + 「暂无在售产品」 |
| error | 数据读取失败抛给 `error.tsx`，页面级 `Alert` + 重试 |
| ready | 正常渲染 |

### 3.3 响应式

- 移动端：隐藏 `ScrollRail`；Hero 标题降为 `display` 移动字号；CTA 纵向堆叠且宽度撑满。
- 平板：产品 2 列，其余同桌面。
- 桌面：产品 3 列，显示滚动指示轨。

### 3.4 验收点

- [ ] 点击四个 Tab 分别平滑滚动到对应分区，URL 不变、页面不刷新。
- [ ] 手动滚动时 Tab 高亮跟随，且不监听 `scroll` 事件逐帧计算。
- [ ] 从产品详情页点「保险产品」Tab，跳回首页后停在 products 分区。
- [ ] Hero 价格行的数字等于产品列表中最低的年保费。
- [ ] 页面上出现「演示数据」声明。

---

## 4. 产品列表 `/[locale]/products`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件 |
| 需登录 | 否 |
| 数据 | `getProducts(locale)` |
| 主要 Blocks | `SectionHeading`、`ProductGrid`、`ProductCard` |
| 核心操作 | 进入产品详情 |

### 4.1 页面结构

```
页面抬头
├─ h1「保险产品」
└─ 副标题：一句话说明本页
已下架过滤说明（不展示 active=false 的产品）
ProductGrid（6 张卡片，按 sortOrder 升序）
演示数据声明（Alert 或页脚文案）
```

- 卡片内容：保险名、一句话卖点、`Price`（年保费，含「/ 年」）、保额、服务内容前 2 条、类别标签、`Badge`（热销 / 新品 / 法定）、「查看详情」链接。
- **不做类别分组标题**：本站 6 款产品按类别分组的组内数量为 1 / 3 / 2，分组反而割裂视觉；类别以卡片标签形式呈现。
- **不做筛选与分页**：产品仅 6 款，加了也无人用。

### 4.2 状态

| 状态 | 表现 |
| --- | --- |
| loading | 6 张 `Skeleton` 卡片，与卡片尺寸一致 |
| empty | `Empty` + 「暂无在售产品」 |
| error | `error.tsx` 页面级 `Alert` + 重试 |

### 4.3 响应式

桌面 3 列 / 平板 2 列 / 移动 1 列；卡片纵向：移动端上图下文，桌面横版左图右文（与首页卡片一致）。

### 4.4 验收点

- [ ] 6 款产品的名称、价格、保额与 `prd.md` §8.1 完全一致。
- [ ] 卡片价格启用 `tabular-nums`，货币按语言格式化（`¥2,680` / `CN¥2,680`）。
- [ ] 产品被置为 `active=false` 后从列表消失。

---

## 5. 产品详情 `/[locale]/products/[slug]`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件 |
| 需登录 | 否（点「立即投保」时才校验） |
| 数据 | `getProductBySlug(slug, locale)`；不存在或已下架 → `notFound()` |
| 主要 Blocks | `Price`、`Badge`、`Card`、`Separator`、`Alert` |
| 核心操作 | 立即投保 |

### 5.1 页面结构

```
桌面双列（左 2/3 内容 + 右 1/3 价格卡）/ 移动单列

左列
├─ 保险名（h1）+ Badge 标签
├─ 一句话卖点
├─ Separator
├─ 服务内容明细（逐条：标题 + 说明，来自 coverages 数组）
├─ Separator
└─ 投保须知：保障期限、适用车型

右列（粘性 Card）
├─ Price（年保费，醒目）
├─ 保额
├─ 「立即投保」主按钮（撑满）
├─ 「返回产品列表」文字链接
└─ 演示数据声明
```

- 「立即投保」行为：未登录 → `openAuthDialog({ intent: 'purchase', onSuccess })`，成功后进入投保表单；已登录 → 直接 `router.push` 到 `/[locale]/purchase/[slug]`。

### 5.2 状态

| 状态 | 表现 |
| --- | --- |
| loading | `loading.tsx` 双列骨架 |
| not found | `slug` 不存在或 `active=false` → `notFound()` 走 404 页 |
| error | `error.tsx` |

### 5.3 响应式

- 移动端：单列，价格卡移到最上方（在保险名之后），「立即投保」按钮撑满且高度 44px。
- 桌面：右列价格卡 `sticky`，随滚动保持在视口内。

### 5.4 验收点

- [ ] 访问不存在的 slug 返回 404 而非报错页。
- [ ] 下架产品的直链返回 404。
- [ ] 服务内容条目数与 mock 数据一致，无硬编码。
- [ ] 未登录点击「立即投保」不会丢当前产品（登录后直达该产品投保表单）。

---

## 6. 投保表单 `/[locale]/purchase/[slug]`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件取产品数据；表单为客户端组件 |
| 需登录 | 是 |
| 数据 | 读：`getProductBySlug`；写：`POST /api/orders` |
| 主要 Blocks | `PurchaseForm`、`Card`、`Alert`、`FieldGroup`、`Field`、`Input`、`Select` |
| 核心操作 | 提交投保 |

### 6.1 页面结构

```
未登录 → RequireAuth 占位（说明 + 打开登录弹窗），不渲染表单

已登录
├─ 页面抬头：h1「投保信息填写」+ 说明
├─ 产品摘要 Card：保险名、单价、保障期限
├─ 投保表单（PurchaseForm）
│   ├─ FieldSet「被保人信息」
│   │   ├─ 姓名        insured.name
│   │   ├─ 证件号      insured.idNo
│   │   └─ 手机号      insured.phone
│   ├─ FieldSet「车辆信息」
│   │   ├─ 车牌号      vehicle.plateNo
│   │   ├─ 品牌型号    vehicle.brandModel
│   │   ├─ 车架号 VIN  vehicle.vin
│   │   └─ 注册年份    vehicle.registerYear（Select）
│   ├─ Separator
│   ├─ 费用确认行：产品名 + 金额（Price）
│   └─ 提交按钮「提交投保」（Spinner + disabled 防重复）
└─ 演示数据声明
```

### 6.2 字段校验规则

本文是这些规则的权威定义，实现时以此为准。

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| `insured.name` | 是 | 2–20 字符，允许中英文与空格 |
| `insured.idNo` | 是 | 15 位或 18 位，18 位末位可为 `X`（大小写均可） |
| `insured.phone` | 是 | 11 位数字，以 `1` 开头 |
| `vehicle.plateNo` | 是 | 2–8 位，允许中文、大写字母与数字 |
| `vehicle.brandModel` | 是 | 2–40 字符 |
| `vehicle.vin` | 是 | 17 位，允许字母与数字，**不含 `I`、`O`、`Q`** |
| `vehicle.registerYear` | 是 | 下拉选择，范围 2000 至当前年份 |

- 这些规则写成 **zod schema，放在 `lib/validation/`，前端表单与服务端接口共用同一份**，不写两遍。
- 前端校验失败时错误贴到字段下方且不发请求；服务端作为兜底重复校验，失败时返回 `VALIDATION_ERROR`，由表单级 `Alert` 呈现（见 `prd.md` §10.1）。
- 能唯一对应字段的业务码：`DUPLICATE_ORDER` → 表单级 `Alert`；其余见 `prd.md` §10.1 的映射表。

### 6.3 核心操作与跳转

```
提交
├─ 前端校验失败 → 内联错误，不发请求
├─ 服务端 VALIDATION_ERROR → 表单级 Alert（不指向具体字段）
├─ DUPLICATE_ORDER → 表单级 Alert「该车辆已投保此产品」
├─ UNAUTHORIZED → 清除登录态 → 打开 AuthDialog → 成功后重试
└─ OK（201）→ toast 成功 → router.push('/[locale]/account/orders/{id}')
```

### 6.4 状态

| 状态 | 表现 |
| --- | --- |
| 未登录 | `RequireAuth` 占位 + 自动弹登录框，保留 URL |
| submitting | 提交按钮 `Spinner` + `disabled` |
| 字段错误 | `data-invalid` + `aria-invalid` + 字段下方错误文案 |
| 表单级错误 | 表单底部 `Alert variant="destructive"` |
| 提交失败 | 保留已填内容，不清空 |
| 产品不存在 | `notFound()` |

### 6.5 响应式

桌面双列（被保人信息 / 车辆信息各占一列），移动端单列；移动端输入框高度 44px。

### 6.6 验收点

- [ ] 七条校验规则逐条可用，非法输入不发请求。
- [ ] VIN 含 `I` / `O` / `Q` 时报错。
- [ ] 同一车辆同一产品重复提交返回 409 与 `DUPLICATE_ORDER`，且不生成第二条订单。
- [ ] 提交成功后直达该订单详情页，订单号为 UUID v4，且与订单列表、订单详情页显示一致。
- [ ] 提交过程中连续点击按钮只产生一条订单。

---

## 7. 投保指引 `/[locale]/guide`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件 |
| 需登录 | 否 |
| 数据 | `getGuide(locale)` |
| 主要 Blocks | `SectionHeading`、`StepList`、`MaterialList`、`FaqAccordion` |
| 核心操作 | 阅读、跳转产品列表 |

### 7.1 页面结构

```
页面抬头：h1「投保指引」+ 副标题
分区 1「投保流程」：StepList（4 步，每步含标题、说明、预计耗时）
分区 2「所需材料」：MaterialList（材料名 + 说明 + 是否必需）
分区 3「常见问题」：FaqAccordion（5 条）
页尾 CTA：文字链接「浏览保险产品」→ /[locale]/products
演示数据声明
```

**mock 内容（写在 `lib/mock/guide/{base,zh,en}.json`）**

- 流程：选择产品（约 5 分钟）→ 填写投保信息（约 10 分钟）→ 在线支付保费（约 2 分钟）→ 保单生效（1 个工作日）。
- 材料：行驶证（必需）、车主身份证（必需）、车辆登记证书（可选）、上年度保单（续保时必需）。
- FAQ 5 条：保费怎么算 / 能否中途退保 / 保单多久生效 / 支持哪些车型 / 如何获取发票。

### 7.2 状态

| 状态 | 表现 |
| --- | --- |
| loading | `Skeleton` 骨架 |
| empty | 某分区为空时隐藏该分区，不显示空状态（内容型页面） |
| error | `error.tsx` |

### 7.3 响应式

移动端全部单列，`StepList` 的序号改为左侧竖排；桌面流程图可横向排列。

### 7.4 验收点

- [ ] 三个分区均来自 mock JSON，中英内容都有，无硬编码文案。
- [ ] FAQ 可键盘操作展开（`accordion` 原生支持）。
- [ ] 材料清单清晰区分必需与可选。

---

## 8. 关于我们 `/[locale]/about`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件 |
| 需登录 | 否 |
| 数据 | 公司信息写在字典 `about` 命名空间；核心数据为常量 |
| 主要 Blocks | `SectionHeading`、`StatBlock`、`ContactBlock` |
| 核心操作 | 阅读、复制联系方式 |

### 8.1 页面结构

```
页面抬头：h1「关于我们」+ 副标题
公司介绍：2–3 段文字
StatBlock：4 项核心数据（服务车主数、合作机构数、平均理赔时效、成立年份）
ContactBlock：地址、电话、邮箱（全部 mock）
演示数据声明（必须显眼，本页内容全为占位）
```

**mock 数据**：服务车主 120,000+ / 合作机构 300+ / 平均理赔时效 2.5 天 / 成立年份 2008。

### 8.2 状态与响应式

内容型页面，无接口，只有 `error.tsx` 兜底；移动端单列，桌面数据块 4 列 / 平板 2 列。

### 8.3 验收点

- [ ] 页面明确标注内容为演示占位。
- [ ] 未出现真实保险公司名称、牌照号或真实费率表。

---

## 9. 个人中心外壳 `/[locale]/account/layout.tsx`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件读会话；侧边栏为客户端组件（需 `usePathname`） |
| 需登录 | 是（未登录渲染 `RequireAuth`） |
| 主要 Blocks | `AccountShell` |
| 应用范围 | 概览、我的订单、订单详情、修改资料、修改密码 |

### 9.1 结构

```
桌面：左侧边栏 220px + 右侧内容区（间距 40px）
├─ 侧边栏：用户名 + 邮箱 + 导航列表（概览 / 我的订单 / 修改资料 / 修改密码）
└─ 内容区：{children}

移动：顶部横向可滚动导航（高 44px）+ 内容区
```

- 侧边栏用 **`next/link` 导航列表**，不用 `Tabs`（详见 `ui-patterns.md` §8.3）。
- 当前项高亮依据 `usePathname()`，需正确匹配带 `locale` 前缀的路径，且「概览」不能在 `/account/orders` 时被误高亮。

### 9.2 验收点

- [ ] 四个 Tab 均可直接输入 URL 访问、可刷新、可浏览器返回。
- [ ] 切换 Tab 时 `AccountShell` 不重新挂载，只有内容区变化。
- [ ] 未登录访问任一子页都不丢失 URL，登录后原地进入。

---

## 10. 概览 `/[locale]/account`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件 |
| 数据 | 会话用户 + `getOrdersByUser(userId)` |
| 主要 Blocks | `Card`、`StatBlock`、`OrderStatusBadge` |
| 核心操作 | 快捷跳转到我的订单 / 修改资料 |

### 10.1 页面结构

```
h1「个人中心」
账户信息 Card：用户名、邮箱、注册时间（启用 tabular-nums）
订单统计：3 张统计卡（订单总数 / 待支付 / 已生效）
最近订单：最近 3 条订单摘要（订单号、产品名、金额、状态徽标）+ 「查看全部」链接
快捷入口：修改资料 / 修改密码
```

### 10.2 状态

| 状态 | 表现 |
| --- | --- |
| loading | 统计卡与列表骨架 |
| 无订单 | 统计卡显示 0，最近订单区用 `Empty` + 「暂无订单」+ 「去看看保险产品」按钮 |
| error | `error.tsx` |

### 10.3 验收点

- [ ] 统计数字与订单列表实际数据一致。
- [ ] 订单状态徽标同时具备颜色与文字。

---

## 11. 我的订单 `/[locale]/account/orders`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件取数；筛选为客户端状态 |
| 数据 | `getOrdersByUser(userId, locale)` |
| 主要 Blocks | `OrderList`、`OrderStatusBadge`、`Table`、`Empty` |
| 核心操作 | 筛选、进入订单详情 |

### 11.1 页面结构

```
h1「我的订单」
筛选 Tabs：全部 / 待支付 / 已生效
订单列表
├─ 桌面：Table（订单号、产品名、金额、状态、创建时间、操作）
└─ 移动：卡片列表（订单号、产品名、金额、状态徽标）
Empty 状态
```

- 筛选使用 shadcn `Tabs` 做**页内过滤**（客户端状态，不改 URL）。这与 §9 的侧边栏导航不同——侧边栏是路由切换，这里是同一页面内的数据过滤。
- 「已取消」「已失效」的订单只在「全部」中出现，因为 `prd.md` §6.3 只定义了三个筛选档。
- 订单列表默认按创建时间倒序。
- 订单号在列表与详情中**完整展示、不截断**：UUID 为 36 字符，移动端会折行，需要预留换行空间；样式见 `design.md` §3.3。
- 行操作：「查看详情」。

### 11.2 状态

| 状态 | 表现 |
| --- | --- |
| loading | `Skeleton` 表格行 / 卡片 |
| 无任何订单 | `Empty` + 「还没有订单」+ 「浏览保险产品」按钮 |
| 某筛选下为空 | `Empty` + 「没有{待支付/已生效}的订单」，不显示跳转按钮 |
| error | `error.tsx` |

### 11.3 响应式

桌面表格，移动端卡片列表，**共用同一份数据与状态**，只在渲染层分叉。

### 11.4 验收点

- [ ] 桌面与移动端展示的订单数量、状态一致。
- [ ] 筛选切换即时生效，不发起网络请求。
- [ ] 订单金额与状态与订单详情页一致。

---

## 12. 订单详情 `/[locale]/account/orders/[id]`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件取数；操作按钮为客户端组件 |
| 数据 | `getOrderById(orderId, userId)`；非本人订单 → `FORBIDDEN` → 404 |
| 主要 Blocks | `Card`、`Separator`、`OrderStatusBadge`、`Price`、`AlertDialog` |
| 核心操作 | 模拟支付、取消订单 |

### 12.1 页面结构

```
h1「订单详情」+ OrderStatusBadge
Card 1 产品信息：产品名（快照）、单价、保障期限
Card 2 被保人信息：姓名、证件号（脱敏）、手机号（脱敏）
Card 3 车辆信息：车牌号、品牌型号、VIN（脱敏）、注册年份
Card 4 金额：应付金额
Card 5 时间线：下单时间 → 生效时间（未生效则显示「—」）→ 到期时间
操作区（仅待支付状态显示）
├─ 主按钮「模拟支付」→ POST /api/orders/[id]/pay
└─ 次按钮「取消订单」→ AlertDialog 二次确认 → POST /api/orders/[id]/cancel
「返回我的订单」文字链接
```

### 12.2 操作与状态流转

| 当前状态 | 可用操作 | 成功后 |
| --- | --- | --- |
| `待支付` | 模拟支付 | 状态变 `已生效`，写入 `effectiveAt`，`router.refresh()` |
| `待支付` | 取消订单（AlertDialog 确认） | 状态变 `已取消`，`router.refresh()` |
| `已生效` | 无 | 只读 |
| `已取消` | 无 | 只读 |
| `已失效` | 无 | 只读 |

- 对非待支付订单调用取消 → 409 `ORDER_NOT_CANCELLABLE`，用 toast 提示。
- 敏感信息脱敏：证件号、手机号、VIN 在详情页只展示首尾，中间用 `*`。

### 12.3 状态

| 状态 | 表现 |
| --- | --- |
| loading | 卡片骨架 |
| 订单不存在或非本人 | `NOT_FOUND` / `FORBIDDEN` → 走 404 页（不泄露「存在但无权」） |
| 操作中 | 按钮 `Spinner` + `disabled` |
| 操作失败 | `sonner` toast 提示对应 `code` 的文案 |

### 12.4 响应式

移动端卡片单列，两个操作按钮撑满并纵向堆叠；桌面按钮并排右对齐。

### 12.5 验收点

- [ ] 五个信息卡片内容与创建订单时提交的数据一致（产品名与价格取快照，不随产品改价变化）。
- [ ] 非本人订单号返回 404 而非 403 页面，不泄露资源存在性。
- [ ] 已生效状态不再显示任何操作按钮。
- [ ] 取消订单必须经过 AlertDialog 二次确认。

---

## 13. 修改资料 `/[locale]/account/profile`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件取会话；表单为客户端组件 |
| 数据 | 读：会话用户；写：`PATCH /api/auth/profile` |
| 主要 Blocks | `ProfileForm`、`Card`、`FieldGroup`、`Field`、`Input` |
| 核心操作 | 保存用户名与邮箱 |

### 13.1 页面结构

```
h1「修改资料」
Card
├─ 用户名（Input，2–20 字符，允许中英文与数字）
├─ 邮箱（Input，需符合邮箱格式）
├─ 注册时间（只读展示）
└─ 「保存修改」按钮
```

### 13.2 规则

- 用户名与邮箱**均可修改**（`prd.md` C14）。
- 邮箱修改需通过唯一性校验；已被占用返回 409 `EMAIL_TAKEN`，错误贴到邮箱字段。
- 保存成功后 `router.refresh()`，Header 与侧边栏的用户名同步更新。
- 两个字段都没改动时，保存按钮 `disabled`。

### 13.3 状态与验收点

- [ ] 邮箱已被注册时，错误提示贴在邮箱字段下方而非弹窗。
- [ ] 保存成功后 Header 用户名立即更新，无需重新登录。
- [ ] 未改动任何字段时按钮不可点击。

---

## 14. 修改密码 `/[locale]/account/password`

| 项 | 内容 |
| --- | --- |
| 渲染 | 服务端组件读会话；表单为客户端组件 |
| 数据 | 写：`POST /api/auth/password` |
| 主要 Blocks | `PasswordForm`、`Card`、`FieldGroup`、`Field`、`Input` |
| 核心操作 | 修改密码 |

### 14.1 页面结构

```
h1「修改密码」
Card
├─ 当前密码
├─ 新密码（≥ 8 位，含字母与数字）
├─ 确认新密码
└─ 「确认修改」按钮
```

### 14.2 规则

- 三个字段均必填；新密码强度不足（少于 8 位或缺字母 / 数字）返回 `TOO_WEAK`，错误贴到新密码字段。
- 两次输入不一致由前端 zod 校验拦截，不发请求，错误贴到确认字段（服务端不接收确认密码，因此不设该业务码）。
- 当前密码不正确返回 400 `INVALID_PASSWORD`。
- 新密码与当前密码相同返回 400 `SAME_PASSWORD`。
- 修改成功后**作废该用户的其它会话，当前会话保留**并提示成功（`prd.md` §8.3）。
- 表单提交成功后清空三个字段。

### 14.3 验收点

- [ ] 前端拦住的路径：必填缺失、两次输入不一致——不发请求，错误贴到对应字段。
- [ ] 服务端返回的路径：`TOO_WEAK`、`INVALID_PASSWORD`、`SAME_PASSWORD` 均贴到正确字段；`VALIDATION_ERROR` 走表单级 `Alert`。
- [ ] 修改成功后当前会话仍然有效，其他设备会话失效。
- [ ] 成功后表单被清空。

---

## 15. 404 页面 `/[locale]/not-found.tsx`

| 项 | 内容 |
| --- | --- |
| 触发 | 未匹配路由、`notFound()` 调用、非法语言段、产品/订单不存在 |
| 主要 Blocks | `Empty`、`Button` |

```
Empty
├─ 标题「页面不存在」
├─ 说明：链接可能已失效，或产品已下架
├─ 主按钮「返回首页」→ /[locale]
└─ 次按钮「浏览保险产品」→ /[locale]/products
```

- 非法语言段（如 `/fr`）由 `[locale]/layout.tsx` 的 `notFound()` 收口，同样落到本页。
- 订单不存在与非本人访问订单**统一返回 404**，不区分 403，避免泄露资源存在性。

### 验收点

- [ ] 访问 `/fr`、`/products/not-exist`、`/account/orders/别人的订单号` 均落到本页。

> **实测的行为差异（Next.js 流式渲染的固有限制）**：`/fr` 这类在 `[locale]/layout.tsx` 抛出的 `notFound()` 返回真实 `404` 状态码；而页面组件里抛出的 `notFound()`（产品不存在、订单不存在）发生在 HTML 已开始流式输出之后，**HTTP 状态码仍是 200**，Next.js 会注入 `<meta name="robots" content="noindex">` 防止被索引（见 Next 官方 `streaming` 文档的 “Status codes”）。
> 用户看到的是同一套 404 页面，差别只在状态码。若将来需要硬 `404`，按官方建议要把资源存在性校验前移到 `middleware`（Next 16 起更名 `proxy`），代价是 middleware 不再只做语言段校验。

- [ ] 404 页面本身中英双语正常。

---

## 16. 页面级验收清单

- [ ] 12 个路由全部可通过 URL 直接访问，无 hash 路由。
- [ ] 每个页面的 loading / empty / error 三态均已实现。
- [ ] 所有页面文案来自字典，中英文切换后无残留另一种语言。
- [ ] 所有页面在 360px 宽度下无横向滚动条。
- [ ] 语言切换后停留在同一页面、同一位置。
- [ ] Header / Footer 在路由切换时不重新挂载。
- [ ] 需登录页面在未登录时保留 URL 并弹出登录框。
- [ ] 所有表单的错误提示贴在对应字段，而非统一弹窗。
- [ ] 所有金额按语言格式化并启用 `tabular-nums`。
- [ ] 全站出现「演示数据」声明的位置至少包含：首页、关于我们、页脚。
