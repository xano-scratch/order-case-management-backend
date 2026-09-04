import { query, input, s, ref, inp, auth, c, expr } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { orders } from "../tables/orders.js";
import { orderEvents } from "../tables/order-events.js";
import { callerHasRole } from "./helpers.js";

// exception -> the state it was in before. Supervisor only. Clears the reason.
export const resolveQuery = query({
  name: "resolve",
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
      error: c.text("Only a supervisor can resolve an exception."),
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "order" }),
    s.precondition({
      expr: expr(ref("order", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Order not found."),
    }),
    s.precondition({
      expr: expr(ref("order.status"), "=", c.text("exception")),
      error_type: "badrequest",
      error: c.text("Only an order on exception hold can be resolved."),
    }),
    s.precondition({
      expr: expr(ref("order.pre_exception_status"), "!=", c.null()),
      error_type: "badrequest",
      error: c.text("No prior state was recorded for this order."),
    }),
    s.db.edit({
      table: orders,
      fieldValue: inp("order_id"),
      row: {
        status: ref("order.pre_exception_status"),
        exception_reason: c.null(),
        pre_exception_status: c.null(),
      },
    }),
    s.db.add({
      table: orderEvents,
      row: {
        order_id: inp("order_id"),
        from_status: "exception",
        to_status: ref("order.pre_exception_status"),
        actor_user_id: auth("id"),
        reason: inp("reason"),
      },
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "result" }),
  ],
  response: ref("result"),
});
