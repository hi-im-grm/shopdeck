import { useEffect, useState, FormEvent } from "react";
import { db, type Customer } from "@/lib/db";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  async function refresh() {
    const conn = await db();
    setRows(
      await conn.select<Customer[]>(
        "SELECT * FROM customers ORDER BY created_at DESC",
      ),
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    const email = String(fd.get("email") ?? "") || null;
    const phone = String(fd.get("phone") ?? "") || null;
    const notes = String(fd.get("notes") ?? "") || null;

    const conn = await db();
    if (editing) {
      await conn.execute(
        "UPDATE customers SET name=?, email=?, phone=?, notes=? WHERE id=?",
        [name, email, phone, notes, editing.id],
      );
      toast.success("Klient zaktualizowany");
    } else {
      await conn.execute(
        "INSERT INTO customers (name, email, phone, notes) VALUES (?, ?, ?, ?)",
        [name, email, phone, notes],
      );
      toast.success("Klient dodany");
    }
    setOpen(false);
    setEditing(null);
    await refresh();
  }

  async function remove(id: number) {
    const conn = await db();
    await conn.execute("DELETE FROM customers WHERE id=?", [id]);
    toast.success("Klient usunięty");
    await refresh();
  }

  return (
    <>
      <PageHeader
        title="Klienci"
        description={`Łącznie: ${rows.length}`}
        action={
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Dodaj klienta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={save}>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Edytuj klienta" : "Nowy klient"}
                  </DialogTitle>
                  <DialogDescription>
                    Dane są zapisywane lokalnie w SQLite.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Imię i nazwisko</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={editing?.name ?? ""}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={editing?.email ?? ""}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Telefon</Label>
                      <Input
                        id="phone"
                        name="phone"
                        defaultValue={editing?.phone ?? ""}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notatki</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      defaultValue={editing?.notes ?? ""}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Zapisz</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-6">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Brak klientów. Dodaj pierwszego klikając „Dodaj klienta”.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="w-32 text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
