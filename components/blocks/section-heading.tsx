import { cn } from "cn";

/**
 * 分区抬头模版：眉标 + 大标题（可选第二段换色）+ 副标题。
 * 首页五个分区与各内容页共用同一套模版，保证看起来像一套系统。
 * 文案由调用方传入（已本地化），组件本身不查字典。
 */
export function SectionHeading({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  as: Heading = "h2",
  className,
}: {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="flex items-center gap-2.5 type-eyebrow text-highlight">
        <span aria-hidden="true" className="h-0.5 w-7 shrink-0 bg-current" />
        {eyebrow}
      </p>
      <Heading
        className={cn(
          "text-balance text-primary",
          Heading === "h1" ? "type-h1" : "type-h2",
        )}
      >
        {title}
        {titleAccent ? (
          <span className="block text-highlight">{titleAccent}</span>
        ) : null}
      </Heading>
      {subtitle ? (
        <p className="type-body-lg max-w-2xl text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}