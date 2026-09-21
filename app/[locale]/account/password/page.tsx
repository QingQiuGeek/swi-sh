import type { Metadata } from "next";

import { PasswordForm } from "@/components/forms/password-form";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import { resolveLocaleParam } from "@/lib/i18n/server";
import { readSession } from "@/lib/server/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  return { title: t.account.password.title, description: t.meta.account.description };
}

/** 修改密码：成功后其它设备会话失效，当前会话保留 */
export default async function AccountPasswordPage({
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="type-h1 text-foreground">{t.account.password.title}</h1>
        <p className="type-body-lg text-muted-foreground">
          {t.account.password.subtitle}
        </p>
      </div>

      <Card>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}