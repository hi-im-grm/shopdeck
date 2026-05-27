import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  db,
  type Interaction,
  type InteractionKind,
  INTERACTION_KIND_LABELS,
  customerDisplayName,
} from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Phone,
  Mail,
  MessageSquare,
  Users,
  CheckCircle2,
  Circle,
  Trash2,
  CalendarClock,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type InteractionWithCustomer = Interaction & {
  customer_name: string | null;
  customer_company: string | null;
  customer_phone: string | null;
  customer_email: string | null;
};

const KIND_ICONS: Record<
  InteractionKind,
  React.ComponentType<{ className?: string }>
> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Users,
  other: MessageSquare,
};

type Filter = "open" | "done" | "all";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFollowUp(ts: number): string {
  return new Date(ts * 1000).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Interactions() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get("filter") as Filter) || "open";
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<InteractionWithCustomer[]>([]);

  async function refresh() {
    const conn = await db();
    setRows(
      await conn.select<InteractionWithCustomer[]>(
        `SELECT i.*,
                c.name as customer_name,
                c.company as customer_company,
                c.phone as customer_phone,
                c.email as customer_email
         FROM interactions i
         LEFT JOIN customers c ON c.id = i.customer_id
         ORDER BY
           CASE WHEN i.status = 'open' THEN 0 ELSE 1 END ASC,
           CASE WHEN i.follow_up_at IS NULL THEN 1 ELSE 0 END ASC,
           i.follow_up_at ASC,
           i.created_at DESC`,
      ),
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggleStatus(i: Interaction) {
    const conn = await db();
    const next = i.status === "open" ? "done" : "open";
    await conn.execute("UPDATE interactions SET status=? WHERE id=?", [
      next,
      i.id,
    ]);
    await refresh();
  }

  async function remove(i: InteractionWithCustomer) {
    if (!window.confirm(`Usunąć sprawę: „${i.summary}”?`)) return;
    const conn = await db();
    await conn.execute("DELETE FROM interactions WHERE id=?", [i.id]);
    toast.success("Sprawa usunięta");
    await refresh();
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "open" && r.status !== "open") return false;
      if (filter === "done" && r.status !== "done") return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        r.summary.toLowerCase().includes(s) ||
        r.body_md?.toLowerCase().includes(s) ||
        r.customer_name?.toLowerCase().includes(s) ||
        r.customer_company?.toLowerCase().includes(s) ||
        r.customer_phone?.toLowerCase().includes(s)
      );
    });
  }, [rows, filter, search]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter((r) => r.status === "open").length,
      done: rows.filter((r) => r.status === "done").length,
    }),
    [rows],
  );

  return (
    <>
      <PageHeader
        title="Sprawy"
        description="Wszystkie interakcje z klientami — telefony, maile, spotkania."
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Tabs
            value={filter}
            onValueChange={(v) => {
              const next = new URLSearchParams(params);
              next.set("filter", v);
              setParams(next);
            }}
          >
            <TabsList>
              <TabsTrigger value="open">Otwarte ({counts.open})</TabsTrigger>
              <TabsTrigger value="done">Zamknięte ({counts.done})</TabsTrigger>
              <TabsTrigger value="all">Wszystkie ({counts.all})</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="Szukaj po treści, kliencie, telefonie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            {rows.length === 0
              ? "Brak spraw. Dodaj pierwszą z poziomu klienta."
              : filter === "open"
                ? "Brawo! Żadnych otwartych spraw."
                : "Nic nie pasuje do filtrów."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((i) => {
              const Icon = KIND_ICONS[i.kind];
              const overdue =
                i.status === "open" &&
                i.follow_up_at !== null &&
                i.follow_up_at * 1000 < Date.now();
              return (
                <Card key={i.id}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <button
                      onClick={() => toggleStatus(i)}
                      className="p-1 hover:bg-muted rounded transition-colors shrink-0 mt-0.5"
                      title={
                        i.status === "open"
                          ? "Oznacz jako zamknięte"
                          : "Otwórz ponownie"
                      }
                    >
                      {i.status === "done" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{INTERACTION_KIND_LABELS[i.kind]}</span>
                        <span>·</span>
                        <span>{formatDate(i.created_at)}</span>
                        {i.customer_id && (
                          <>
                            <span>·</span>
                            <Link
                              to={`/customers/${i.customer_id}`}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <User className="h-3 w-3" />
                              {customerDisplayName({
                                id: i.customer_id,
                                name: i.customer_name,
                                company: i.customer_company,
                                phone: i.customer_phone,
                                email: i.customer_email,
                              })}
                            </Link>
                          </>
                        )}
                      </div>
                      <div
                        className={cn(
                          "font-medium",
                          i.status === "done" &&
                            "line-through text-muted-foreground",
                        )}
                      >
                        {i.summary}
                      </div>
                      {i.body_md && (
                        <div className="text-sm text-muted-foreground whitespace-pre-line">
                          {i.body_md}
                        </div>
                      )}
                      {i.follow_up_at && (
                        <div
                          className={cn(
                            "text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded",
                            overdue
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : i.status === "open"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "bg-muted text-muted-foreground line-through",
                          )}
                        >
                          <CalendarClock className="h-3 w-3" />
                          Follow-up: {formatFollowUp(i.follow_up_at)}
                          {overdue && " · po terminie"}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
