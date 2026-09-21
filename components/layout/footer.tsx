import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

/** 二维码原图压缩后为 640×539，按同一比例传宽高，避免布局抖动 */
const QR_WIDTH = 112;
const QR_HEIGHT = Math.round(QR_WIDTH * (539 / 640));

/** 页脚：深蓝底反白，四栏 + 底部条（备案号 / 版权 / 演示数据声明） */
export function Footer({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  const navLinks = [
    { href: `/${locale}`, label: t.nav.home },
    { href: `/${locale}/products`, label: t.nav.products },
    { href: `/${locale}/guide`, label: t.nav.guide },
    { href: `/${locale}/about`, label: t.nav.about },
  ];

  const contacts = [
    { label: t.about.contactAddress, value: t.footer.address },
    {
      label: t.about.contactPhone,
      value: t.footer.phone,
      href: `tel:${t.footer.phone}`,
    },
    {
      label: t.about.contactEmail,
      value: t.footer.email,
      href: `mailto:${t.footer.email}`,
    },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <Container className="pt-16 pb-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <p className="font-heading text-base font-semibold">
              {t.common.brand}
            </p>
            <p className="text-sm leading-relaxed text-primary-foreground/70">
              {t.footer.tagline}
            </p>
          </div>

          <nav aria-label={t.footer.navTitle} className="flex flex-col gap-3">
            <p className="text-sm font-semibold">{t.footer.navTitle}</p>
            <ul className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 transition-colors duration-150 hover:text-primary-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">{t.footer.contactTitle}</p>
            <dl className="flex flex-col gap-2">
              {contacts.map((contact) => (
                <div key={contact.label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-primary-foreground/60">
                    {contact.label}
                  </dt>
                  <dd className="text-sm text-primary-foreground/80">
                    {contact.href ? (
                      <a
                        href={contact.href}
                        className="tabular-nums underline-offset-4 transition-colors duration-150 hover:text-primary-foreground hover:underline"
                      >
                        {contact.value}
                      </a>
                    ) : (
                      contact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold">{t.tools.wechat}</p>
            <Image
              src="/wx.jpg"
              alt={t.tools.wechatHint}
              width={QR_WIDTH}
              height={QR_HEIGHT}
              className="rounded-md border border-primary-foreground/20"
            />
            <p className="text-xs leading-relaxed text-primary-foreground/60">
              {t.tools.wechatHint}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-primary-foreground/20 pt-6 text-xs text-primary-foreground/60 md:flex-row md:items-center md:justify-between">
          <p>{t.footer.copyright}</p>
          <p>{t.footer.icp}</p>
          <p>{t.footer.demoNotice}</p>
        </div>
      </Container>
    </footer>
  );
}