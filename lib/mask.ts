/** 证件号 / 手机号 / 车架号脱敏：只保留首尾，中间用 * 填充 */

export function maskIdNo(value: string): string {
  if (value.length <= 6) {
    return value;
  }

  const head = value.slice(0, 3);
  const tail = value.slice(-3);

  return `${head}${"*".repeat(value.length - 6)}${tail}`;
}

export function maskPhone(value: string): string {
  if (value.length <= 4) {
    return value;
  }

  return `${value.slice(0, 3)}${"*".repeat(value.length - 4)}${value.slice(-1)}`;
}

export function maskVin(value: string): string {
  if (value.length <= 6) {
    return value;
  }

  return `${value.slice(0, 5)}${"*".repeat(value.length - 6)}${value.slice(-1)}`;
}