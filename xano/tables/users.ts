import { table, f } from "@xanots/sdk";
import { ROLES, SEED_USERS } from "../seed-data.js";

// The auth table backing native RBAC. `role` gates who may advance an order;
// the guards live at the API layer (see the query preconditions), never as
// row-level security.
export const users = table({
  name: "users",
  auth: true,
  schema: {
    email: f.email({ required: true }),
    password: f.password({ required: true }),
    name: f.text({ required: true }),
    role: f.enum(ROLES, { required: true }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
  seed: SEED_USERS,
});
