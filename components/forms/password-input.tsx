"use client";

import { useState, type ComponentProps } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useT } from "@/lib/i18n/provider";

export type PasswordInputProps = Omit<
  ComponentProps<typeof InputGroupInput>,
  "type"
> & {
  /** FormControl 会透传自己的 data-slot，这里收下后改挂到外层分组上 */
  "data-slot"?: string;
};

/**
 * 密码输入框：右侧「小眼睛」切换明文 / 密文。
 * 明文中显示带斜线的眼睛，并且读屏文案随之切换，键盘（Enter / 空格）也能触发。
 */
export function PasswordInput({
  className,
  "data-slot": dataSlot,
  ...props
}: PasswordInputProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);

  return (
    // data-slot 必须挂在分组上：盖到输入框上会让 InputGroup 的
    // 「聚焦 / 报错时给整组描边」选择器失配，输入框就没了焦点环。
    <InputGroup data-slot={dataSlot} className={className}>
      <InputGroupInput {...props} type={visible ? "text" : "password"} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
          <span className="sr-only">
            {visible ? t.auth.hidePassword : t.auth.showPassword}
          </span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}