import { table, f } from "@xanots/sdk";
import { customers } from "./customers.js";
import { ORDER_STATUSES, SEED_ORDERS } from "../seed-data.js";

// The state machine. `status` is the case's current state; `pre_exception_status`
// stashes the state to return to when an exception is resolved. Money is held as
// an integer count of cents (never a decimal).
export const orders = table({
  name: "orders",
  schema: {
    customer_id: f.tableRef(customers, { required: true }),
    reference: f.text({ required: true }),
    status: f.enum(ORDER_STATUSES, { required: true }),
    total_cents: f.int({ required: true }),
    exception_reason: f.text({ nullable: true }),
    pre_exception_status: f.enum(ORDER_STATUSES, { nullable: true }),
  },
  index: [{ type: "unique", fields: [{ name: "reference" }] }],
  seed: SEED_ORDERS,
});
