import { useEffect, useState, FormEvent, ReactNode } from "react";
import { hasPasswordSet, setPassword, verifyPassword } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ShieldCheck, AlertCircle, Store } from "lucide-react";

type Stage = "loading" | "setup" | "locked" | "unlocked";

/**
 * Renders children only after a successful login. On first run prompts to set
 * a password. Session lives in-memory only — restarting the app re-prompts.
 */
export function PasswordGate({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const has = await hasPasswordSet();
        setStage(has ? "locked" : "setup");
      } catch (e) {
        // DB not ready yet? Show login anyway, user retries.
        console.error("PasswordGate init failed:", e);
        setStage("locked");
      }
    })();
  }, []);

  async function onSetup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") ?? "");
    const pw2 = String(fd.get("password2") ?? "");
    if (pw !== pw2) {
      setError("Hasła nie są takie same.");
      return;
    }
    setBusy(true);
    try {
      await setPassword(pw);
      setStage("unlocked");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const pw = String(fd.get("password") ?? "");
    setBusy(true);
    try {
      const ok = await verifyPassword(pw);
      if (ok) {
        setStage("unlocked");
      } else {
        setError("Niepoprawne hasło.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (stage === "unlocked") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-5">
          <div className="flex items-center gap-2 justify-center">
            <Store className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold tracking-tight">shopdeck</span>
          </div>

          {stage === "loading" && (
            <p className="text-center text-sm text-muted-foreground">
              Ładowanie…
            </p>
          )}

          {stage === "setup" && (
            <>
              <div className="text-center space-y-1">
                <ShieldCheck className="h-8 w-8 mx-auto text-primary" />
                <h1 className="font-semibold">Ustaw hasło</h1>
                <p className="text-xs text-muted-foreground">
                  Pierwsze uruchomienie — wybierz hasło którym odblokujesz
                  aplikację. Min. 6 znaków. <br />
                  Hasło chroni przed casual access — dla pełnego szyfrowania
                  włącz BitLocker na dysku.
                </p>
              </div>
              <form onSubmit={onSetup} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="password">Nowe hasło</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password2">Powtórz hasło</Label>
                  <Input
                    id="password2"
                    name="password2"
                    type="password"
                    minLength={6}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Ustawiam…" : "Ustaw hasło i wejdź"}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center pt-2 border-t">
                  UWAGA: hasła nie da się odzyskać. Jeśli zapomnisz — musisz
                  usunąć plik <code>shopdeck.db</code> i tracisz wszystkie
                  dane. Zrób backup zaraz po pierwszym wejściu.
                </p>
              </form>
            </>
          )}

          {stage === "locked" && (
            <>
              <div className="text-center space-y-1">
                <Lock className="h-8 w-8 mx-auto text-primary" />
                <h1 className="font-semibold">Wprowadź hasło</h1>
              </div>
              <form onSubmit={onLogin} className="space-y-3">
                <div className="grid gap-2">
                  <Label htmlFor="password">Hasło</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sprawdzam…" : "Odblokuj"}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
