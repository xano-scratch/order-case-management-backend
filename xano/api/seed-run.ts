import { query, s, ref, c } from "@xanots/sdk";
import { seedGroup } from "./groups.js";
import { orders } from "../tables/orders.js";
import { lineItems } from "../tables/line-items.js";
import { inventory } from "../tables/inventory.js";
import { allocations } from "../tables/allocations.js";
import { orderEvents } from "../tables/order-events.js";
import { SEED_INVENTORY, SEED_ORDERS, SEED_LINE_ITEMS, SEED_ORDER_EVENTS } from "../seed-data.js";

// Reset the demo. Truncates the operational tables and rebuilds the sample
// orders, lines, events, and stock from the shared fixtures. Users and customers
// are left in place, so the seeded logins keep working. Public on purpose, so a
// reviewer can reset from the UI without redeploying.
export const seedRunQuery = query({
  name: "run",
  verb: "POST",
  apiGroup: seedGroup,
  auth: false,
  stack: [
    s.db.truncate({ table: orderEvents, reset: true }),
    s.db.truncate({ table: allocations, reset: true }),
    s.db.truncate({ table: lineItems, reset: true }),
    s.db.truncate({ table: orders, reset: true }),
    s.db.truncate({ table: inventory, reset: true }),
    ...SEED_INVENTORY.map((inv) =>
      s.db.add({ table: inventory, row: { sku: inv.sku, available_qty: inv.available_qty } }),
    ),
    ...SEED_ORDERS.flatMap((o) => [
      s.db.add({
        table: orders,
        row: {
          customer_id: o.customer_id,
          reference: o.reference,
          status: o.status,
          total_cents: o.total_cents,
          exception_reason: o.exception_reason,
          pre_exception_status: o.pre_exception_status,
        },
        as: `o${o.id}`,
      }),
      ...SEED_LINE_ITEMS.filter((l) => l.order_id === o.id).map((l) =>
        s.db.add({
          table: lineItems,
          row: {
            order_id: ref(`o${o.id}.id`),
            sku: l.sku,
            description: l.description,
            quantity: l.quantity,
            unit_price_cents: l.unit_price_cents,
          },
        }),
      ),
      ...SEED_ORDER_EVENTS.filter((e) => e.order_id === o.id).map((e) =>
        s.db.add({
          table: orderEvents,
          row: {
            order_id: ref(`o${o.id}.id`),
            from_status: e.from_status,
            to_status: e.to_status,
            actor_user_id: e.actor_user_id,
            reason: e.reason,
          },
        }),
      ),
    ]),
  ],
  response: { ok: c.bool(true), orders_seeded: c.int(SEED_ORDERS.length) },
});
