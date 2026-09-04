import { or, expr, ref, c } from "@xanots/sdk";
import type { Role } from "../seed-data.js";

// The governed access rule, in one place: the caller's row (loaded as `me`)
// carries a role that is one of the allowed roles. Each protected endpoint reads
// `me` and runs this as an s.precondition, so the RBAC check is enforced at the
// API layer and reads plainly at every call site.
export function callerHasRole(...roles: Role[]) {
  const checks = roles.map((r) => expr(ref("me.role"), "=", c.text(r)));
  return checks.length === 1 ? checks[0] : or(...checks);
}
