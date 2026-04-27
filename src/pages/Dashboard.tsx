import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, ListTodo, StickyNote } from "lucide-react";

type Stats = {
  customers: number;
  products: number;
  open_todos: number;
  notes: number;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
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
      const [n] = await conn.select<{ n: number }[]>(
        "SELECT COUNT(*) as n FROM notes",
      );
      setStats({ customers: c.n, products: p.n, open_todos: t.n, notes: n.n });
    })();
  }, []);

  const tiles = [
    { label: "Klienci", value: stats?.customers ?? "…", icon: Users },
    { label: "Produkty", value: stats?.products ?? "…", icon: Package },
    { label: "Otwarte zadania", value: stats?.open_todos ?? "…", icon: ListTodo },
    { label: "Notatki", value: stats?.notes ?? "…", icon: StickyNote },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Krótki przegląd Twojego sklepu."
      />
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
