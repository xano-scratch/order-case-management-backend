import { query, input, s, ref, inp, c, expr, col } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { orders } from "../tables/orders.js";
import { customers } from "../tables/customers.js";
import { lineItems } from "../tables/line-items.js";
import { allocations } from "../tables/allocations.js";
import { orderEvents } from "../tables/order-events.js";
import { inventory } from "../tables/inventory.js";

// One order with everything a reviewer audits: its customer, line items,
// allocations, the full event timeline, the actors who acted, and current stock.
// Any authed role can read it (order_id is a path param so getPath is addressable).
export const getOrderQuery = query({
  name: "get/{order_id}",
  verb: "GET",
  apiGroup: ordersGroup,
  auth: users,
  input: {
    order_id: input.int({ required: true }),
  },
  stack: [
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "order" }),
    s.precondition({
      expr: expr(ref("order", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Order not found."),
    }),
    s.db.get_by_id({ table: customers, id: ref("order.customer_id"), as: "customer" }),
    s.db.query({
      table: lineItems,
      where: expr(col("order_id"), "=", inp("order_id")),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "lines",
    }),
    s.db.query({
      table: allocations,
      where: expr(col("order_id"), "=", inp("order_id")),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "allocs",
    }),
    s.db.query({
      table: orderEvents,
      where: expr(col("order_id"), "=", inp("order_id")),
      sort: [{ sortBy: "created_at", dir: "asc" }],
      as: "events",
    }),
    s.db.query({ table: users, output: ["id", "name", "role"], as: "actors" }),
    s.db.query({ table: inventory, sort: [{ sortBy: "sku", dir: "asc" }], as: "inventory_rows" }),
  ],
  response: {
    order: ref("order"),
    customer: ref("customer"),
    line_items: ref("lines"),
    allocations: ref("allocs"),
    events: ref("events"),
    actors: ref("actors"),
    inventory: ref("inventory_rows"),
  },
});
