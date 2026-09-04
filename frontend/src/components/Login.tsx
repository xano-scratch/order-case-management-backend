import * as React from "react";
import { useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";

import { login, setAuthToken, type Session } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { roleLabel } from "@/lib/format";

const DEMO_PASSWORD = "demo1234";
const DEMO_ACCOUNTS = [
  { email: "ops@demo.test", role: "ops_agent", hint: "advance orders" },
  { email: "super@demo.test", role: "supervisor", hint: "resolve + cancel" },
  { email: "view@demo.test", role: "viewer", hint: "read only" },
];

export function Login({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const [email, setEmail] = useState("ops@demo.test");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(creds: { email: string; password: string }) {
    setBusy(true);
    setError(null);
    try {
      const session = await login(creds);
      setAuthToken(session.authToken);
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void signIn({ email, password });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-2 text-center">
        <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-xl">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Order Case Management</h1>
        <p className="text-muted-foreground text-sm">
          A governed order operations backend. Sign in to walk an order through its
          enforced lifecycle and feel the role gates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Role checks are enforced at the API layer, not this screen.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              <LogIn />
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-muted-foreground text-center text-xs">
          Demo accounts (password <code className="bg-muted rounded px-1 py-0.5">{DEMO_PASSWORD}</code>) — one per role:
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              disabled={busy}
              onClick={() => {
                setEmail(a.email);
                setPassword(DEMO_PASSWORD);
                void signIn({ email: a.email, password: DEMO_PASSWORD });
              }}
              className="border-border hover:border-ring hover:bg-accent rounded-lg border p-3 text-left transition-colors disabled:opacity-50"
            >
              <div className="text-sm font-medium">{roleLabel(a.role)}</div>
              <div className="text-muted-foreground text-xs">{a.hint}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
