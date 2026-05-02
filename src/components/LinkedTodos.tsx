import { useEffect, useState, FormEvent } from "react";
import { db, type Todo } from "@/lib/db";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ListTodo, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EntityType = "customer" | "product";

function formatDueDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
  });
}

function isOverdue(ts: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return ts * 1000 < today.getTime();
}

export function LinkedTodos({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: number;
}) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [open, setOpen] = useState(false);

  const column = entityType === "customer" ? "customer_id" : "product_id";

  async function refresh() {
    const conn = await db();
    setTodos(
      await conn.select<Todo[]>(
        `SELECT * FROM todos WHERE ${column} = ? ORDER BY done ASC, due_date ASC NULLS LAST, created_at DESC`,
        [entityId],
      ),
    );
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    const dueDate = String(fd.get("due_date") ?? "");
    const due_date = dueDate
      ? Math.floor(new Date(dueDate).getTime() / 1000)
      : null;

    const customer_id = entityType === "customer" ? entityId : null;
    const product_id = entityType === "product" ? entityId : null;

    const conn = await db();
    await conn.execute(
      "INSERT INTO todos (title, customer_id, product_id, due_date) VALUES (?, ?, ?, ?)",
      [title, customer_id, product_id, due_date],
    );
    toast.success("Zadanie dodane");
    setOpen(false);
    await refresh();
  }

  async function toggleDone(t: Todo) {
    const conn = await db();
    await conn.execute("UPDATE todos SET done=? WHERE id=?", [
      t.done ? 0 : 1,
      t.id,
    ]);
    await refresh();
  }

  async function remove(t: Todo) {
    const conn = await db();
    await conn.execute("DELETE FROM todos WHERE id=?", [t.id]);
    await refresh();
    toast.success("Zadanie usunięte", {
      duration: 6000,
      action: {
        label: "Cofnij",
        onClick: async () => {
          const c = await db();
          await c.execute(
            `INSERT INTO todos (id, title, done, customer_id, product_id, due_date, position, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              t.id,
              t.title,
              t.done,
              t.customer_id,
              t.product_id,
              t.due_date,
              t.position,
              t.created_at,
            ],
          );
          toast.success("Cofnięto");
          await refresh();
        },
      },
    });
  }

  const open_count = todos.filter((t) => !t.done).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Todo ({open_count} otwartych z {todos.length})
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              Nowe zadanie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={add}>
              <DialogHeader>
                <DialogTitle>Nowe zadanie</DialogTitle>
                <DialogDescription>
                  Zadanie zostanie powiązane z tym{" "}
                  {entityType === "customer" ? "klientem" : "produktem"}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Co do zrobienia</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    autoFocus
                    placeholder="np. Oddzwonić ws. wyceny"
                  />
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
      </div>

      {todos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
          Brak zadań.
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((t) => {
            const overdue =
              !t.done && t.due_date !== null && isOverdue(t.due_date);
            return (
              <Card key={t.id} className="group">
                <CardContent className="p-3 flex items-start gap-3">
                  <Checkbox
                    checked={t.done === 1}
                    onCheckedChange={() => toggleDone(t)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm",
                        t.done && "line-through text-muted-foreground",
                      )}
                    >
                      {t.title}
                    </div>
                    {t.due_date !== null && (
                      <div
                        className={cn(
                          "flex items-center gap-1 text-xs mt-0.5",
                          overdue
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {formatDueDate(t.due_date)}
                        {overdue && " · po terminie"}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => remove(t)}
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
  );
}
