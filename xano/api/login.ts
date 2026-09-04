import { query, input, s, ref, inp, c, expr } from "@xanots/sdk";
import { authGroup } from "./groups.js";
import { users } from "../tables/users.js";

// Mint an auth token. The password comes in as plain text (an f.password column
// hashes on write, and input.password would double-hash it), and both the
// unknown-email and wrong-password paths answer the same 401 so the endpoint
// never reveals which accounts exist.
export const loginQuery = query({
  name: "login",
  verb: "POST",
  apiGroup: authGroup,
  auth: false,
  input: {
    email: input.email({ required: true, methods: ["trim", "lower"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      output: ["id", "email", "name", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error_type: "unauthorized",
      error: c.text("Invalid email or password."),
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: {
    authToken: ref("token"),
    userId: ref("u.id"),
    name: ref("u.name"),
    email: ref("u.email"),
    role: ref("u.role"),
  },
});
