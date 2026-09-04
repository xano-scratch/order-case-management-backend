// Demo fixtures for the order-case-management backend. ONE source of truth:
// the tables seed these rows on deploy (so the ephemeral is browsable the moment
// it comes up), and the POST api:seed/run endpoint rebuilds the operational rows
// from the same arrays so a reviewer can reset the demo without a redeploy.
//
// These are DELIBERATELY PUBLIC demo credentials, not real secrets.

export const ORDER_STATUSES = [
  "received",
  "validated",
  "allocated",
  "fulfilled",
  "exception",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ROLES = ["ops_agent", "supervisor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const TIERS = ["standard", "priority"] as const;
export type Tier = (typeof TIERS)[number];

export interface UserSeed {
  id: number;
  email: string;
  name: string;
  role: Role;
  password: string;
}
export interface CustomerSeed {
  id: number;
  name: string;
  email: string;
  tier: Tier;
}
export interface InventorySeed {
  id: number;
  sku: string;
  available_qty: number;
}
export interface OrderSeed {
  id: number;
  customer_id: number;
  reference: string;
  status: OrderStatus;
  total_cents: number;
  exception_reason: string | null;
  pre_exception_status: OrderStatus | null;
}
export interface LineItemSeed {
  order_id: number;
  sku: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
}
export interface OrderEventSeed {
  order_id: number;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_user_id: number;
  reason: string | null;
}

export const DEMO_PASSWORD = "demo1234";

// One account per role, so a reviewer can feel each role gate.
export const SEED_USERS: UserSeed[] = [
  { id: 1, email: "ops@demo.test", name: "Priya Nadar (Ops Agent)", role: "ops_agent", password: DEMO_PASSWORD },
  { id: 2, email: "super@demo.test", name: "Sam Okafor (Supervisor)", role: "supervisor", password: DEMO_PASSWORD },
  { id: 3, email: "view@demo.test", name: "Val Reyes (Viewer)", role: "viewer", password: DEMO_PASSWORD },
];

export const SEED_CUSTOMERS: CustomerSeed[] = [
  { id: 1, name: "Northwind Retail", email: "orders@northwind.test", tier: "priority" },
  { id: 2, name: "Contoso Supplies", email: "buyer@contoso.test", tier: "standard" },
];

// SKU-GIZMO is short on purpose, so the insufficient-stock exception path is real.
export const SEED_INVENTORY: InventorySeed[] = [
  { id: 1, sku: "SKU-WIDGET", available_qty: 100 },
  { id: 2, sku: "SKU-CABLE", available_qty: 500 },
  { id: 3, sku: "SKU-GIZMO", available_qty: 2 },
  { id: 4, sku: "SKU-CASE", available_qty: 50 },
];

// ORD-1001 is fresh (received), ORD-1003 is ready to allocate (validated), and
// ORD-1002 is already held on the insufficient-stock exception so the governed
// path is visible the moment the app opens.
export const SEED_ORDERS: OrderSeed[] = [
  { id: 1, customer_id: 1, reference: "ORD-1001", status: "received", total_cents: 15500, exception_reason: null, pre_exception_status: null },
  { id: 2, customer_id: 2, reference: "ORD-1002", status: "exception", total_cents: 41500, exception_reason: "Insufficient stock: SKU-GIZMO", pre_exception_status: "validated" },
  { id: 3, customer_id: 1, reference: "ORD-1003", status: "validated", total_cents: 10500, exception_reason: null, pre_exception_status: null },
];

export const SEED_LINE_ITEMS: LineItemSeed[] = [
  { order_id: 1, sku: "SKU-WIDGET", description: "Standard Widget", quantity: 5, unit_price_cents: 2500 },
  { order_id: 1, sku: "SKU-CABLE", description: "USB-C Cable", quantity: 10, unit_price_cents: 300 },
  { order_id: 2, sku: "SKU-GIZMO", description: "Precision Gizmo", quantity: 10, unit_price_cents: 4000 },
  { order_id: 2, sku: "SKU-CASE", description: "Protective Case", quantity: 1, unit_price_cents: 1500 },
  { order_id: 3, sku: "SKU-WIDGET", description: "Standard Widget", quantity: 3, unit_price_cents: 2500 },
  { order_id: 3, sku: "SKU-CASE", description: "Protective Case", quantity: 2, unit_price_cents: 1500 },
];

export const SEED_ORDER_EVENTS: OrderEventSeed[] = [
  { order_id: 1, from_status: null, to_status: "received", actor_user_id: 1, reason: "Order received from Northwind Retail" },
  { order_id: 2, from_status: null, to_status: "received", actor_user_id: 1, reason: "Order received from Contoso Supplies" },
  { order_id: 2, from_status: "received", to_status: "validated", actor_user_id: 1, reason: "Line items confirmed" },
  { order_id: 2, from_status: "validated", to_status: "exception", actor_user_id: 1, reason: "Insufficient stock: SKU-GIZMO" },
  { order_id: 3, from_status: null, to_status: "received", actor_user_id: 1, reason: "Order received from Northwind Retail" },
  { order_id: 3, from_status: "received", to_status: "validated", actor_user_id: 1, reason: "Line items confirmed" },
];
