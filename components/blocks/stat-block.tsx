import { cn } from "cn";

/** 核心数据块：桌面 4 列 / 平板 2 列 / 移动 1 列 */
export function StatBlock({
  items,
  className,
}: {
  items: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 border-l border-border pl-4"
        >
          <dt className="type-body-sm text-muted-foreground">{item.label}</dt>
          <dd className="type-h2 tabular-nums text-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 统计卡的紧凑形态，用于个人中心 */
export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <p className="type-body-sm text-muted-foreground">{label}</p>
      <p className="type-h3 tabular-nums text-foreground">{value}</p>
    </div>
  );
}