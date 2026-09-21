import { fail, ok } from "@/lib/server/api-response";
import { getProductBySlug } from "@/lib/server/products";
import { resolveRequestLocale } from "@/lib/server/request-locale";

/** 产品详情；不存在或已下架统一返回 NOT_FOUND */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const product = getProductBySlug(slug, resolveRequestLocale(request));

  if (!product) {
    return fail("NOT_FOUND");
  }

  return ok(product);
}