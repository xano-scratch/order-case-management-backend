import { apiGroup } from "@xanots/sdk";

// Pin each canonical slug so the public paths are stable and getPath() resolves
// in the browser bundle from the source alone (no lock round-trip needed).
export const authGroup = apiGroup({ name: "auth", canonical: "auth" });
export const ordersGroup = apiGroup({ name: "orders", canonical: "orders" });
export const seedGroup = apiGroup({ name: "seed", canonical: "seed" });
