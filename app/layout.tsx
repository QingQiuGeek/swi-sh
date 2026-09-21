import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Inter, Noto_Sans_SC } from "next/font/google";

import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale } from "@/lib/i18n/config";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Noto Sans SC 的自托管切片数量很多，关闭 preload 避免首屏拉取一堆用不到的字形文件
const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "汽车保险",
  description: "车险产品浏览、在线投保与订单管理（演示数据）",
};

/**
 * 根布局。html lang 需要跟随语言段变化，而根布局拿不到 [locale] 参数，
 * 因此由 middleware 把解析出的语言写到 x-locale 请求头上再在这里读取。
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const headerList = await headers();
  const requested = headerList.get(LOCALE_HEADER);
  const locale = requested && isLocale(requested) ? requested : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoSansSc.variable} ${geistMono.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}