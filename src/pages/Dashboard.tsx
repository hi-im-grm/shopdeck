import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "@/lib/db";
import { seedDatabase, clearAllData } from "@/lib/seed";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  ListTodo,
  Phone,
  Sparkles,
  Trash2,
  CalendarClock,
  Download,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  downloadBackup,
  importBackup,
  readBackupFile,
  getCurrentRowCounts,
  TABLE_LABELS_PL,
} from "@/lib/backup";
import {
  getBackupStatus,
  pickBackupFolder,
  clearBackupFolder,
  writeBackupToFolder,
  runDailyBackupIfNeeded,
  formatRelative,
  type BackupStatus,
} from "@/lib/autobackup";
import { FolderCog, ShieldCheck } from "lucide-react";

type Stats = {
  customers: number;
  products: number;
  open_todos: number;
  open_interactions: number;
};

type FollowUp = {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  summary: string;
  follow_up_at: number;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);

  async function refresh() {
    const conn = await db();
    const [c] = await conn.select<{ n: number }[]>(
      "SELECT COUNT(*) as n FROM customers",
    );
    const [p] = await conn.select<{ n: number }[]>(
      "SELECT COUNT(*) as n FROM products",
    );
    const [t] = await conn.select<{ n: number }[]>(
      "SELECT COUNT(*) as n FROM todos WHERE done = 0",
    );
    const [i] = await conn.select<{ n: number }[]>(
      "SELECT COUNT(*) as n FROM interactions WHERE status = 'open'",
    );
    setStats({
      customers: c.n,
      products: p.n,
      open_todos: t.n,
      open_interactions: i.n,
    });
    setFollowUps(
      await conn.select<FollowUp[]>(
        `SELECT i.id, i.customer_id, c.name as customer_name, i.summary, i.follow_up_at
         FROM interactions i
         LEFT JOIN customers c ON c.id = i.customer_id
         WHERE i.status = 'open' AND i.follow_up_at IS NOT NULL
         ORDER BY i.follow_up_at ASC
         LIMIT 10`,
      ),
    );
  }

  async function refreshBackupStatus() {
    setBackupStatus(await getBackupStatus());
  }

  useEffect(() => {
    refresh();
    refreshBackupStatus();
    // Try daily auto-backup once per app start.
    (async () => {
      const r = await runDailyBackupIfNeeded();
      if (r.ran) {
        toast.success("Auto-backup wykonany");
        await refreshBackupStatus();
      }
    })();
  }, []);

  async function loadSeed() {
    const result = await seedDatabase();
    if (result.skipped) {
      toast.info(
        "Baza już zawiera produkty — wyczyść dane jeśli chcesz załadować na nowo.",
      );
    } else {
      toast.success(
        `Załadowano ${result.count} przykładowych napędów + 2 klientów.`,
      );
    }
    await refresh();
  }

  async function clearAll() {
    if (
      !window.confirm(
        "Na pewno wyczyścić WSZYSTKIE dane (klienci, produkty, interakcje, todo, notatki)?",
      )
    )
      return;
    await clearAllData();
    toast.success("Dane wyczyszczone");
    await refresh();
  }

  async function handleExport() {
    try {
      const { filename, totalRows } = await downloadBackup();
      toast.success(`Backup zapisany: ${filename} (${totalRows} wierszy)`);
    } catch (e) {
      toast.error(`Błąd eksportu: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handlePickFolder() {
    try {
      const folder = await pickBackupFolder();
      if (folder) {
        toast.success(`Folder backupu ustawiony: ${folder}`);
        await refreshBackupStatus();
      }
    } catch (e) {
      toast.error(`Błąd: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleClearFolder() {
    if (!window.confirm("Wyłączyć auto-backup? (możesz włączyć ponownie)")) return;
    await clearBackupFolder();
    toast.success("Auto-backup wyłączony");
    await refreshBackupStatus();
  }

  async function handleBackupNow() {
    try {
      const { path } = await writeBackupToFolder();
      toast.success(`Backup zapisany: ${path}`);
      await refreshBackupStatus();
    } catch (e) {
      toast.error(`Błąd: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleImport(file: File) {
    try {
      const counts = await getCurrentRowCounts();
      const totalNow = Object.values(counts).reduce((a, b) => a + b, 0);
      const parsed = await readBackupFile(file);
      const detailLines = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(
          ([t, n]) =>
            `  • ${TABLE_LABELS_PL[t as keyof typeof TABLE_LABELS_PL]}: ${n}`,
        )
        .join("\n");
      if (
        !window.confirm(
          `Importuję backup z pliku „${file.name}”.\n\n` +
            `UWAGA: wszystkie obecne dane (${totalNow} wierszy) zostaną NADPISANE:\n` +
            (detailLines || "  • baza pusta") +
            `\n\nKontynuować?`,
        )
      ) {
        return;
      }
      const summary = await importBackup(parsed);
      const total = Object.values(summary.inserted).reduce((a, b) => a + b, 0);
      toast.success(`Przywrócono ${total} wierszy z backupu`);
      if (summary.skippedTables.length > 0) {
        toast.info(
          `Pominięte tabele (nieznane w tej wersji): ${summary.skippedTables.join(", ")}`,
        );
      }
      await refresh();
      // Force full reload so other pages pick up the new IDs / linked entities.
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error(`Błąd importu: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const tiles: {
    label: string;
    value: number | string;
    icon: typeof Users;
    to: string;
  }[] = [
    {
      label: "Klienci",
      value: stats?.customers ?? "…",
      icon: Users,
      to: "/customers",
    },
    {
      label: "Produkty",
      value: stats?.products ?? "…",
      icon: Package,
      to: "/products",
    },
    {
      label: "Otwarte sprawy",
      value: stats?.open_interactions ?? "…",
      icon: Phone,
      to: "/interactions?filter=open",
    },
    {
      label: "Otwarte zadania",
      value: stats?.open_todos ?? "…",
      icon: ListTodo,
      to: "/todos",
    },
  ];

  const isEmpty = stats?.customers === 0 && stats?.products === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Krótki przegląd: klienci, produkty, oczekujące sprawy."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Pełny backup
            </Button>
            <label>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.currentTarget.value = "";
                }}
              />
              <Button variant="outline" size="sm" asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Przywróć backup
                </span>
              </Button>
            </label>
            {isEmpty && (
              <Button onClick={loadSeed}>
                <Sparkles className="h-4 w-4" />
                Załaduj przykłady
              </Button>
            )}
            {!isEmpty && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <Trash2 className="h-4 w-4" />
                Wyczyść dane
              </Button>
            )}
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map(({ label, value, icon: Icon, to }) => (
            <Link key={label} to={to}>
              <Card className="hover:bg-muted/30 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold tabular-nums">
                    {value}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {followUps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Nadchodzące follow-upy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {followUps.map((f) => {
                const overdue = f.follow_up_at * 1000 < Date.now();
                return (
                  <Link
                    key={f.id}
                    to={f.customer_id ? `/customers/${f.customer_id}` : "/customers"}
                    className="block rounded-md border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {f.summary}
                        </div>
                        {f.customer_name && (
                          <div className="text-xs text-muted-foreground truncate">
                            {f.customer_name}
                          </div>
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-xs tabular-nums whitespace-nowrap px-2 py-0.5 rounded",
                          overdue
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                        )}
                      >
                        {new Date(f.follow_up_at * 1000).toLocaleString(
                          "pl-PL",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        {backupStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Auto-backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {backupStatus.folder ? (
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-muted-foreground">Folder:</span>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded break-all">
                      {backupStatus.folder}
                    </code>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Ostatni backup:{" "}
                      <span className="text-foreground font-medium">
                        {formatRelative(backupStatus.lastBackupAt)}
                      </span>
                    </span>
                    <span>
                      Zapisów od backupu:{" "}
                      <span className="text-foreground font-medium tabular-nums">
                        {backupStatus.writesSinceBackup}
                      </span>{" "}
                      / 50
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={handleBackupNow}>
                      <Download className="h-3.5 w-3.5" />
                      Backup teraz
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePickFolder}
                    >
                      <FolderCog className="h-3.5 w-3.5" />
                      Zmień folder
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearFolder}
                    >
                      Wyłącz
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Auto-backup nie jest skonfigurowany. Wybierz folder (np.
                    OneDrive / Dropbox) — kopia zapisze się automatycznie co
                    50 zapisów oraz raz dziennie przy starcie aplikacji.
                  </p>
                  <Button size="sm" onClick={handlePickFolder}>
                    <FolderCog className="h-3.5 w-3.5" />
                    Wybierz folder backupu
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {isEmpty && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center space-y-3">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground" />
              <h3 className="font-semibold">Pusta baza</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Zacznij od załadowania przykładowych danych — 8 napędów (różni
                producenci, różne typy) i 2 klientów testowych. Możesz wyczyścić
                w każdej chwili.
              </p>
              <Button onClick={loadSeed}>
                <Sparkles className="h-4 w-4" />
                Załaduj przykłady
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
