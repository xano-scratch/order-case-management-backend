import { table, f } from "@xanots/sdk";
import { orders } from "./orders.js";
import { users } from "./users.js";
import { ORDER_STATUSES, SEED_ORDER_EVENTS } from "../seed-data.js";

// The append-only audit trail. Every transition writes one row here with the
// actor and the reason, so the full history of a case is auditable.
export const orderEvents = table({
  name: "order_events",
  schema: {
    order_id: f.tableRef(orders, { required: true }),
    from_status: f.enum(ORDER_STATUSES, { nullable: true }),
    to_status: f.enum(ORDER_STATUSES, { required: true }),
    actor_user_id: f.tableRef(users, { required: true }),
    reason: f.text({ nullable: true }),
  },
  seed: SEED_ORDER_EVENTS,
});
