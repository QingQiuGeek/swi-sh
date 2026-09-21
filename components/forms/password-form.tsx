"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { apiSend } from "@/lib/api-client";
import { errorMessage } from "@/lib/i18n/errors";
import { useI18n } from "@/lib/i18n/provider";
import type { ApiCode } from "@/lib/types/api";
import {
  createPasswordFormSchema,
  type PasswordFormInput,
} from "@/lib/validation/auth";

/** 能唯一归属到字段的业务码；其余走表单级 Alert */
const FIELD_BY_CODE: Partial<
  Record<ApiCode, FieldPath<PasswordFormInput>>
> = {
  TOO_WEAK: "newPassword",
  SAME_PASSWORD: "newPassword",
  INVALID_PASSWORD: "currentPassword",
};

/**
 * 修改密码：确认密码只在前端校验（接口不接收该字段），
 * 两次输入不一致由 zod 拦下，错误贴到确认字段且不发请求。
 */
export function PasswordForm() {
  const { t } = useI18n();
  const [formError, setFormError] = useState<ApiCode | null>(null);

  const schema = useMemo(
    () => createPasswordFormSchema(t.validation),
    [t.validation],
  );

  const form = useForm<PasswordFormInput>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const submitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    // 确认密码不发给服务端
    const result = await apiSend<{ updated: boolean }>("/api/auth/password", "POST", {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });

    if (!result.success) {
      const target = FIELD_BY_CODE[result.code];

      if (target) {
        form.setError(target, {
          type: "server",
          message: errorMessage(t, result.code),
        });
        return;
      }

      setFormError(result.code);
      return;
    }

    toast.success(t.account.password.changed);
    form.reset();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(t, formError)}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.account.password.current}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.account.password.new}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t.auth.passwordPlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.account.password.confirm}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full sm:w-fit sm:self-start"
          disabled={submitting}
        >
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          {submitting ? t.account.password.submitting : t.account.password.submit}
        </Button>
      </form>
    </Form>
  );
}