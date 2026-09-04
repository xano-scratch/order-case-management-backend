import { useCallback, useEffect, useState } from "react";
import { Boxes, ChevronRight, Loader2, PackagePlus, Plus, Trash2 } from "lucide-react";

import {
  createOrder,
  listOrders,
  type CreateOrderBody,
  type OrdersBoard,
  type Session,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { formatAmount, formatTime } from "@/lib/format";

type Line = NonNullable<CreateOrderBody["line_items"]>[number];

function blankLine(sku: string): Line {
  return { sku, description: "", quantity: 1, unit_price_cents: 0 };
}

export function OrdersList({
  session,
  reloadKey,
  onOpen,
}: {
  session: Session;
  reloadKey: number;
  onOpen: (orderId: number) => void;
}) {
  const [board, setBoard] = useState<OrdersBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState<number>(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canCreate = session.role === "ops_agent" || session.role === "supervisor";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setBoard(await listOrders());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const customerName = (id: number) => board?.customers.find((c) => c.id === id)?.name ?? `Customer #${id}`;
  const firstSku = board?.inventory[0]?.sku ?? "";

  function openForm() {
    setCustomerId(board?.customers[0]?.id ?? 0);
    setLines([blankLine(firstSku)]);
    setCreateError(null);
    setShowForm(true);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submitOrder() {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createOrder({ customer_id: customerId, line_items: lines });
      setShowForm(false);
      onOpen(created.id);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create the order.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-8">
        <Loader2 className="size-4 animate-spin" /> Loading the board…
      </div>
    );
  }
  if (loadError || !board) {
    return <p className="text-destructive p-8">{loadError ?? "No data."}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Inventory on hand */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Boxes className="size-4" /> Inventory on hand
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {board.inventory.map((s) => (
            <div key={s.id} className="border-border bg-muted/40 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
              <span className="font-mono">{s.sku}</span>
              <span className={s.available_qty < 5 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                {s.available_qty}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* New order */}
      {canCreate && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Orders</CardTitle>
            {!showForm ? (
              <Button size="sm" onClick={openForm}>
                <PackagePlus /> New order
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            )}
          </CardHeader>
          {showForm && (
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="customer">Customer</Label>
                <select
                  id="customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(Number(e.target.value))}
                  className="border-input bg-transparent h-9 rounded-md border px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  {board.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Line items</Label>
                {lines.map((line, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2">
                    <div className="grid gap-1">
                      <span className="text-muted-foreground text-xs">SKU</span>
                      <select
                        value={line.sku}
                        onChange={(e) => updateLine(i, { sku: e.target.value })}
                        className="border-input bg-transparent h-9 rounded-md border px-2 font-mono text-sm outline-none focus-visible:border-ring"
                      >
                        {board.inventory.map((s) => (
                          <option key={s.sku} value={s.sku}>
                            {s.sku}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-muted-foreground text-xs">Description</span>
                      <Input
                        className="w-44"
                        value={line.description}
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                        placeholder="Item name"
                      />
                    </div>
                    <div className="grid gap-1">
                      <span className="text-muted-foreground text-xs">Qty</span>
                      <Input
                        className="w-20"
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="grid gap-1">
                      <span className="text-muted-foreground text-xs">Unit price (cents)</span>
                      <Input
                        className="w-32"
                        type="number"
                        min={0}
                        value={line.unit_price_cents}
                        onChange={(e) => updateLine(i, { unit_price_cents: Number(e.target.value) })}
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={lines.length === 1}
                      aria-label="Remove line"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setLines((prev) => [...prev, blankLine(firstSku)])}>
                  <Plus /> Add line
                </Button>
              </div>

              {createError && (
                <p className="text-destructive text-sm" role="alert">
                  {createError}
                </p>
              )}
              <Button onClick={() => void submitOrder()} disabled={creating || lines.length === 0}>
                {creating ? <Loader2 className="animate-spin" /> : <PackagePlus />}
                Create order
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Orders table */}
      <Card>
        {!canCreate && (
          <CardHeader>
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>
        )}
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Reference</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead className="pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {board.orders.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => onOpen(o.id)}>
                  <TableCell className="pl-6 font-mono font-medium">{o.reference}</TableCell>
                  <TableCell>{customerName(o.customer_id)}</TableCell>
                  <TableCell>
                    <StatusBadge status={String(o.status)} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatAmount(o.total_cents)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTime(o.created_at)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <ChevronRight className="text-muted-foreground inline size-4" />
                  </TableCell>
                </TableRow>
              ))}
              {board.orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
