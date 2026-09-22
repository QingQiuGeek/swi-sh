import Link from "next/link";

import { SectionHeading } from "@/components/blocks/section-heading";
import { StepList } from "@/components/blocks/step-list";
import { Container } from "@/components/layout/container";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { GuideStep } from "@/lib/types";

/** 首页「投保指引」分区，id 固定为 guide */
export function GuideSection({
  locale,
  steps,
}: {
  locale: Locale;
  steps: GuideStep[];
}) {
  const t = getDictionary(locale);

  return (
    <section
      id="guide"
      className="scroll-mt-15 border-t border-border bg-muted lg:scroll-mt-18"
    >
      <Container className="flex flex-col gap-8 py-16 lg:gap-12 lg:py-24">
        <SectionHeading
          eyebrow={t.home.guide.eyebrow}
          title={t.home.guide.title}
          subtitle={t.home.guide.subtitle}
        />

        <StepList steps={steps} />

        <Link
          href={`/${locale}/guide`}
          className="type-body-sm w-fit text-primary underline-offset-4 hover:underline"
        >
          {t.home.guide.cta}
        </Link>
      </Container>
    </section>
  );
}