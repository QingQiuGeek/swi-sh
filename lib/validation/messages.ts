/**
 * 字段级校验文案。前端表单传字典文案，服务端传稳定错误码（服务端不关心给人看的文案）。
 * 键名与字典的 validation 命名空间一一对应，结构由 typescript 保证一致。
 */
export type ValidationMessages = {
  required: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  currentPassword: string;
  insuredName: string;
  insuredIdNo: string;
  insuredPhone: string;
  plateNo: string;
  brandModel: string;
  vin: string;
  registerYear: string;
};

/** 服务端版本：值是稳定错误码，便于日志检索与 grep */
export const FIELD_MESSAGE_CODES: ValidationMessages = {
  required: "REQUIRED",
  username: "USERNAME_INVALID",
  email: "EMAIL_INVALID",
  password: "PASSWORD_TOO_WEAK",
  confirmPassword: "CONFIRM_MISMATCH",
  currentPassword: "REQUIRED",
  insuredName: "INSURED_NAME_INVALID",
  insuredIdNo: "INSURED_ID_NO_INVALID",
  insuredPhone: "INSURED_PHONE_INVALID",
  plateNo: "PLATE_NO_INVALID",
  brandModel: "BRAND_MODEL_INVALID",
  vin: "VIN_INVALID",
  registerYear: "REGISTER_YEAR_INVALID",
};