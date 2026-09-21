import type { Metadata } from "next";
import { InfoIcon } from "lucide-react";

import { DemoNotice } from "@/components/blocks/demo-notice";
import { ContactBlock } from "@/components/blocks/contact-block";
import { SectionHeading } from "@/components/blocks/section-heading";
import { StatBlock } from "@/components/blocks/stat-block";
import { Container } from "@/components/layout/container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDictionary } from "@/lib/i18n";
import { buildAlternates, resolveLocaleParam } from "@/lib/i18n/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  return {
    title: t.meta.about.title,
    description: t.meta.about.description,
    alternates: buildAlternates(locale, "/about"),
  };
}

/** 关于我们：公司介绍 + 核心数据 + 联系方式，全部为演示占位内容 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  const stats = [
    t.about.stats.drivers,
    t.about.stats.partners,
    t.about.stats.claimTime,
    t.about.stats.founded,
  ];

  const contacts = [
    { label: t.about.contactAddress, value: t.footer.address },
    { label: t.about.contactPhone, value: t.footer.phone },
    { label: t.about.contactEmail, value: t.footer.email },
  ];

  return (
    <Container className="flex flex-col gap-14 py-12 lg:gap-16 lg:py-16">
      <SectionHeading
        as="h1"
        eyebrow={t.nav.about}
        title={t.about.title}
        subtitle={t.about.subtitle}
      />

      <div className="flex max-w-3xl flex-col gap-5">
        {t.about.paragraphs.map((paragraph) => (
          <p key={paragraph} className="type-body text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </div>

      <section className="flex flex-col gap-6">
        <h2 className="type-h3 text-foreground">{t.about.statsTitle}</h2>
        <StatBlock items={stats} />
      </section>

      {/* ContactBlock 自带卡片标题「联系方式」，这里不再套一层同名分区标题 */}
      <section className="flex flex-col gap-6">
        <ContactBlock
          title={t.about.contactTitle}
          items={contacts}
          note={t.about.serviceHours}
        />
      </section>

      <div className="flex flex-col gap-4">
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertTitle>{t.about.disclaimerTitle}</AlertTitle>
          <AlertDescription>{t.about.disclaimer}</AlertDescription>
        </Alert>
        <DemoNotice />
      </div>
    </Container>
  );
}