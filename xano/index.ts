import { workspace } from "@xanots/sdk";

import { users } from "./tables/users.js";
import { customers } from "./tables/customers.js";
import { orders } from "./tables/orders.js";
import { lineItems } from "./tables/line-items.js";
import { inventory } from "./tables/inventory.js";
import { allocations } from "./tables/allocations.js";
import { orderEvents } from "./tables/order-events.js";

import { authGroup, ordersGroup, seedGroup } from "./api/groups.js";

import { loginQuery } from "./api/login.js";
import { createOrderQuery } from "./api/create.js";
import { validateQuery } from "./api/validate.js";
import { allocateQuery } from "./api/allocate.js";
import { fulfillQuery } from "./api/fulfill.js";
import { exceptionQuery } from "./api/exception.js";
import { resolveQuery } from "./api/resolve.js";
import { cancelQuery } from "./api/cancel.js";
import { listOrdersQuery } from "./api/list.js";
import { getOrderQuery } from "./api/get.js";
import { seedRunQuery } from "./api/seed-run.js";

export default workspace("order-case-management-backend")
  .registerTables([users, customers, orders, lineItems, inventory, allocations, orderEvents])
  .registerApiGroups([authGroup, ordersGroup, seedGroup])
  .registerQueries([
    loginQuery,
    createOrderQuery,
    validateQuery,
    allocateQuery,
    fulfillQuery,
    exceptionQuery,
    resolveQuery,
    cancelQuery,
    listOrdersQuery,
    getOrderQuery,
    seedRunQuery,
  ]);
