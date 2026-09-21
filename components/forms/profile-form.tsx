"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { formatDate } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/provider";
import type { PublicUser } from "@/lib/types";
import type { ApiCode } from "@/lib/types/api";
import { createProfileSchema, type ProfileInput } from "@/lib/validation/auth";

/**
 * 修改资料：用户名与邮箱均可改。
 * 邮箱被占用（EMAIL_TAKEN）是唯一能定位到字段的业务码，贴到邮箱下方；
 * 其余业务码无法归属到单个字段，用表单级 Alert。
 */
export function ProfileForm({
  username,
  email,
  createdAt,
}: {
  username: string;
  email: string;
  createdAt: string;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [formError, setFormError] = useState<ApiCode | null>(null);

  const schema = useMemo(
    () => createProfileSchema(t.validation),
    [t.validation],
  );

  const form = useForm<ProfileInput>({
    resolver: zodResolver(schema),
    defaultValues: { username, email },
  });

  const submitting = form.formState.isSubmitting;
  // 两个字段都没改动时不允许提交，避免无意义的接口调用
  const disabled = submitting || !form.formState.isDirty;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await apiSend<PublicUser>("/api/auth/profile", "PATCH", values);

    if (!result.success) {
      if (result.code === "EMAIL_TAKEN") {
        form.setError("email", {
          type: "server",
          message: errorMessage(t, result.code),
        });
        return;
      }

      setFormError(result.code);
      return;
    }

    toast.success(t.account.profile.saved);
    // 重置为当前提交值，让「未改动」状态与保存按钮的禁用逻辑回到初始
    form.reset(values);
    router.refresh();
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.account.profile.username}</FormLabel>
              <FormControl>
                <Input autoComplete="username" {...field} />
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
              <FormLabel>{t.account.profile.email}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 注册时间只读展示，不属于表单字段，因此不套 FormField */}
        <Field>
          <FieldLabel htmlFor="profile-created-at">
            {t.account.profile.createdAt}
          </FieldLabel>
          <Input
            id="profile-created-at"
            value={formatDate(createdAt, locale)}
            readOnly
            disabled
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full sm:w-fit sm:self-start"
          disabled={disabled}
        >
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          {submitting ? t.account.profile.saving : t.account.profile.save}
        </Button>
      </form>
    </Form>
  );
}