import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  db,
  type InteractionKind,
  INTERACTION_KIND_LABELS,
  customerDisplayName,
} from "@/lib/db";
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
  AlertTriangle,
  Mail,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { runDailyBackupIfNeeded } from "@/lib/autobackup";

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
  customer_company: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  summary: string;
  follow_up_at: number;
};

type OverdueTodo = {
  id: number;
  title: string;
  due_date: number;
  customer_id: number | null;
  customer_name: string | null;
};

type RecentInteraction = {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  customer_company: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  kind: InteractionKind;
  summary: string;
  status: "open" | "done";
  created_at: number;
  follow_up_at: number | null;
};

type WeekStats = {
  customers: number;
  interactions: number;
  notes: number;
  todos_done: number;
};

const KIND_ICONS: Record<InteractionKind, typeof Phone> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Users,
  other: MessageSquare,
};

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDueDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [overdueTodos, setOverdueTodos] = useState<OverdueTodo[]>([]);
  const [recent, setRecent] = useState<RecentInteraction[]>([]);
  const [thisWeek, setThisWeek] = useState<WeekStats | null>(null);
  const [lastWeek, setLastWeek] = useState<WeekStats | null>(null);

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

    // Upcoming follow-ups (open interactions with date set)
    setFollowUps(
      await conn.select<FollowUp[]>(
        `SELECT i.id, i.customer_id,
                c.name as customer_name,
                c.company as customer_company,
                c.phone as customer_phone,
                c.email as customer_email,
                i.summary, i.follow_up_at
         FROM interactions i
         LEFT JOIN customers c ON c.id = i.customer_id
         WHERE i.status = 'open' AND i.follow_up_at IS NOT NULL
         ORDER BY i.follow_up_at ASC
         LIMIT 10`,
      ),
    );

    // Overdue todos
    const nowSec = Math.floor(Date.now() / 1000);
    const todayStartSec = Math.floor(
      new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000,
    );
    setOverdueTodos(
      await conn.select<OverdueTodo[]>(
        `SELECT t.id, t.title, t.due_date, t.customer_id,
                c.name as customer_name
         FROM todos t
         LEFT JOIN customers c ON c.id = t.customer_id
         WHERE t.done = 0 AND t.due_date IS NOT NULL AND t.due_date < ?
         ORDER BY t.due_date ASC
         LIMIT 20`,
        [todayStartSec],
      ),
    );

    // Recent open interactions (newest first)
    setRecent(
      await conn.select<RecentInteraction[]>(
        `SELECT i.id, i.customer_id,
                c.name as customer_name,
                c.company as customer_company,
                c.phone as customer_phone,
                c.email as customer_email,
                i.kind, i.summary, i.status, i.created_at, i.follow_up_at
         FROM interactions i
         LEFT JOIN customers c ON c.id = i.customer_id
         WHERE i.status = 'open'
         ORDER BY i.created_at DESC
         LIMIT 8`,
      ),
    );

    // Weekly stats (last 7 days vs previous 7 days)
    const week = 7 * 86400;
    const sevenAgo = nowSec - week;
    const fourteenAgo = nowSec - 2 * week;
    const countSince = async (
      table: string,
      tsCol: string,
      since: number,
      until?: number,
      extraWhere = "",
    ) => {
      const sql = until
        ? `SELECT COUNT(*) as n FROM ${table} WHERE ${tsCol} >= ? AND ${tsCol} < ? ${extraWhere}`
        : `SELECT COUNT(*) as n FROM ${table} WHERE ${tsCol} >= ? ${extraWhere}`;
      const params: number[] = until ? [since, until] : [since];
      const [r] = await conn.select<{ n: number }[]>(sql, params);
      return r?.n ?? 0;
    };
    setThisWeek({
      customers: await countSince("customers", "created_at", sevenAgo),
      interactions: await countSince("interactions", "created_at", sevenAgo),
      notes: await countSince("notes", "created_at", sevenAgo),
      todos_done: await countSince(
        "todos",
        "created_at",
        sevenAgo,
        undefined,
        "AND done = 1",
      ),
    });
    setLastWeek({
      customers: await countSince(
        "customers",
        "created_at",
        fourteenAgo,
        sevenAgo,
      ),
      interactions: await countSince(
        "interactions",
        "created_at",
        fourteenAgo,
        sevenAgo,
      ),
      notes: await countSince("notes", "created_at", fourteenAgo, sevenAgo),
      todos_done: await countSince(
        "todos",
        "created_at",
        fourteenAgo,
        sevenAgo,
        "AND done = 1",
      ),
    });
  }

  useEffect(() => {
    refresh();
    // Once-per-day silent backup on app open (no UI noise).
    (async () => {
      const r = await runDailyBackupIfNeeded();
      if (r.ran) toast.success("Auto-backup wykonany");
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
  const overdueFollowUps = useMemo(
    () => followUps.filter((f) => f.follow_up_at * 1000 < Date.now()),
    [followUps],
  );
  const upcomingFollowUps = useMemo(
    () => followUps.filter((f) => f.follow_up_at * 1000 >= Date.now()),
    [followUps],
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Krótki przegląd: klienci, produkty, oczekujące sprawy."
        action={
          <div className="flex gap-2">
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
        {/* Top stats */}
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

        {/* OVERDUE banner — only if there's actually something past deadline */}
        {(overdueTodos.length > 0 || overdueFollowUps.length > 0) && (
          <Card className="border-red-500/50 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Po terminie ({overdueTodos.length + overdueFollowUps.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueFollowUps.map((f) => (
                <Link
                  key={`fu-${f.id}`}
                  to={
                    f.customer_id
                      ? `/customers/${f.customer_id}`
                      : "/interactions"
                  }
                  className="block rounded-md border border-red-500/30 bg-background p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wide">
                        Follow-up
                      </div>
                      <div className="font-medium text-sm truncate">
                        {f.summary}
                      </div>
                      {f.customer_id && (
                        <div className="text-xs text-muted-foreground truncate">
                          {customerDisplayName({
                            id: f.customer_id,
                            name: f.customer_name,
                            company: f.customer_company,
                            phone: f.customer_phone,
                            email: f.customer_email,
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-xs tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
                      {formatDueDate(f.follow_up_at)}
                    </div>
                  </div>
                </Link>
              ))}
              {overdueTodos.map((t) => (
                <Link
                  key={`td-${t.id}`}
                  to={
                    t.customer_id
                      ? `/customers/${t.customer_id}`
                      : "/todos"
                  }
                  className="block rounded-md border border-red-500/30 bg-background p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium uppercase tracking-wide">
                        Zadanie
                      </div>
                      <div className="font-medium text-sm truncate">
                        {t.title}
                      </div>
                      {t.customer_id && t.customer_name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {t.customer_name}
                        </div>
                      )}
                    </div>
                    <div className="text-xs tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
                      {formatDueDate(t.due_date)}
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Two columns: Latest interactions + Upcoming follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {recent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Najnowsze sprawy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recent.map((r) => {
                  const Icon = KIND_ICONS[r.kind];
                  return (
                    <Link
                      key={r.id}
                      to={
                        r.customer_id
                          ? `/customers/${r.customer_id}`
                          : "/interactions"
                      }
                      className="block rounded-md border p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Circle className="h-3 w-3" />
                            <Icon className="h-3 w-3" />
                            <span>{INTERACTION_KIND_LABELS[r.kind]}</span>
                          </div>
                          <div className="font-medium text-sm truncate mt-0.5">
                            {r.summary}
                          </div>
                          {r.customer_id && (
                            <div className="text-xs text-muted-foreground truncate">
                              {customerDisplayName({
                                id: r.customer_id,
                                name: r.customer_name,
                                company: r.customer_company,
                                phone: r.customer_phone,
                                email: r.customer_email,
                              })}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {formatDate(r.created_at)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <Link
                  to="/interactions?filter=open"
                  className="block text-xs text-center text-muted-foreground hover:text-foreground pt-2 border-t"
                >
                  Wszystkie otwarte sprawy →
                </Link>
              </CardContent>
            </Card>
          )}

          {upcomingFollowUps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Nadchodzące follow-upy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingFollowUps.map((f) => (
                  <Link
                    key={f.id}
                    to={
                      f.customer_id
                        ? `/customers/${f.customer_id}`
                        : "/customers"
                    }
                    className="block rounded-md border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {f.summary}
                        </div>
                        {f.customer_id && (
                          <div className="text-xs text-muted-foreground truncate">
                            {customerDisplayName({
                              id: f.customer_id,
                              name: f.customer_name,
                              company: f.customer_company,
                              phone: f.customer_phone,
                              email: f.customer_email,
                            })}
                          </div>
                        )}
                      </div>
                      <div className="text-xs tabular-nums whitespace-nowrap px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        {new Date(f.follow_up_at * 1000).toLocaleString(
                          "pl-PL",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Weekly stats — last 7 days vs previous 7 days */}
        {thisWeek && lastWeek && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Statystyki tygodnia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <WeekStat
                  label="Nowi klienci"
                  now={thisWeek.customers}
                  prev={lastWeek.customers}
                />
                <WeekStat
                  label="Sprawy"
                  now={thisWeek.interactions}
                  prev={lastWeek.interactions}
                />
                <WeekStat
                  label="Notatki"
                  now={thisWeek.notes}
                  prev={lastWeek.notes}
                />
                <WeekStat
                  label="Zadania (zamknięte)"
                  now={thisWeek.todos_done}
                  prev={lastWeek.todos_done}
                />
              </div>
              <p className="text-xs text-muted-foreground pt-3 mt-3 border-t">
                Ostatnie 7 dni vs poprzednie 7 dni
              </p>
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

/** Single statistic card: big number now + delta vs previous period. */
function WeekStat({
  label,
  now,
  prev,
}: {
  label: string;
  now: number;
  prev: number;
}) {
  const delta = now - prev;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color =
    delta > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : delta < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{now}</span>
        <span className={cn("text-xs flex items-center gap-0.5", color)}>
          <Icon className="h-3 w-3" />
          {delta > 0 ? "+" : ""}
          {delta}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground tabular-nums">
        poprzedni: {prev}
      </div>
    </div>
  );
}
