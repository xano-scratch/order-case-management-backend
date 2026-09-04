import { useState } from "react";
import { Loader2, LogOut, PackageSearch, RotateCcw } from "lucide-react";

import { resetDemo, setAuthToken, type Session } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Login } from "@/components/Login";
import { OrdersList } from "@/components/OrdersList";
import { OrderDetail } from "@/components/OrderDetail";
import { roleLabel } from "@/lib/format";

const SESSION_KEY = "order-ops-session";

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    setAuthToken(session.authToken);
    return session;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [resetting, setResetting] = useState(false);

  function onSignedIn(next: Session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }

  function signOut() {
    localStorage.removeItem(SESSION_KEY);
    setAuthToken(null);
    setSession(null);
    setSelectedOrderId(null);
  }

  async function onReset() {
    setResetting(true);
    try {
      await resetDemo();
      setSelectedOrderId(null);
      setReloadKey((k) => k + 1);
    } catch {
      /* best-effort; the board reload will surface any real problem */
    } finally {
      setResetting(false);
    }
  }

  if (!session) return <Login onSignedIn={onSignedIn} />;

  return (
    <div className="min-h-screen">
      <header className="border-border bg-card/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <PackageSearch className="text-primary size-5" />
            <span className="font-semibold">Order Case Management</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-sm sm:inline">{session.name}</span>
            <Badge variant="secondary">{roleLabel(session.role)}</Badge>
            <Button variant="outline" size="sm" onClick={() => void onReset()} disabled={resetting} title="Reset the demo data">
              {resetting ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              <span className="hidden sm:inline">Reset demo</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {selectedOrderId === null ? (
          <OrdersList session={session} reloadKey={reloadKey} onOpen={setSelectedOrderId} />
        ) : (
          <OrderDetail
            orderId={selectedOrderId}
            session={session}
            onBack={() => {
              setSelectedOrderId(null);
              setReloadKey((k) => k + 1);
            }}
            onChanged={() => setReloadKey((k) => k + 1)}
          />
        )}
      </main>
    </div>
  );
}
