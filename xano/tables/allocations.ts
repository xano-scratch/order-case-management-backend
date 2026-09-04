import { table, f } from "@xanots/sdk";
import { orders } from "./orders.js";

// One row per allocated line. Created on allocate, alongside the inventory
// decrement. Empty until an order is allocated.
export const allocations = table({
  name: "allocations",
  schema: {
    order_id: f.tableRef(orders, { required: true }),
    sku: f.text({ required: true }),
    quantity: f.int({ required: true }),
  },
});
