import { Container } from "@/components/layout/container";
import { SectionCta } from "@/components/sections/section-cta";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

/**
 * 首页「立即投保」通栏：整幅深蓝底 + 反白文案 + 实心按钮，放在「关于我们」与「常见问题」之间。
 *
 * 刻意不带 section id —— 与「常见问题」栏一样不参与分区导航，
 * Header Tab / 左侧指示轨仍只有 section-nav 里的五个分区；按钮滚到「保险产品」分区。
 */
export function CtaSection({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <section className="bg-primary text-primary-foreground">
      <Container className="flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-12">
        <div className="flex flex-col gap-2">
          <p className="type-h2 text-balance">{t.home.ctaBanner.title}</p>
          <p className="type-body-sm text-primary-foreground/80">
            {t.home.ctaBanner.subtitle}
          </p>
        </div>

        <SectionCta
          sectionId="products"
          label={t.home.ctaBanner.button}
          variant="inverse"
          className="h-11 w-fit shrink-0"
        />
      </Container>
    </section>
  );
}