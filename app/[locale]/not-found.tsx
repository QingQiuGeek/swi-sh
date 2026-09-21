import { headers } from "next/headers";
import Link from "next/link";
import { CompassIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getDictionary } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale } from "@/lib/i18n/config";

/**
 * 404 页面。语言段非法（如 /fr）时 [locale]/layout.tsx 会调用 notFound()，
 * 此时 URL 里的语言段不可信，改用 middleware 写入的 x-locale 请求头判定语言。
 */
export default async function NotFound() {
  const headerList = await headers();
  const requested = headerList.get(LOCALE_HEADER);
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  const t = getDictionary(locale);

  return (
    <Container className="py-16 lg:py-24">
      <Empty className="min-h-[50vh]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CompassIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{t.notFound.title}</EmptyTitle>
          <EmptyDescription>{t.notFound.desc}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={`/${locale}`}>{t.common.backHome}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/${locale}/products`}>{t.notFound.browse}</Link>
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </Container>
  );
}