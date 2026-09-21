import type { Metadata } from "next";
import Link from "next/link";

import { DemoNotice } from "@/components/blocks/demo-notice";
import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { MaterialList } from "@/components/blocks/material-list";
import { SectionHeading } from "@/components/blocks/section-heading";
import { StepList } from "@/components/blocks/step-list";
import { Container } from "@/components/layout/container";
import { getDictionary } from "@/lib/i18n";
import { buildAlternates, resolveLocaleParam } from "@/lib/i18n/server";
import { getGuide } from "@/lib/server/guide";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  return {
    title: t.meta.guide.title,
    description: t.meta.guide.description,
    alternates: buildAlternates(locale, "/guide"),
  };
}

/** 投保指引：流程 / 材料 / 常见问题三分区，内容全部来自 mock JSON */
export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);
  const guide = getGuide(locale);

  return (
    <Container className="flex flex-col gap-14 py-12 lg:gap-16 lg:py-16">
      <SectionHeading
        as="h1"
        eyebrow={t.nav.guide}
        title={t.guide.title}
        subtitle={t.guide.subtitle}
      />

      {/* 内容型页面：分区为空时整块隐藏，不显示空状态 */}
      {guide.steps.length > 0 ? (
        <section className="flex flex-col gap-6">
          <h2 className="type-h3 text-foreground">{t.guide.stepsTitle}</h2>
          <StepList steps={guide.steps} />
        </section>
      ) : null}

      {guide.materials.length > 0 ? (
        <section className="flex flex-col gap-6">
          <h2 className="type-h3 text-foreground">{t.guide.materialsTitle}</h2>
          <MaterialList
            materials={guide.materials}
            requiredLabel={t.common.required}
            optionalLabel={t.common.optional}
          />
        </section>
      ) : null}

      {guide.faqs.length > 0 ? (
        <section className="flex flex-col gap-6">
          <h2 className="type-h3 text-foreground">{t.guide.faqsTitle}</h2>
          <FaqAccordion faqs={guide.faqs} />
        </section>
      ) : null}

      <div className="flex flex-col gap-8">
        <Link
          href={`/${locale}/products`}
          className="type-body-sm w-fit text-primary underline-offset-4 hover:underline"
        >
          {t.guide.cta}
        </Link>
        <DemoNotice />
      </div>
    </Container>
  );
}