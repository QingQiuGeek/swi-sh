"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PasswordInput } from "@/components/forms/password-input";
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
import { useT } from "@/lib/i18n/provider";
import type { PublicUser } from "@/lib/types";
import type { ApiCode } from "@/lib/types/api";
import { createLoginSchema, type LoginInput } from "@/lib/validation/auth";

/** 登录表单：邮箱 + 密码 */
export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const [formError, setFormError] = useState<ApiCode | null>(null);

  const schema = useMemo(() => createLoginSchema(t.validation), [t.validation]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const submitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await apiSend<PublicUser>("/api/auth/login", "POST", values);

    if (!result.success) {
      // 无法归属到具体字段的业务码用表单级 Alert 呈现
      setFormError(result.code);
      return;
    }

    toast.success(t.auth.loginSuccess);
    onSuccess();
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(t, formError)}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.email}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t.auth.emailPlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.password}</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="current-password"
                  placeholder={t.auth.passwordPlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          {t.auth.loginSubmit}
        </Button>

        <p className="text-sm text-muted-foreground">{t.auth.demoHint}</p>
      </form>
    </Form>
  );
}