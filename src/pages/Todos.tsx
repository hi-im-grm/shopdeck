import { useEffect, useState, FormEvent, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  db,
  type Todo,
  type Customer,
  type Product,
} from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, User, Package, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TodoWithRefs = Todo & {
  customer_name: string | null;
  product_name: string | null;
};

type Filter = "all" | "open" | "done";

function formatDueDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
  });
}

function isOverdue(ts: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return ts * 1000 < today.getTime();
}

export function Todos() {
  const [rows, setRows] = useState<TodoWithRefs[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [open, setOpen] = useState(false);

  async function refresh() {
    const conn = await db();
    const todos = await conn.select<TodoWithRefs[]>(
      `SELECT t.*,
              c.name as customer_name,
              p.name as product_name
       FROM todos t
       LEFT JOIN customers c ON c.id = t.customer_id
       LEFT JOIN products p ON p.id = t.product_id
       ORDER BY t.done ASC, t.due_date ASC NULLS LAST, t.created_at DESC`,
    );
    setRows(todos);
    setCustomers(
      await conn.select<Customer[]>(
        "SELECT * FROM customers ORDER BY name",
      ),
    );
    setProducts(
      await conn.select<Product[]>(
        "SELECT * FROM products ORDER BY manufacturer, name",
      ),
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;

    const customerId = fd.get("customer_id");
    const productId = fd.get("product_id");
    const dueDate = String(fd.get("due_date") ?? "");

    const customer_id =
      customerId && customerId !== "none" ? Number(customerId) : null;
    const product_id =
      productId && productId !== "none" ? Number(productId) : null;
    const due_date = dueDate
      ? Math.floor(new Date(dueDate).getTime() / 1000)
      : null;

    const conn = await db();
    await conn.execute(
      "INSERT INTO todos (title, customer_id, product_id, due_date) VALUES (?, ?, ?, ?)",
      [title, customer_id, product_id, due_date],
    );
    toast.success("Zadanie dodane");
    setOpen(false);
    await refresh();
  }

  async function toggleDone(t: TodoWithRefs) {
    const conn = await db();
    await conn.execute("UPDATE todos SET done=? WHERE id=?", [
      t.done ? 0 : 1,
      t.id,
    ]);
    await refresh();
  }

  async function remove(id: number) {
    const conn = await db();
    await conn.execute("DELETE FROM todos WHERE id=?", [id]);
    toast.success("Zadanie usunięte");
    await refresh();
  }

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "open") return rows.filter((t) => !t.done);
    return rows.filter((t) => t.done);
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter((t) => !t.done).length,
      done: rows.filter((t) => t.done).length,
    }),
    [rows],
  );

  return (
    <>
      <PageHeader
        title="Todo"
        description="Lista zadań — możesz przypiąć do klienta lub produktu."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Nowe zadanie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={add}>
                <DialogHeader>
                  <DialogTitle>Nowe zadanie</DialogTitle>
                  <DialogDescription>
                    Powiązanie z klientem/produktem jest opcjonalne.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Co do zrobienia</Label>
                    <Input
                      id="title"
                      name="title"
                      required
                      placeholder="np. Oddzwonić do Kowalskiego ws. wyceny"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="customer_id">Klient</Label>
                      <Select name="customer_id" defaultValue="none">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— brak —</SelectItem>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                              {c.company ? ` (${c.company})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product_id">Produkt</Label>
                      <Select name="product_id" defaultValue="none">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— brak —</SelectItem>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_date">Termin (opcjonalny)</Label>
                    <Input id="due_date" name="due_date" type="date" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Dodaj</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6 space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="open">Otwarte ({counts.open})</TabsTrigger>
            <TabsTrigger value="done">Zakończone ({counts.done})</TabsTrigger>
            <TabsTrigger value="all">Wszystkie ({counts.all})</TabsTrigger>
          </TabsList>
        </Tabs>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            {rows.length === 0
              ? "Brak zadań. Dodaj pierwsze klikając „Nowe zadanie”."
              : filter === "open"
                ? "Brawo! Nie masz otwartych zadań. 🎉"
                : "Brak zadań w tej kategorii."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const overdue =
                !t.done && t.due_date !== null && isOverdue(t.due_date);
              return (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <Checkbox
                      checked={t.done === 1}
                      onCheckedChange={() => toggleDone(t)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div
                        className={cn(
                          "font-medium",
                          t.done && "line-through text-muted-foreground",
                        )}
                      >
                        {t.title}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {t.customer_id && t.customer_name && (
                          <Link
                            to={`/customers/${t.customer_id}`}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <User className="h-3 w-3" />
                            {t.customer_name}
                          </Link>
                        )}
                        {t.product_name && (
                          <Link
                            to="/products"
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            <Package className="h-3 w-3" />
                            {t.product_name}
                          </Link>
                        )}
                        {t.due_date !== null && (
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              overdue && "text-destructive",
                            )}
                          >
                            <Calendar className="h-3 w-3" />
                            {formatDueDate(t.due_date)}
                            {overdue && " · po terminie"}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => remove(t.id)}
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
