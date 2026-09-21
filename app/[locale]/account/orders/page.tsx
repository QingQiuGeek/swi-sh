import type { Metadata } from "next";

import { OrderList } from "@/components/blocks/order-list";
import { getDictionary } from "@/lib/i18n";
import { resolveLocaleParam } from "@/lib/i18n/server";
import { readSession } from "@/lib/server/auth";
import { listOrdersByUser } from "@/lib/server/orders";
import { toOrderView } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  return { title: t.account.orders.title, description: t.meta.account.description };
}

/** 我的订单：筛选是页内状态（client），数据在服务端取好一次传下去 */
export default async function AccountOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);
  const session = await readSession();

  if (!session) {
    return null;
  }

  const orders = (await listOrdersByUser(session.user.id)).map((order) =>
    toOrderView(order, locale),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="type-h1 text-foreground">{t.account.orders.title}</h1>
        <p className="type-body-lg text-muted-foreground">
          {t.account.orders.subtitle.replace("{count}", String(orders.length))}
        </p>
      </div>

      <OrderList orders={orders} />
    </div>
  );
}