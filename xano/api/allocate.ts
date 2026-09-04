import { query, input, s, ref, inp, auth, c, expr, and, or, col, withFilters, fl } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { orders } from "../tables/orders.js";
import { lineItems } from "../tables/line-items.js";
import { inventory } from "../tables/inventory.js";
import { allocations } from "../tables/allocations.js";
import { orderEvents } from "../tables/order-events.js";
import { callerHasRole } from "./helpers.js";

// validated -> allocated. Each line is checked against inventory. If every line
// is covered, reserve it (an allocations row per line) and decrement stock. If
// any line is short, the order drops to `exception` with the reason instead, and
// nothing is reserved.
export const allocateQuery = query({
  name: "allocate",
  verb: "POST",
  apiGroup: ordersGroup,
  auth: users,
  input: {
    order_id: input.int({ required: true }),
    reason: input.text({ required: false }),
  },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), output: ["id", "role"], as: "me" }),
    s.precondition({
      expr: callerHasRole("ops_agent", "supervisor"),
      error_type: "accessdenied",
      error: c.text("Only an ops agent or supervisor can allocate stock."),
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "order" }),
    s.precondition({
      expr: expr(ref("order", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Order not found."),
    }),
    s.precondition({
      expr: expr(ref("order.status"), "=", c.text("validated")),
      error_type: "badrequest",
      error: c.text("Only a validated order can be allocated."),
    }),
    s.db.query({
      table: lineItems,
      where: expr(col("order_id"), "=", inp("order_id")),
      as: "lines",
    }),
    // First pass: find the first line whose stock cannot cover it.
    s.set_var("short_sku", c.text("")),
    s.foreach({
      as: "line",
      list: ref("lines"),
      body: [
        s.db.get({ table: inventory, fieldName: "sku", fieldValue: ref("line.sku"), as: "inv" }),
        s.conditional({
          when: and(
            expr(ref("short_sku"), "=", c.text("")),
            or(
              expr(ref("inv.id", { safe: true }), "=", c.null()),
              expr(ref("inv.available_qty", { safe: true }), "<", ref("line.quantity")),
            ),
          ),
          then: [s.update_var("short_sku", ref("line.sku"))],
        }),
      ],
    }),
    s.conditional({
      when: expr(ref("short_sku"), "!=", c.text("")),
      then: [
        // Not enough stock: hold on exception with an auditable reason.
        s.set_var("reason_txt", withFilters(c.text("Insufficient stock: "), fl.concat(ref("short_sku")))),
        s.db.edit({
          table: orders,
          fieldValue: inp("order_id"),
          row: {
            status: "exception",
            exception_reason: ref("reason_txt"),
            pre_exception_status: ref("order.status"),
          },
        }),
        s.db.add({
          table: orderEvents,
          row: {
            order_id: inp("order_id"),
            from_status: ref("order.status"),
            to_status: "exception",
            actor_user_id: auth("id"),
            reason: ref("reason_txt"),
          },
        }),
      ],
      else: [
        // Enough stock: reserve each line and decrement inventory.
        s.foreach({
          as: "line2",
          list: ref("lines"),
          body: [
            s.db.get({ table: inventory, fieldName: "sku", fieldValue: ref("line2.sku"), as: "inv2" }),
            s.db.add({
              table: allocations,
              row: { order_id: inp("order_id"), sku: ref("line2.sku"), quantity: ref("line2.quantity") },
            }),
            s.db.edit({
              table: inventory,
              fieldName: "sku",
              fieldValue: ref("line2.sku"),
              row: { available_qty: withFilters(ref("inv2.available_qty"), fl.sub(ref("line2.quantity"))) },
            }),
          ],
        }),
        s.db.edit({ table: orders, fieldValue: inp("order_id"), row: { status: "allocated" } }),
        s.db.add({
          table: orderEvents,
          row: {
            order_id: inp("order_id"),
            from_status: ref("order.status"),
            to_status: "allocated",
            actor_user_id: auth("id"),
            reason: inp("reason"),
          },
        }),
      ],
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "result" }),
  ],
  response: ref("result"),
});
