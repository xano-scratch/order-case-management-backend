import { table, f } from "@xanots/sdk";
import { orders } from "./orders.js";
import { SEED_LINE_ITEMS } from "../seed-data.js";

export const lineItems = table({
  name: "line_items",
  schema: {
    order_id: f.tableRef(orders, { required: true }),
    sku: f.text({ required: true }),
    description: f.text({ required: true }),
    quantity: f.int({ required: true }),
    unit_price_cents: f.int({ required: true }),
  },
  seed: SEED_LINE_ITEMS,
});
