import type { Metadata } from "next";

import { ProfileForm } from "@/components/forms/profile-form";
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

  return { title: t.account.profile.title, description: t.meta.account.description };
}

/** 修改资料：会话用户作为表单初值，保存成功后靠 router.refresh() 同步 Header */
export default async function AccountProfilePage({
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
        <h1 className="type-h1 text-foreground">{t.account.profile.title}</h1>
        <p className="type-body-lg text-muted-foreground">
          {t.account.profile.subtitle}
        </p>
      </div>

      <Card>
        <CardContent>
          <ProfileForm
            username={session.user.username}
            email={session.user.email}
            createdAt={session.user.createdAt}
          />
        </CardContent>
      </Card>
    </div>
  );
}