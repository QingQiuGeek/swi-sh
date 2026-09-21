"use client";

import Image from "next/image";
import { MailIcon, PhoneIcon } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/i18n/provider";

/** 二维码原图压缩后为 640×539，展示时按同一比例传宽高，避免布局抖动 */
const QR_ASPECT = 539 / 640;

/**
 * 联系方式：客服电话、客服邮箱、微信二维码、服务时间。
 * 悬浮工具轨的悬停提示框与在线客服弹窗共用这一份，避免两处各写一遍。
 */
export function ContactChannels({ qrWidth = 160 }: { qrWidth?: number }) {
  const t = useT();

  const channels = [
    {
      icon: PhoneIcon,
      label: t.about.contactPhone,
      value: t.footer.phone,
      href: `tel:${t.footer.phone}`,
    },
    {
      icon: MailIcon,
      label: t.about.contactEmail,
      value: t.footer.email,
      href: `mailto:${t.footer.email}`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="flex flex-col gap-3">
        {channels.map((channel) => (
          <div key={channel.href} className="flex items-start gap-2.5">
            <channel.icon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-primary"
            />
            <div className="flex flex-col gap-0.5">
              <dt className="type-body-sm text-muted-foreground">
                {channel.label}
              </dt>
              <dd>
                <a
                  href={channel.href}
                  className="type-body text-foreground tabular-nums underline-offset-4 hover:underline"
                >
                  {channel.value}
                </a>
              </dd>
            </div>
          </div>
        ))}
      </dl>

      <Separator />

      <div className="flex flex-col items-center gap-2">
        <Image
          src="/wx.jpg"
          alt={t.tools.wechatHint}
          width={qrWidth}
          height={Math.round(qrWidth * QR_ASPECT)}
          className="rounded-md border border-border"
        />
        <p className="type-body-sm font-medium text-foreground">
          {t.tools.wechat}
        </p>
        <p className="type-body-sm text-center text-muted-foreground">
          {t.tools.wechatHint}
        </p>
      </div>

      <p className="type-caption text-muted-foreground">
        {t.about.serviceHours}
      </p>
    </div>
  );
}