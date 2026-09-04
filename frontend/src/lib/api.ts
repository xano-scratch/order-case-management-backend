// The one contract: paths and request/response TYPES are derived from the xanots
// query defs, never hand-typed. Change a def and everything here follows. The
// def values are imported for getPath()/verb; the shapes are import-type only.

import type { InferInput, InferResponse } from "@xanots/sdk";

import { loginQuery } from "../../../xano/api/login.js";
import { createOrderQuery } from "../../../xano/api/create.js";
import { validateQuery } from "../../../xano/api/validate.js";
import { allocateQuery } from "../../../xano/api/allocate.js";
import { fulfillQuery } from "../../../xano/api/fulfill.js";
import { exceptionQuery } from "../../../xano/api/exception.js";
import { resolveQuery } from "../../../xano/api/resolve.js";
import { cancelQuery } from "../../../xano/api/cancel.js";
import { listOrdersQuery } from "../../../xano/api/list.js";
import { getOrderQuery } from "../../../xano/api/get.js";
import { seedRunQuery } from "../../../xano/api/seed-run.js";

/** The deployed backend's base URL, injected by `xanots deploy --static`. */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Types, straight from the defs ────────────────────────────────────────────
export type Session = InferResponse<typeof loginQuery>;
export type LoginBody = InferInput<typeof loginQuery>;

export type OrdersBoard = InferResponse<typeof listOrdersQuery>;
export type OrderRow = OrdersBoard["orders"][number];
export type Customer = OrdersBoard["customers"][number];
export type StockRow = OrdersBoard["inventory"][number];

export type OrderDetail = InferResponse<typeof getOrderQuery>;
export type LineItem = OrderDetail["line_items"][number];
export type Allocation = OrderDetail["allocations"][number];
export type OrderEvent = OrderDetail["events"][number];
export type Actor = OrderDetail["actors"][number];

export type CreateOrderBody = InferInput<typeof createOrderQuery>;

// ── The caller (auth token) ──────────────────────────────────────────────────
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** An API error that carries the HTTP status, so the UI can prove the API (not
 *  the screen) rejected an action. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function call<T>(path: string, verb: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(XANO_HOST + path, {
    method: verb,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text || `Request failed (${res.status}).`;
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      message = parsed.message || parsed.error || message;
    } catch {
      /* keep the raw text */
    }
    throw new ApiError(message, res.status);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── The endpoints ────────────────────────────────────────────────────────────
export function login(body: LoginBody): Promise<Session> {
  return call(loginQuery.getPath(), loginQuery.verb, body);
}
export function listOrders(): Promise<OrdersBoard> {
  return call(listOrdersQuery.getPath(), listOrdersQuery.verb);
}
export function getOrder(orderId: number): Promise<OrderDetail> {
  return call(getOrderQuery.getPath({ params: { order_id: orderId } }), getOrderQuery.verb);
}
export function createOrder(body: CreateOrderBody): Promise<OrderRow> {
  return call(createOrderQuery.getPath(), createOrderQuery.verb, body);
}
export function validateOrder(orderId: number, reason?: string): Promise<OrderRow> {
  return call(validateQuery.getPath(), validateQuery.verb, { order_id: orderId, reason });
}
export function allocateOrder(orderId: number, reason?: string): Promise<OrderRow> {
  return call(allocateQuery.getPath(), allocateQuery.verb, { order_id: orderId, reason });
}
export function fulfillOrder(orderId: number, reason?: string): Promise<OrderRow> {
  return call(fulfillQuery.getPath(), fulfillQuery.verb, { order_id: orderId, reason });
}
export function exceptionOrder(orderId: number, reason: string): Promise<OrderRow> {
  return call(exceptionQuery.getPath(), exceptionQuery.verb, { order_id: orderId, reason });
}
export function resolveOrder(orderId: number, reason?: string): Promise<OrderRow> {
  return call(resolveQuery.getPath(), resolveQuery.verb, { order_id: orderId, reason });
}
export function cancelOrder(orderId: number, reason?: string): Promise<OrderRow> {
  return call(cancelQuery.getPath(), cancelQuery.verb, { order_id: orderId, reason });
}
export function resetDemo(): Promise<{ ok: boolean; orders_seeded: number }> {
  return call(seedRunQuery.getPath(), seedRunQuery.verb, {});
}
