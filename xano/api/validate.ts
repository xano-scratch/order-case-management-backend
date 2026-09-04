import { query, input, s, ref, inp, auth, c, expr, col } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { orders } from "../tables/orders.js";
import { lineItems } from "../tables/line-items.js";
import { orderEvents } from "../tables/order-events.js";
import { callerHasRole } from "./helpers.js";

// received -> validated. Ops or supervisor, and the order needs at least one line.
export const validateQuery = query({
  name: "validate",
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
      error: c.text("Only an ops agent or supervisor can validate an order."),
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "order" }),
    s.precondition({
      expr: expr(ref("order", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Order not found."),
    }),
    s.precondition({
      expr: expr(ref("order.status"), "=", c.text("received")),
      error_type: "badrequest",
      error: c.text("Only an order in received can be validated."),
    }),
    s.db.query({
      table: lineItems,
      where: expr(col("order_id"), "=", inp("order_id")),
      returnType: "count",
      as: "line_count",
    }),
    s.precondition({
      expr: expr(ref("line_count"), ">", c.int(0)),
      error_type: "badrequest",
      error: c.text("An order needs at least one line item before it can be validated."),
    }),
    s.db.edit({ table: orders, fieldValue: inp("order_id"), row: { status: "validated" } }),
    s.db.add({
      table: orderEvents,
      row: {
        order_id: inp("order_id"),
        from_status: "received",
        to_status: "validated",
        actor_user_id: auth("id"),
        reason: inp("reason"),
      },
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "result" }),
  ],
  response: ref("result"),
});
