import { query, s, ref } from "@xanots/sdk";
import { ordersGroup } from "./groups.js";
import { users } from "../tables/users.js";
import { orders } from "../tables/orders.js";
import { customers } from "../tables/customers.js";
import { inventory } from "../tables/inventory.js";

// Any authed role (including viewer) can read the board: orders newest-first,
// the customers they belong to, and current stock on hand.
export const listOrdersQuery = query({
  name: "list",
  verb: "GET",
  apiGroup: ordersGroup,
  auth: users,
  stack: [
    s.db.query({ table: orders, sort: [{ sortBy: "created_at", dir: "desc" }], as: "orders_rows" }),
    s.db.query({ table: customers, sort: [{ sortBy: "name", dir: "asc" }], as: "customers_rows" }),
    s.db.query({ table: inventory, sort: [{ sortBy: "sku", dir: "asc" }], as: "inventory_rows" }),
  ],
  response: {
    orders: ref("orders_rows"),
    customers: ref("customers_rows"),
    inventory: ref("inventory_rows"),
  },
});
