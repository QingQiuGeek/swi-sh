"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { useT } from "@/lib/i18n/provider";
import type { PublicUser } from "@/lib/types";
import type { ApiCode } from "@/lib/types/api";
import { createRegisterSchema, type RegisterInput } from "@/lib/validation/auth";

/** 注册表单：用户名 + 邮箱 + 密码；邮箱已被占用时错误贴在邮箱字段 */
export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const [formError, setFormError] = useState<ApiCode | null>(null);

  const schema = useMemo(
    () => createRegisterSchema(t.validation),
    [t.validation],
  );

  const form = useForm<RegisterInput>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const submitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await apiSend<PublicUser>(
      "/api/auth/register",
      "POST",
      values,
    );

    if (!result.success) {
      if (result.code === "EMAIL_TAKEN") {
        form.setError("email", { message: errorMessage(t, result.code) });
        return;
      }

      setFormError(result.code);
      return;
    }

    toast.success(t.auth.registerSuccess);
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.auth.username}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  placeholder={t.auth.usernamePlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          {t.auth.registerSubmit}
        </Button>
      </form>
    </Form>
  );
}