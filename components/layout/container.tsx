import { cn } from "cn";

/** 统一的内容容器：1200px 上限 + 响应式左右内边距（移动 20 / 平板 32 / 桌面 40） */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1200px] px-5 md:px-8 lg:px-10", className)}
      {...props}
    />
  );
}