import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ICONS = [MapPinIcon, PhoneIcon, MailIcon];

/** 联系方式块：地址 / 电话 / 邮箱 */
export function ContactBlock({
  title,
  items,
  note,
}: {
  title: string;
  items: { label: string; value: string }[];
  note?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="type-h3">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="flex flex-col gap-4">
          {items.map((item, index) => {
            const Icon = ICONS[index] ?? MapPinIcon;

            return (
              <div key={item.label} className="flex items-start gap-3">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary"
                />
                <div className="flex flex-col gap-0.5">
                  <dt className="type-body-sm text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="type-body text-foreground">{item.value}</dd>
                </div>
              </div>
            );
          })}
        </dl>
        {note ? (
          <p className="type-body-sm text-muted-foreground">{note}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}