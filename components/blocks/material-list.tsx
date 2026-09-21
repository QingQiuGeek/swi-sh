import { FileTextIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { GuideMaterial } from "@/lib/types";

/** 所需材料清单：材料名 + 说明 + 是否必需（颜色 + 文字双通道） */
export function MaterialList({
  materials,
  requiredLabel,
  optionalLabel,
}: {
  materials: GuideMaterial[];
  requiredLabel: string;
  optionalLabel: string;
}) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {materials.map((material) => (
        <li
          key={material.id}
          className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
        >
          <FileTextIcon
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-primary"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="type-card-title text-foreground">{material.name}</p>
              <Badge variant={material.required ? "default" : "outline"}>
                {material.required ? requiredLabel : optionalLabel}
              </Badge>
            </div>
            <p className="type-body-sm text-muted-foreground">{material.desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}