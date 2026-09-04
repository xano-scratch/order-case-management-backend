import { query, input, s, ref, inp, auth, c, expr } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { orders } from "../tables/orders.js";
import { orderEvents } from "../tables/order-events.js";
import { callerHasRole } from "./helpers.js";

// allocated -> fulfilled. Ops or supervisor.
export const fulfillQuery = query({
  name: "fulfill",
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
      error: c.text("Only an ops agent or supervisor can fulfill an order."),
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "order" }),
    s.precondition({
      expr: expr(ref("order", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Order not found."),
    }),
    s.precondition({
      expr: expr(ref("order.status"), "=", c.text("allocated")),
      error_type: "badrequest",
      error: c.text("Only an allocated order can be fulfilled."),
    }),
    s.db.edit({ table: orders, fieldValue: inp("order_id"), row: { status: "fulfilled" } }),
    s.db.add({
      table: orderEvents,
      row: {
        order_id: inp("order_id"),
        from_status: "allocated",
        to_status: "fulfilled",
        actor_user_id: auth("id"),
        reason: inp("reason"),
      },
    }),
    s.db.get_by_id({ table: orders, id: inp("order_id"), as: "result" }),
  ],
  response: ref("result"),
});
