import { query, input, f, s, ref, inp, auth, c, expr, withFilters, fl } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { customers } from "../tables/customers.js";
import { orders } from "../tables/orders.js";
import { lineItems } from "../tables/line-items.js";
import { orderEvents } from "../tables/order-events.js";
import { callerHasRole } from "./helpers.js";

// Open a new order in `received` with its line items, and write the opening
// audit event. The order total is computed on the server from the submitted
// lines (never trusted from the client), and a unique reference is minted here.
export const createOrderQuery = query({
  name: "create",
  verb: "POST",
  apiGroup: ordersGroup,
  auth: users,
  input: {
    customer_id: input.int({ required: true }),
    line_items: input.list(
      input.object({
        sku: f.text({ required: true }),
        description: f.text({ required: true }),
        quantity: f.int({ required: true }),
        unit_price_cents: f.int({ required: true }),
      }),
    ),
  },
  stack: [
    // Who is calling, and may they open an order?
    s.db.get_by_id({ table: users, id: auth("id"), output: ["id", "role"], as: "me" }),
    s.precondition({
      expr: callerHasRole("ops_agent", "supervisor"),
      error_type: "accessdenied",
      error: c.text("Only an ops agent or supervisor can create an order."),
    }),
    // The order must belong to a real customer.
    s.db.get_by_id({ table: customers, id: inp("customer_id"), as: "customer" }),
    s.precondition({
      expr: expr(ref("customer", { safe: true }), "!=", c.null()),
      error_type: "notfound",
      error: c.text("Customer not found."),
    }),
    // Total the submitted lines (quantity * unit price), summed across lines.
    s.set_var("total_cents", c.int(0)),
    s.foreach({
      as: "line",
      list: inp("line_items"),
      body: [
        s.set_var("line_total", withFilters(ref("line.quantity"), fl.mul(ref("line.unit_price_cents")))),
        s.update_var("total_cents", withFilters(ref("total_cents"), fl.add(ref("line_total")))),
      ],
    }),
    // A stable, unique human reference.
    s.security.create_guid({ as: "guid" }),
    s.set_var("ref_suffix", withFilters(ref("guid"), fl.upper(), fl.substr(0, 6))),
    s.set_var("reference", withFilters(c.text("ORD-"), fl.concat(ref("ref_suffix")))),
    // Create the order, attach the lines, open the audit trail.
    s.db.add({
      table: orders,
      row: {
        customer_id: inp("customer_id"),
        reference: ref("reference"),
        status: "received",
        total_cents: ref("total_cents"),
      },
      as: "order",
    }),
    s.foreach({
      as: "line2",
      list: inp("line_items"),
      body: [
        s.db.add({
          table: lineItems,
          row: {
            order_id: ref("order.id"),
            sku: ref("line2.sku"),
            description: ref("line2.description"),
            quantity: ref("line2.quantity"),
            unit_price_cents: ref("line2.unit_price_cents"),
          },
        }),
      ],
    }),
    s.db.add({
      table: orderEvents,
      row: {
        order_id: ref("order.id"),
        from_status: c.null(),
        to_status: "received",
        actor_user_id: auth("id"),
        reason: c.text("Order created"),
      },
    }),
  ],
  response: ref("order"),
});
