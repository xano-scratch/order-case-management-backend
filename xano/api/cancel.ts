import { query, input, s, ref, inp, auth, c, expr, and } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { orders } from "../tables/orders.js";
import { orderEvents } from "../tables/order-events.js";
import { callerHasRole } from "./helpers.js";

// Cancel an open order. Supervisor only. A fulfilled or already-cancelled order
// cannot be cancelled.
export const cancelQuery = query({
  name: "cancel",
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
      expr: callerHasRole("supervisor"),
      error_type: "accessdenied",
      error: c.text("Only a supervisor can cancel an order."),
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "order" }),
    s.precondition({
      expr: expr(ref("order", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Order not found."),
    }),
    s.precondition({
      expr: and(
        expr(ref("order.status"), "!=", c.text("fulfilled")),
        expr(ref("order.status"), "!=", c.text("cancelled")),
      ),
      error_type: "badrequest",
      error: c.text("A fulfilled or cancelled order cannot be cancelled."),
    }),
    s.db.edit({ table: orders, fieldValue: inp("order_id"), row: { status: "cancelled" } }),
    s.db.add({
      table: orderEvents,
      row: {
        order_id: inp("order_id"),
        from_status: ref("order.status"),
        to_status: "cancelled",
        actor_user_id: auth("id"),
        reason: inp("reason"),
      },
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "result" }),
  ],
  response: ref("result"),
});
