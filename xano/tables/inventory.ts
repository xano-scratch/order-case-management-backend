import { table, f } from "@xanots/sdk";
import { SEED_INVENTORY } from "../seed-data.js";

// Drives the allocation availability check. Keyed by sku.
export const inventory = table({
  name: "inventory",
  schema: {
    sku: f.text({ required: true }),
    available_qty: f.int({ required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "sku" }] }],
  seed: SEED_INVENTORY,
});
