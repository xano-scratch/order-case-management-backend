import { query, input, s, ref, inp, auth, c, expr, and } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { orders } from "../tables/orders.js";
import { orderEvents } from "../tables/order-events.js";
import { callerHasRole } from "./helpers.js";

// Put an active order on exception hold with a supplied reason, stashing the
// state to return to. Not allowed from fulfilled, cancelled, or exception.
export const exceptionQuery = query({
  name: "exception",
  verb: "POST",
  apiGroup: ordersGroup,
  auth: users,
  input: {
    order_id: input.int({ required: true }),
    reason: input.text({ required: true }),
  },
  stack: [
    s.db.get_by_id({ table: users, id: auth("id"), output: ["id", "role"], as: "me" }),
    s.precondition({
      expr: callerHasRole("ops_agent", "supervisor"),
      error_type: "accessdenied",
      error: c.text("Only an ops agent or supervisor can raise an exception."),
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
        expr(ref("order.status"), "!=", c.text("exception")),
      ),
      error_type: "badrequest",
      error: c.text("A fulfilled, cancelled, or already-held order cannot be put on exception."),
    }),
    s.db.edit({
      table: orders,
      fieldValue: inp("order_id"),
      row: {
        status: "exception",
        exception_reason: inp("reason"),
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
        reason: inp("reason"),
      },
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "result" }),
  ],
  response: ref("result"),
});
