import { useState, FormEvent, ReactNode } from "react";
import {
  db,
  type DriveType,
  DRIVE_TYPE_LABELS,
} from "@/lib/db";
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

const DRIVE_TYPES: DriveType[] = [
  "skrzydlowy",
  "przesuwny",
  "garazowy",
  "rolety",
  "szlabany",
  "inne",
];

export function QuickCreateProduct({
  trigger,
  onCreated,
}: {
  trigger: ReactNode;
  onCreated: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    const manufacturer = String(fd.get("manufacturer") ?? "") || null;
    const model = String(fd.get("model") ?? "") || null;
    const type = (fd.get("type") as DriveType) || null;

    const conn = await db();
    const result = await conn.execute(
      "INSERT INTO products (name, manufacturer, model, type) VALUES (?, ?, ?, ?)",
      [name, manufacturer, model, type],
    );
    toast.success("Produkt dodany");
    setOpen(false);
    if (typeof result.lastInsertId === "number") {
      onCreated(result.lastInsertId);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Szybki produkt</DialogTitle>
            <DialogDescription>
              Tylko nazwa — specyfikację techniczną uzupełnisz w „Produkty”.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="qp-name">Nazwa</Label>
              <Input
                id="qp-name"
                name="name"
                required
                autoFocus
                placeholder="np. GateMax SW-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="qp-manufacturer">Producent</Label>
                <Input id="qp-manufacturer" name="manufacturer" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qp-model">Model</Label>
                <Input id="qp-model" name="model" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qp-type">Typ napędu</Label>
              <Select name="type">
                <SelectTrigger>
                  <SelectValue placeholder="(opcjonalnie)" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DRIVE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
