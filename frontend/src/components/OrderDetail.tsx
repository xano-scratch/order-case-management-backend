import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  ClipboardCheck,
  Circle,
  CircleCheck,
  Clock,
  Loader2,
  Lock,
  PackageCheck,
  ShieldAlert,
  TriangleAlert,
  Truck,
  Undo2,
} from "lucide-react";

import {
  ApiError,
  allocateOrder,
  cancelOrder,
  exceptionOrder,
  fulfillOrder,
  getOrder,
  resolveOrder,
  validateOrder,
  type OrderDetail as OrderDetailData,
  type Session,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAmount, formatTime, LIFECYCLE, statusLabel } from "@/lib/format";

const OPS = ["ops_agent", "supervisor"];
const SUPER = ["supervisor"];

type ActionDef = {
  key: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
  applies: (status: string) => boolean;
  needsReason?: boolean;
  run: (id: number, reason?: string) => Promise<unknown>;
};

const ACTIONS: ActionDef[] = [
  { key: "validate", label: "Validate", icon: ClipboardCheck, roles: OPS, applies: (s) => s === "received", run: (id, r) => validateOrder(id, r) },
  { key: "allocate", label: "Allocate stock", icon: PackageCheck, roles: OPS, applies: (s) => s === "validated", run: (id, r) => allocateOrder(id, r) },
  { key: "fulfill", label: "Mark fulfilled", icon: Truck, roles: OPS, applies: (s) => s === "allocated", run: (id, r) => fulfillOrder(id, r) },
  { key: "exception", label: "Raise exception", icon: TriangleAlert, roles: OPS, applies: (s) => ["received", "validated", "allocated"].includes(s), needsReason: true, run: (id, r) => exceptionOrder(id, r ?? "") },
  { key: "resolve", label: "Resolve exception", icon: Undo2, roles: SUPER, applies: (s) => s === "exception", run: (id, r) => resolveOrder(id, r) },
  { key: "cancel", label: "Cancel order", icon: Ban, roles: SUPER, applies: (s) => !["fulfilled", "cancelled"].includes(s), run: (id, r) => cancelOrder(id, r) },
];

function StateRail({ status, preExceptionStatus }: { status: string; preExceptionStatus: string | null }) {
  const anchor = status === "exception" ? preExceptionStatus ?? "received" : status;
  const reached = LIFECYCLE.indexOf(anchor as (typeof LIFECYCLE)[number]);
  const isDone = status === "fulfilled";

  return (
    <div className="flex flex-wrap items-center gap-1">
      {LIFECYCLE.map((step, i) => {
        const active = i <= reached && reached >= 0;
        const Icon = active || isDone ? CircleCheck : Circle;
        return (
          <div key={step} className="flex items-center gap-1">
            <span className={"flex items-center gap-1 text-sm " + (active ? "text-foreground font-medium" : "text-muted-foreground")}>
              <Icon className={"size-4 " + (active ? "text-emerald-500" : "")} />
              {statusLabel(step)}
            </span>
            {i < LIFECYCLE.length - 1 && <ArrowRight className="text-muted-foreground/50 size-3" />}
          </div>
        );
      })}
      {status === "exception" && (
        <span className="text-destructive ml-2 flex items-center gap-1 text-sm font-medium">
          <TriangleAlert className="size-4" /> On exception hold
        </span>
      )}
      {status === "cancelled" && (
        <span className="text-muted-foreground ml-2 flex items-center gap-1 text-sm font-medium">
          <Ban className="size-4" /> Cancelled
        </span>
      )}
    </div>
  );
}

