import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { db, type Customer, type CustomerKind } from "@/lib/db";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2, User } from "lucide-react";
import { toast } from "sonner";

export function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [kind, setKind] = useState<CustomerKind>("b2c");

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

  useEffect(() => {
    setKind(editing?.kind ?? "b2c");
  }, [editing, open]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    const company = String(fd.get("company") ?? "") || null;
    const nip = String(fd.get("nip") ?? "") || null;
    const email = String(fd.get("email") ?? "") || null;
    const phone = String(fd.get("phone") ?? "") || null;
    const address = String(fd.get("address") ?? "") || null;
    const notes = String(fd.get("notes") ?? "") || null;

    const conn = await db();
    if (editing) {
      await conn.execute(
        "UPDATE customers SET name=?, kind=?, company=?, nip=?, email=?, phone=?, address=?, notes=? WHERE id=?",
        [name, kind, company, nip, email, phone, address, notes, editing.id],
      );
      toast.success("Klient zaktualizowany");
    } else {
      await conn.execute(
        "INSERT INTO customers (name, kind, company, nip, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, kind, company, nip, email, phone, address, notes],
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

  const filtered = rows.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      c.company?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s) ||
      c.nip?.toLowerCase().includes(s)
    );
  });

  return (
    <>
      <PageHeader
        title="Klienci"
        description={`Łącznie: ${rows.length}${search ? ` · widoczne: ${filtered.length}` : ""}`}
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
            <DialogContent className="max-w-lg">
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
                    <Label>Typ klienta</Label>
                    <Select
                      value={kind}
                      onValueChange={(v) => setKind(v as CustomerKind)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="b2c">B2C — osoba prywatna</SelectItem>
                        <SelectItem value="b2b">B2B — firma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">
                      {kind === "b2b" ? "Osoba kontaktowa" : "Imię i nazwisko"}
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={editing?.name ?? ""}
                    />
                  </div>
                  {kind === "b2b" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="company">Firma</Label>
                        <Input
                          id="company"
                          name="company"
                          defaultValue={editing?.company ?? ""}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="nip">NIP</Label>
                        <Input
                          id="nip"
                          name="nip"
                          defaultValue={editing?.nip ?? ""}
                        />
                      </div>
                    </div>
                  )}
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
                    <Label htmlFor="address">Adres</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={editing?.address ?? ""}
                    />
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
      <div className="p-6 space-y-4">
        <Input
          placeholder="Szukaj po nazwie, firmie, email, telefonie, NIP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            {rows.length === 0
              ? "Brak klientów. Dodaj pierwszego klikając „Dodaj klienta”."
              : "Brak wyników dla tego wyszukiwania."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nazwa / Firma</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead className="w-32 text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.kind === "b2b" ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/customers/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    {c.company && (
                      <div className="text-xs text-muted-foreground">
                        {c.company}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                    {!c.email && !c.phone && "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.nip ? (
                      <Badge variant="secondary">{c.nip}</Badge>
                    ) : (
                      "—"
                    )}
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
