import { z } from "zod";

import type { ValidationMessages } from "./messages";

/** 姓名 2–20 字符，允许中英文与空格 */
const NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z ]{2,20}$/;

/** 15 位，或 18 位且末位可为 X（大小写均可） */
const ID_NO_PATTERN = /^(\d{15}|\d{17}[\dXx])$/;

/** 11 位数字，以 1 开头 */
const PHONE_PATTERN = /^1\d{10}$/;

/** 车牌 2–8 位，允许中文、大写字母与数字 */
const PLATE_PATTERN = /^[\u4e00-\u9fa5A-Z0-9]{2,8}$/;

/** VIN 17 位，字母与数字，且不含 I、O、Q */
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export const MIN_REGISTER_YEAR = 2000;

/**
 * 投保表单校验规则。权威定义见 docs/page-specs.md §6.2，
 * 前端表单与服务端接口共用同一份，不写两遍。
 */
export function createOrderSchema(m: ValidationMessages) {
  const maxRegisterYear = new Date().getFullYear();

  return z.object({
    insured: z.object({
      name: z.string().trim().regex(NAME_PATTERN, m.insuredName),
      idNo: z.string().trim().regex(ID_NO_PATTERN, m.insuredIdNo),
      phone: z.string().trim().regex(PHONE_PATTERN, m.insuredPhone),
    }),
    vehicle: z.object({
      plateNo: z.string().trim().regex(PLATE_PATTERN, m.plateNo),
      brandModel: z
        .string()
        .trim()
        .min(2, m.brandModel)
        .max(40, m.brandModel),
      vin: z.string().trim().toUpperCase().regex(VIN_PATTERN, m.vin),
      registerYear: z.string().refine((value) => {
        const year = Number(value);

        return (
          Number.isInteger(year) &&
          year >= MIN_REGISTER_YEAR &&
          year <= maxRegisterYear
        );
      }, m.registerYear),
    }),
  });
}

export type OrderInput = z.infer<ReturnType<typeof createOrderSchema>>;