export function OrderDetail({
  orderId,
  session,
  onBack,
  onChanged,
}: {
  orderId: number;
  session: Session;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ status: number | null; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await getOrder(orderId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load the order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(a: ActionDef) {
    let reason: string | undefined;
    if (a.needsReason) {
      const r = window.prompt(`Reason for putting this order on exception:`);
      if (r === null) return;
      reason = r;
    }
    setBusyKey(a.key);
    setActionError(null);
    try {
      await a.run(orderId, reason);
      await load();
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) setActionError({ status: e.status, message: e.message });
      else setActionError({ status: null, message: e instanceof Error ? e.message : "Action failed." });
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-8">
        <Loader2 className="size-4 animate-spin" /> Loading order…
      </div>
    );
  }
  if (loadError || !data || !data.order) {
    return (
      <div className="space-y-4 p-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <p className="text-destructive">{loadError ?? "Order not found."}</p>
      </div>
    );
  }

  const order = data.order;
  const status = String(order.status);
  const role = session.role ?? "";
  const actorName = (id: number) => data.actors.find((a) => a.id === id)?.name ?? `User #${id}`;
  const stockFor = (sku: string) => data.inventory.find((s) => s.sku === sku)?.available_qty ?? 0;
  const applicable = ACTIONS.filter((a) => a.applies(status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft /> All orders
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-2xl font-semibold">{order.reference}</h2>
            <StatusBadge status={status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {data.customer?.name ?? `Customer #${order.customer_id}`} · Total {formatAmount(order.total_cents)}
          </p>
        </div>
      </div>

      {/* State rail */}
      <Card>
        <CardContent className="py-4">
          <StateRail status={status} preExceptionStatus={order.pre_exception_status ? String(order.pre_exception_status) : null} />
        </CardContent>
      </Card>

      {/* Exception banner */}
      {status === "exception" && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 rounded-lg border p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">On exception hold</p>
            <p className="text-sm">{order.exception_reason ?? "No reason recorded."}</p>
            {order.pre_exception_status && (
              <p className="text-destructive/80 mt-1 text-sm">
                Resolving returns it to {statusLabel(String(order.pre_exception_status))}. Supervisor only.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions — every state-applicable action shows; a lock marks one the API
          will reject for this role, so the 403 comes from the API, not the UI. */}
      {applicable.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {applicable.map((a) => {
                const allowed = a.roles.includes(role);
                const Icon = a.icon;
                return (
                  <Button
                    key={a.key}
                    variant={allowed ? "default" : "outline"}
                    disabled={busyKey !== null}
                    onClick={() => void runAction(a)}
                    title={allowed ? a.label : `Your role (${role}) cannot do this, the API will reject it`}
                    className={allowed ? "" : "text-muted-foreground"}
                  >
                    {busyKey === a.key ? <Loader2 className="animate-spin" /> : allowed ? <Icon /> : <Lock />}
                    {a.label}
                  </Button>
                );
              })}
            </div>
            {actionError && (
              <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-sm" role="alert">
                <span className="font-medium">The API rejected this{actionError.status ? ` (${actionError.status})` : ""}:</span>{" "}
                {actionError.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line items vs stock */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">SKU</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Line total</TableHead>
                <TableHead className="pr-6 text-right">On hand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.line_items.map((l) => {
                const onHand = stockFor(String(l.sku));
                const short = onHand < Number(l.quantity);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="pl-6 font-mono">{l.sku}</TableCell>
                    <TableCell>{l.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(l.unit_price_cents)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(Number(l.quantity) * Number(l.unit_price_cents))}
                    </TableCell>
                    <TableCell className={"pr-6 text-right tabular-nums " + (short ? "text-destructive font-semibold" : "text-muted-foreground")}>
                      {onHand}
                      {short ? " (short)" : ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Allocations */}
      {data.allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reserved stock</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.allocations.map((al) => (
              <div key={al.id} className="border-border bg-muted/40 rounded-md border px-3 py-1.5 text-sm">
                <span className="font-mono">{al.sku}</span> × {al.quantity}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Audit trail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" /> Audit trail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.events.map((ev) => (
            <div key={ev.id} className="flex gap-3">
              <div className="mt-1 flex flex-col items-center">
                <CircleCheck className="text-muted-foreground size-4" />
                <div className="bg-border mt-1 w-px flex-1" />
              </div>
              <div className="space-y-1 pb-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {ev.from_status ? (
                    <>
                      <span className="text-muted-foreground">{statusLabel(String(ev.from_status))}</span>
                      <ArrowRight className="text-muted-foreground size-3" />
                    </>
                  ) : (
                    <span className="text-muted-foreground">opened</span>
                  )}
                  <span className="font-medium">{statusLabel(String(ev.to_status))}</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {actorName(Number(ev.actor_user_id))} · {formatTime(ev.created_at)}
                </p>
                {ev.reason && <p className="text-sm">{ev.reason}</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
