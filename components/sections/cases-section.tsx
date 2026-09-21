import { CaseCarousel } from "@/components/blocks/case-carousel";
import { SectionHeading } from "@/components/blocks/section-heading";
import { Container } from "@/components/layout/container";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { CaseView } from "@/lib/types";

/** 首页「投保案例」分区，id 固定为 cases */
export function CasesSection({
  locale,
  cases,
}: {
  locale: Locale;
  cases: CaseView[];
}) {
  const t = getDictionary(locale);

  return (
    <section id="cases" className="scroll-mt-15 lg:scroll-mt-18">
      <Container className="flex flex-col gap-8 py-16 lg:gap-12 lg:py-24">
        <SectionHeading
          eyebrow={t.home.cases.eyebrow}
          title={t.home.cases.title}
          subtitle={t.home.cases.subtitle}
        />

        <CaseCarousel cases={cases} />
      </Container>
    </section>
  );
}