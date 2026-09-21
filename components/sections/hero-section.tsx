import Link from "next/link";

import { Price } from "@/components/blocks/price";
import { Container } from "@/components/layout/container";
import { SectionCta } from "@/components/sections/section-cta";
import { Card, CardContent } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

/**
 * 首页 Hero。分区 id 固定为 home。
 * 左文右价：价格与保额是本站的差异化点，因此在首屏就给出最低年保费。
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
    <section id="home" className="scroll-mt-15 lg:scroll-mt-18">
      <Container className="grid gap-12 pt-12 pb-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-16 lg:pt-30 lg:pb-24">
        <div className="flex flex-col gap-6">
          <p className="type-eyebrow text-muted-foreground">
            {t.home.hero.eyebrow}
          </p>

          <h1 className="type-display text-balance text-foreground">
            {t.home.hero.titleLine1}
            <span className="block text-primary">
              {t.home.hero.titleLine2}
            </span>
          </h1>

          <p className="type-body-lg max-w-2xl text-muted-foreground">
            {t.home.hero.subtitle}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SectionCta
              sectionId="products"
              label={t.home.hero.ctaBrowse}
              className="h-11 w-full sm:w-auto"
            />
            <SectionCta
              sectionId="guide"
              label={t.home.hero.ctaGuide}
              variant="outline"
              className="h-11 w-full sm:w-auto"
            />
          </div>
        </div>

        <Card className="order-first lg:order-none">
          <CardContent className="flex flex-col gap-3">
            <p className="type-body-sm text-muted-foreground">
              {t.home.hero.priceLabel}
            </p>
            <Price value={lowestPrice} size="lg" showPeriod />
            <Link
              href={`/${locale}/products`}
              className="type-body-sm w-fit text-primary underline-offset-4 hover:underline"
            >
              {t.common.viewAllProducts}
            </Link>
          </CardContent>
        </Card>
      </Container>
    </section>
  );
}