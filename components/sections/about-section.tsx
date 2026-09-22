import Link from "next/link";

import { SectionHeading } from "@/components/blocks/section-heading";
import { StatBlock } from "@/components/blocks/stat-block";
import { Container } from "@/components/layout/container";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

/** 首页「关于我们」分区，id 固定为 about */
export function AboutSection({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  const stats = [
    t.about.stats.drivers,
    t.about.stats.partners,
    t.about.stats.claimTime,
    t.about.stats.founded,
  ];

  return (
    <section
      id="about"
      className="scroll-mt-15 border-t border-border bg-highlight-soft lg:scroll-mt-18"
    >
      <Container className="flex flex-col gap-8 py-16 lg:gap-12 lg:py-24">
        <SectionHeading
          eyebrow={t.home.about.eyebrow}
          title={t.home.about.title}
          subtitle={t.home.about.subtitle}
        />

        <p className="type-body max-w-3xl text-muted-foreground">
          {t.about.paragraphs[0]}
        </p>

        <StatBlock
          items={stats}
          className="[&>div]:border-highlight/25"
        />

        <Link
          href={`/${locale}/about`}
          className="type-body-sm w-fit text-primary underline-offset-4 hover:underline"
        >
          {t.home.about.cta}
        </Link>
      </Container>
    </section>
  );
}