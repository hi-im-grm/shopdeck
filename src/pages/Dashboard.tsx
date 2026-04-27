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
} from "lucide-react";
import { toast } from "sonner";

type Stats = {
  customers: number;
  products: number;
  open_todos: number;
  open_interactions: number;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

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
  }

  useEffect(() => {
    refresh();
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
      label: "Otwarte interakcje",
      value: stats?.open_interactions ?? "…",
      icon: Phone,
      to: "/customers",
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
