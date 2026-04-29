import { useState, FormEvent, ReactNode } from "react";
import { db, type CustomerKind } from "@/lib/db";
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
import { toast } from "sonner";

export function QuickCreateCustomer({
  trigger,
  onCreated,
}: {
  trigger: ReactNode;
  onCreated: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CustomerKind>("b2c");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    const company = String(fd.get("company") ?? "") || null;
    const phone = String(fd.get("phone") ?? "") || null;
    const email = String(fd.get("email") ?? "") || null;

    const conn = await db();
    const result = await conn.execute(
      "INSERT INTO customers (name, kind, company, phone, email) VALUES (?, ?, ?, ?, ?)",
      [name, kind, company, phone, email],
    );
    toast.success("Klient dodany");
    setOpen(false);
    setKind("b2c");
    if (typeof result.lastInsertId === "number") {
      onCreated(result.lastInsertId);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setKind("b2c");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Szybki klient</DialogTitle>
            <DialogDescription>
              Tylko podstawy — pozostałe dane uzupełnisz potem w „Klienci”.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Typ</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as CustomerKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2c">B2C — osoba</SelectItem>
                  <SelectItem value="b2b">B2B — firma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qc-name">
                {kind === "b2b" ? "Osoba kontaktowa" : "Imię i nazwisko"}
              </Label>
              <Input id="qc-name" name="name" required autoFocus />
            </div>
            {kind === "b2b" && (
              <div className="grid gap-2">
                <Label htmlFor="qc-company">Firma</Label>
                <Input id="qc-company" name="company" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="qc-phone">Telefon</Label>
                <Input id="qc-phone" name="phone" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qc-email">Email</Label>
                <Input id="qc-email" name="email" type="email" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Dodaj</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
