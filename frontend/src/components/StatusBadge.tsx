import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Ban, CheckCircle2, Inbox, PackageCheck, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/format";

type Variant = "default" | "secondary" | "destructive" | "outline";

const MAP: Record<string, { variant: Variant; className?: string; Icon: LucideIcon }> = {
  received: { variant: "outline", Icon: Inbox },
  validated: { variant: "secondary", Icon: CheckCircle2 },
  allocated: { variant: "default", Icon: PackageCheck },
  fulfilled: { variant: "default", className: "border-transparent bg-emerald-600 text-white", Icon: Truck },
  exception: { variant: "destructive", Icon: AlertTriangle },
  cancelled: { variant: "outline", className: "text-muted-foreground", Icon: Ban },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = MAP[status] ?? { variant: "outline" as Variant, Icon: Inbox };
  const Icon = cfg.Icon;
  return (
    <Badge variant={cfg.variant} className={cn(cfg.className, className)}>
      <Icon />
      {statusLabel(status)}
    </Badge>
  );
}
