import { table, f } from "@xanots/sdk";
import { TIERS, SEED_CUSTOMERS } from "../seed-data.js";

export const customers = table({
  name: "customers",
  schema: {
    name: f.text({ required: true }),
    email: f.email({ required: true }),
    tier: f.enum(TIERS, { required: true }),
  },
  seed: SEED_CUSTOMERS,
});
