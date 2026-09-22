"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { apiSend } from "@/lib/api-client";
import { errorMessage } from "@/lib/i18n/errors";
import { useI18n } from "@/lib/i18n/provider";
import type { OrderView } from "@/lib/types";
import type { ApiCode } from "@/lib/types/api";
import { createOrderSchema, MIN_REGISTER_YEAR, type OrderInput } from "@/lib/validation/order";

/** 短字段并排成一行：卡片比整页窄，窄屏自动回到单列 */
const SHORT_FIELD_ROW = "grid gap-5 sm:grid-cols-2";

/** 投保表单：被保人信息 + 车辆信息 + 提交。产品与价格由右侧「保险套餐信息」卡承担 */
export function PurchaseForm({ productSlug }: { productSlug: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [formError, setFormError] = useState<ApiCode | null>(null);

  const schema = useMemo(() => createOrderSchema(t.validation), [t.validation]);

  // 注册年份范围 2000 至当前年份，倒序排列
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from(
      { length: currentYear - MIN_REGISTER_YEAR + 1 },
      (_, index) => String(currentYear - index),
    );
  }, []);

  const form = useForm<OrderInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      insured: { name: "", idNo: "", phone: "" },
      vehicle: { plateNo: "", brandModel: "", vin: "", registerYear: "" },
    },
  });

  const submitting = form.formState.isSubmitting;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const result = await apiSend<OrderView>("/api/orders", "POST", {
      productSlug,
      ...values,
    });

    if (!result.success) {
      // VALIDATION_ERROR 与 DUPLICATE_ORDER 都无法归属到单个字段，用表单级 Alert
      setFormError(result.code);
      return;
    }

    toast.success(t.purchase.success);
    router.push(`/${locale}/account/orders/${result.data.id}`);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(t, formError)}</AlertDescription>
          </Alert>
        ) : null}

        <FieldSet>
          <FieldLegend>{t.purchase.insuredLegend}</FieldLegend>
          <FieldGroup>
            <div className={SHORT_FIELD_ROW}>
              <FormField
                control={form.control}
                name="insured.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.purchase.fields.name.label}</FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="name"
                        placeholder={t.purchase.fields.name.placeholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insured.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.purchase.fields.phone.label}</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder={t.purchase.fields.phone.placeholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="insured.idNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.purchase.fields.idNo.label}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.purchase.fields.idNo.placeholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend>{t.purchase.vehicleLegend}</FieldLegend>
          <FieldGroup>
            <div className={SHORT_FIELD_ROW}>
              <FormField
                control={form.control}
                name="vehicle.plateNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.purchase.fields.plateNo.label}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.purchase.fields.plateNo.placeholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle.registerYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.purchase.fields.registerYear.label}
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              t.purchase.fields.registerYear.placeholder
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          {yearOptions.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="vehicle.brandModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.purchase.fields.brandModel.label}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.purchase.fields.brandModel.placeholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicle.vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.purchase.fields.vin.label}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.purchase.fields.vin.placeholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full sm:w-fit sm:self-end"
          disabled={submitting}
        >
          {submitting ? <Spinner data-icon="inline-start" /> : null}
          {submitting ? t.purchase.submitting : t.purchase.submit}
        </Button>
      </form>
    </Form>
  );
}