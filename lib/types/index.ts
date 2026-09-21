/** 领域模型。语言无关字段与语言相关字段在 mock JSON 中分开存放，见 docs/prd.md §10.3。 */

import type { Locale } from "@/lib/i18n/config";

/* ---------- 产品 ---------- */

export const PRODUCT_CATEGORIES = [
  "statutory",
  "commercial-package",
  "single",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** 产品标签：法定 / 热销 / 新品 */
export const PRODUCT_BADGES = ["statutory", "hot", "new"] as const;

export type ProductBadge = (typeof PRODUCT_BADGES)[number];

/** 一条服务内容 */
export type ProductCoverage = {
  title: string;
  desc: string;
};

/**
 * 合并 base.json 与语言文件后的产品模型。
 * 语言无关字段（价格、保额、排序等）只存在于 base.json，避免两份语言文件改价不同步。
 */
export type Product = {
  id: string;
  slug: string;
  category: ProductCategory;
  /** 年保费，单位元 */
  price: number;
  /** 保额，单位元；为 null 表示按车辆实际价值承保，改用 coverageText 展示 */
  coverageAmount: number | null;
  /** 保障期限代码，本期固定为 1y */
  period: "1y";
  badge: ProductBadge | null;
  active: boolean;
  sortOrder: number;
  /* 以下字段来自语言文件 */
  name: string;
  tagline: string;
  coverages: ProductCoverage[];
  applicableVehicles: string;
  /** 保额非固定金额时的展示文案，例如「按车辆实际价值」 */
  coverageText: string | null;
};

/** 列表与详情共用的精简结构 */
export type ProductSummary = Pick<
  Product,
  "id" | "slug" | "category" | "name" | "tagline" | "price" | "badge"
>;

/* ---------- 投保指引 ---------- */

export type GuideStep = {
  id: string;
  sortOrder: number;
  title: string;
  desc: string;
  /** 预计耗时，例如「约 5 分钟」 */
  duration: string;
};

export type GuideMaterial = {
  id: string;
  /** 是否必需；说明文字里可补充「续保时必需」这类条件 */
  required: boolean;
  name: string;
  desc: string;
};

export type GuideFaq = {
  id: string;
  question: string;
  answer: string;
};

export type Guide = {
  steps: GuideStep[];
  materials: GuideMaterial[];
  faqs: GuideFaq[];
};

/* ---------- 账户 ---------- */

export type User = {
  id: string;
  username: string;
  email: string;
  /** 密码哈希，任何接口响应都不得返回该字段 */
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

/** 可以安全返回给前端的用户信息 */
export type PublicUser = Pick<
  User,
  "id" | "username" | "email" | "createdAt"
>;

export type Session = {
  id: string;
  userId: string;
  expiresAt: number;
};

/* ---------- 订单 ---------- */

export const ORDER_STATUSES = [
  "PENDING",
  "ACTIVE",
  "CANCELLED",
  "EXPIRED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type InsuredInfo = {
  name: string;
  idNo: string;
  phone: string;
};

export type VehicleInfo = {
  plateNo: string;
  brandModel: string;
  vin: string;
  registerYear: number;
};

export type Order = {
  /** UUID v4，同时作为展示用订单号，不另设 orderNo */
  id: string;
  userId: string;
  productId: string;
  /** 下单时的产品名与价格快照，后续改价不影响历史订单 */
  productSnapshot: { nameZh: string; nameEn: string; price: number };
  insured: InsuredInfo;
  vehicle: VehicleInfo;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  effectiveAt: string | null;
  expireAt: string | null;
};

/** 订单 + 已按当前语言本地化的产品名，直接给 UI 使用 */
export type OrderView = Omit<Order, "productSnapshot"> & {
  productName: string;
};

/** 把订单模型转成带本地化产品名的视图模型 */
export function toOrderView(order: Order, locale: Locale): OrderView {
  const { productSnapshot, ...rest } = order;

  return {
    ...rest,
    productName:
      locale === "en" ? productSnapshot.nameEn : productSnapshot.nameZh,
  };
}