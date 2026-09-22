import Link from "next/link";

import { Price } from "@/components/blocks/price";
import { Container } from "@/components/layout/container";
import { HeroMedia } from "@/components/sections/hero-media";
import { SectionCta } from "@/components/sections/section-cta";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

/**
 * 首页 Hero。分区 id 固定为 home。
 * 左文右价：价格与保额是本站的差异化点，因此在首屏就给出最低年保费。
 *
 * 首屏铺满 `hall.mp4` 背景视频（HeroMedia），因此这一屏是深底色：
 * 文字反白、CTA 反向配色（实心白底 + 白描边），与页面其余浅色分区形成首屏锚点。
 */
export function HeroSection({
  locale,
  lowestPrice,
}: {
  locale: Locale;
  lowestPrice: number;
}) {
  const t = getDictionary(locale);

  return (
    <section
      id="home"
      className="relative isolate scroll-mt-15 overflow-hidden bg-primary text-primary-foreground lg:scroll-mt-18"
    >
      <HeroMedia />

      <Container className="relative z-10 grid min-h-[calc(100svh-60px)] content-center gap-12 py-16 lg:min-h-[calc(100svh-72px)] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-16 lg:py-24">
        <div className="flex flex-col gap-6">
          <p className="type-eyebrow text-primary-foreground">
            {t.home.hero.eyebrow}
          </p>

          <h1 className="type-display text-balance">
            <span className="block text-primary-foreground/92">
              {t.home.hero.titleLine1}
            </span>
            <span className="block text-primary-foreground">
              {t.home.hero.titleLine2}
            </span>
          </h1>

          <p className="type-body-lg max-w-2xl text-primary-foreground/95">
            {t.home.hero.subtitle}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SectionCta
              sectionId="products"
              label={t.home.hero.ctaBrowse}
              variant="inverse"
              className="h-11 w-full sm:w-auto"
            />
            <SectionCta
              sectionId="guide"
              label={t.home.hero.ctaGuide}
              variant="outline-inverse"
              className="h-11 w-full sm:w-auto"
            />
          </div>
        </div>

        {/* 深底上的价格面板：整块实心深蓝（同色系、无边框），像视频上的一层「画布」，
            而不是一块跳出来的白卡。注意不能用 backdrop-blur（avoid.md §1 禁止磨砂玻璃）。 */}
        <Card className="order-first items-start border-transparent bg-primary/88 text-primary-foreground shadow-none lg:order-none">
          <CardContent className="flex flex-col gap-3">
            <p className="type-body-sm text-primary-foreground/80">
              {t.home.hero.priceLabel}
            </p>
            <Price value={lowestPrice} size="lg" showPeriod tone="inverted" />
            <Link
              href={`/${locale}/products`}
              className="type-body-sm w-fit text-primary-foreground/85 underline-offset-4 hover:text-primary-foreground hover:underline"
            >
              {t.common.viewAllProducts}
            </Link>
          </CardContent>
        </Card>
      </Container>
    </section>
  );
}