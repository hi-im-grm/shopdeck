import { useEffect, useState, FormEvent } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  FolderCog,
  Download,
  Upload,
  KeyRound,
  Info,
  AlertCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBackupStatus,
  pickBackupFolder,
  clearBackupFolder,
  writeBackupToFolder,
  formatRelative,
  type BackupStatus,
} from "@/lib/autobackup";
import { changePassword } from "@/lib/auth";
import {
  downloadBackup,
  importBackup,
  readBackupFile,
  getCurrentRowCounts,
  TABLE_LABELS_PL,
} from "@/lib/backup";

export function Settings() {
  const [backup, setBackup] = useState<BackupStatus | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function refreshBackup() {
    setBackup(await getBackupStatus());
  }

  useEffect(() => {
    refreshBackup();
  }, []);

  async function handlePickFolder() {
    try {
      const folder = await pickBackupFolder();
      if (folder) {
        toast.success(`Folder backupu ustawiony: ${folder}`);
        await refreshBackup();
      }
    } catch (e) {
      toast.error(`Błąd: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleClearFolder() {
    if (!window.confirm("Wyłączyć auto-backup?")) return;
    await clearBackupFolder();
    toast.success("Auto-backup wyłączony");
    await refreshBackup();
  }

  async function handleBackupNow() {
    try {
      const { path } = await writeBackupToFolder();
      toast.success(`Backup zapisany: ${path}`);
      await refreshBackup();
    } catch (e) {
      toast.error(`Błąd: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleExportJson() {
    try {
      const { filename, totalRows } = await downloadBackup();
      toast.success(`Backup zapisany: ${filename} (${totalRows} wierszy)`);
    } catch (e) {
      toast.error(`Błąd eksportu: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleImportJson(file: File) {
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
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast.error(`Błąd importu: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwError(null);
    const fd = new FormData(e.currentTarget);
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    const next2 = String(fd.get("next2") ?? "");
    if (next !== next2) {
      setPwError("Nowe hasła nie są takie same.");
      return;
    }
    if (next.length < 6) {
      setPwError("Nowe hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    setPwBusy(true);
    try {
      await changePassword(current, next);
      toast.success("Hasło zmienione");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setPwError(err instanceof Error ? err.message : String(err));
    } finally {
      setPwBusy(false);
    }
  }

  const dbPath = "%APPDATA%\\com.shopdeck.app\\shopdeck.db";

  return (
    <>
      <PageHeader
        title="Ustawienia"
        description="Backup, bezpieczeństwo i informacje o aplikacji."
      />
      <div className="p-6 space-y-6 max-w-3xl">
        {/* Auto-backup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Auto-backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {backup === null ? (
              <p className="text-muted-foreground">Ładowanie…</p>
            ) : backup.folder ? (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Folder:</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded break-all">
                    {backup.folder}
                  </code>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Ostatni backup:{" "}
                    <span className="text-foreground font-medium">
                      {formatRelative(backup.lastBackupAt)}
                    </span>
                  </span>
                  <span>
                    Zapisów od backupu:{" "}
                    <span className="text-foreground font-medium tabular-nums">
                      {backup.writesSinceBackup}
                    </span>{" "}
                    / 50
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-backup uruchamia się co 50 zapisów lub raz dziennie przy
                  starcie aplikacji.
                </p>
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
                    Wyłącz auto-backup
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Auto-backup nie jest skonfigurowany. Wybierz folder (np.
                  OneDrive / Dropbox) — kopia bazy zapisze się automatycznie co
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

        {/* Manual JSON backup/restore */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Save className="h-4 w-4" />
              Ręczny backup / przeniesienie na inny komputer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Eksport zapisuje całą bazę (klienci, sprawy, produkty, notatki,
              szablony) jako jeden plik JSON. Możesz go potem zaimportować
              na innym komputerze, żeby mieć identyczne dane.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleExportJson}>
                <Download className="h-3.5 w-3.5" />
                Pobierz pełny backup (JSON)
              </Button>
              <label>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportJson(f);
                    e.currentTarget.value = "";
                  }}
                />
                <Button size="sm" variant="outline" asChild>
                  <span className="cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    Przywróć z pliku JSON
                  </span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              UWAGA: import nadpisuje wszystkie obecne dane.
            </p>
          </CardContent>
        </Card>

        {/* Password change */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Zmiana hasła
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
              <div className="grid gap-2">
                <Label htmlFor="current">Aktualne hasło</Label>
                <Input
                  id="current"
                  name="current"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="next">Nowe hasło (min. 6 znaków)</Label>
                <Input
                  id="next"
                  name="next"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="next2">Powtórz nowe hasło</Label>
                <Input
                  id="next2"
                  name="next2"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              {pwError && (
                <div className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {pwError}
                </div>
              )}
              <Button type="submit" disabled={pwBusy}>
                {pwBusy ? "Zmieniam…" : "Zmień hasło"}
              </Button>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Hasła nie da się odzyskać — jeśli zapomnisz, jedyne wyjście to
                usunąć plik bazy i utworzyć aplikację na nowo. Trzymaj backup w
                bezpiecznym miejscu.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* App info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              O aplikacji
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Wersja:</span>
              <span className="font-medium">0.1.2</span>
              <span className="text-muted-foreground">Lokalizacja bazy:</span>
              <code className="text-xs bg-muted px-2 py-0.5 rounded break-all">
                {dbPath}
              </code>
              <span className="text-muted-foreground">Repo / Release:</span>
              <a
                href="https://github.com/hi-im-grm/shopdeck/releases"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                github.com/hi-im-grm/shopdeck
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
