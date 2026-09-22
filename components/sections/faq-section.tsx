import { FaqAccordion } from "@/components/blocks/faq-accordion";
import { SectionHeading } from "@/components/blocks/section-heading";
import { Container } from "@/components/layout/container";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { GuideFaq } from "@/lib/types";

/**
 * 首页「常见问题」分区：内容复用投保指引的常见问题，放在页面最下面一栏。
 *
 * 刻意不带 section id —— Header Tab / 左侧指示轨只认 section-nav 里的五个分区，
 * 这一栏不参与分区导航，但抬头仍走 SectionHeading，与其它分区保持同一套版式。
 */
export function FaqSection({
  locale,
  faqs,
}: {
  locale: Locale;
  faqs: GuideFaq[];
}) {
  const t = getDictionary(locale);

  if (faqs.length === 0) {
    return null;
  }

  return (
    <section>
      <Container className="flex flex-col gap-8 py-16 lg:gap-12 lg:py-24">
        <SectionHeading
          eyebrow={t.home.faq.eyebrow}
          title={t.home.faq.title}
          subtitle={t.home.faq.subtitle}
        />

        <FaqAccordion faqs={faqs} />
      </Container>
    </section>
  );
}