import type { Metadata } from "next";

import { DemoNotice } from "@/components/blocks/demo-notice";
import { Container } from "@/components/layout/container";
import { FloatingTools } from "@/components/layout/floating-tools";
import { ScrollRail } from "@/components/layout/scroll-rail";
import { AboutSection } from "@/components/sections/about-section";
import { CasesSection } from "@/components/sections/cases-section";
import { CtaSection } from "@/components/sections/cta-section";
import { FaqSection } from "@/components/sections/faq-section";
import { GuideSection } from "@/components/sections/guide-section";
import { HeroSection } from "@/components/sections/hero-section";
import { ProductsSection } from "@/components/sections/products-section";
import { getDictionary } from "@/lib/i18n";
import { buildAlternates, resolveLocaleParam } from "@/lib/i18n/server";
import { getCases } from "@/lib/server/cases";
import { getGuide } from "@/lib/server/guide";
import { getProducts } from "@/lib/server/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam((await params).locale);
  const t = getDictionary(locale);

  return {
    title: t.meta.home.title,
    description: t.meta.home.description,
    alternates: buildAlternates(locale),
  };
}

/** 首页：五个分区垂直排列，顺序与 Header Tab 严格一致 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocaleParam((await params).locale);
  const products = getProducts(locale);
  const guide = getGuide(locale);
  const cases = getCases(locale);

  // Hero 的价格行取最低年保费，避免与产品数据各写一份
  const lowestPrice = Math.min(...products.map((product) => product.price));

  return (
    <>
      <ScrollRail />
      <FloatingTools />
      <HeroSection locale={locale} lowestPrice={lowestPrice} />
      <ProductsSection locale={locale} products={products} />
      <GuideSection locale={locale} steps={guide.steps} />
      <CasesSection locale={locale} cases={cases} />
      <AboutSection locale={locale} />
      <CtaSection locale={locale} />
      <FaqSection locale={locale} faqs={guide.faqs} />
      <Container className="pb-16">
        <DemoNotice />
      </Container>
    </>
  );
}