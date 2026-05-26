import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  db,
  type OfferTemplate,
  type OfferTemplateItem,
  type Product,
  type Customer,
  parseTemplateItems,
  formatPLN,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Send,
  X,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

type ItemDraft = OfferTemplateItem;

function emptyItem(): ItemDraft {
  return { product_id: 0, qty: 1, note: null };
}

export function Templates() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<OfferTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OfferTemplate | null>(null);
  const [draftItems, setDraftItems] = useState<ItemDraft[]>([]);

  const [useDialogOf, setUseDialogOf] = useState<OfferTemplate | null>(null);
  const [useCustomer, setUseCustomer] = useState<string>("none");

  async function refresh() {
    const conn = await db();
    setRows(
      await conn.select<OfferTemplate[]>(
        "SELECT * FROM offer_templates ORDER BY updated_at DESC",
      ),
    );
    setProducts(
      await conn.select<Product[]>(
        "SELECT * FROM products ORDER BY manufacturer, name",
      ),
    );
    setCustomers(
      await conn.select<Customer[]>("SELECT * FROM customers ORDER BY name"),
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (open) {
      setDraftItems(editing ? parseTemplateItems(editing.items_json) : []);
    }
  }, [open, editing]);

  const productById = useMemo(() => {
    const m = new Map<number, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  function itemTotal(item: OfferTemplateItem): number {
    const p = productById.get(item.product_id);
    return p ? p.price_cents * item.qty : 0;
  }

  function templateTotal(items: OfferTemplateItem[]): number {
    return items.reduce((sum, i) => sum + itemTotal(i), 0);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    const description = String(fd.get("description") ?? "") || null;
    const cleanItems = draftItems.filter(
      (i) => i.product_id > 0 && i.qty > 0,
    );
    const items_json = JSON.stringify(cleanItems);

    const conn = await db();
    if (editing) {
      await conn.execute(
        "UPDATE offer_templates SET name=?, description=?, items_json=?, updated_at=unixepoch() WHERE id=?",
        [name, description, items_json, editing.id],
      );
      toast.success("Szablon zaktualizowany");
    } else {
      await conn.execute(
        "INSERT INTO offer_templates (name, description, items_json) VALUES (?, ?, ?)",
        [name, description, items_json],
      );
      toast.success("Szablon zapisany");
    }
    setOpen(false);
    setEditing(null);
    await refresh();
  }

  async function remove(t: OfferTemplate) {
    if (!window.confirm(`Usunąć szablon „${t.name}”?`)) return;
    const conn = await db();
    await conn.execute("DELETE FROM offer_templates WHERE id=?", [t.id]);
    toast.success("Usunięto");
    await refresh();
  }

  /** Generate a Markdown offer note from a template + chosen customer. */
  async function useTemplate() {
    if (!useDialogOf) return;
    if (useCustomer === "none") {
      toast.error("Wybierz klienta");
      return;
    }
    const customerId = Number(useCustomer);
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    const items = parseTemplateItems(useDialogOf.items_json);
    const lines: string[] = [];
    lines.push(`# Oferta: ${useDialogOf.name}`);
    lines.push("");
    lines.push(`**Klient:** ${customer.name}${customer.company ? ` (${customer.company})` : ""}`);
    lines.push(`**Data:** ${new Date().toLocaleDateString("pl-PL")}`);
    if (useDialogOf.description) {
      lines.push("");
      lines.push(useDialogOf.description);
    }
    lines.push("");
    lines.push("## Pozycje");
    lines.push("");
    lines.push("| # | Produkt | Ilość | Cena | Razem |");
    lines.push("|---|---------|------:|-----:|------:|");
    let total = 0;
    items.forEach((it, idx) => {
      const p = productById.get(it.product_id);
      if (!p) return;
      const row = p.price_cents * it.qty;
      total += row;
      lines.push(
        `| ${idx + 1} | ${p.name} | ${it.qty} | ${formatPLN(p.price_cents)} | ${formatPLN(row)} |`,
      );
      if (it.note) {
        lines.push(`|   | _${it.note}_ |   |   |   |`);
      }
    });
    lines.push("");
    lines.push(`**Razem: ${formatPLN(total)}**`);

    const body_md = lines.join("\n");
    const title = `Oferta: ${useDialogOf.name} — ${customer.name}`;

    const conn = await db();
    await conn.execute(
      "INSERT INTO notes (title, body_md, customer_id) VALUES (?, ?, ?)",
      [title, body_md, customerId],
    );
    toast.success("Oferta zapisana jako notatka klienta");
    setUseDialogOf(null);
    setUseCustomer("none");
    navigate(`/customers/${customerId}`);
  }

  // Draft item helpers (controlled)
  function updateDraftItem(idx: number, patch: Partial<ItemDraft>) {
    setDraftItems(
      draftItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }
  function removeDraftItem(idx: number) {
    setDraftItems(draftItems.filter((_, i) => i !== idx));
  }
  function addDraftItem() {
    setDraftItems([...draftItems, emptyItem()]);
  }

  return (
    <>
      <PageHeader
        title="Szablony ofert"
        description="Gotowe pakiety produktów — np. „brama skrzydłowa dom”, „brama przemysłowa”. Użyj szablonu, żeby wygenerować ofertę dla klienta."
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
                Nowy szablon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={save}>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Edytuj szablon" : "Nowy szablon oferty"}
                  </DialogTitle>
                  <DialogDescription>
                    Zestaw produktów z domyślnymi ilościami. Po użyciu generuje
                    notatkę Markdown z tabelą cen.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nazwa</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="np. Brama skrzydłowa dom"
                      defaultValue={editing?.name ?? ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Opis (Markdown)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={3}
                      placeholder="np. Zestaw na bramę skrzydłową do 4m, montaż w cenie."
                      defaultValue={editing?.description ?? ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Pozycje</Label>
                    {products.length === 0 && (
                      <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                        Brak produktów w bazie. Dodaj produkty, żeby móc zbudować
                        szablon.
                      </div>
                    )}
                    {draftItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Brak pozycji.
                      </p>
                    ) : (
                      draftItems.map((it, i) => {
                        const p = productById.get(it.product_id);
                        return (
                          <div
                            key={i}
                            className="grid grid-cols-12 gap-2 items-start"
                          >
                            <div className="col-span-6">
                              <Select
                                value={
                                  it.product_id > 0 ? String(it.product_id) : ""
                                }
                                onValueChange={(v) =>
                                  updateDraftItem(i, { product_id: Number(v) })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Wybierz produkt" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                      {p.name}
                                      {p.manufacturer ? ` · ${p.manufacturer}` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Input
                                type="number"
                                min={1}
                                value={it.qty}
                                onChange={(e) =>
                                  updateDraftItem(i, {
                                    qty: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                              />
                            </div>
                            <div className="col-span-3 text-sm text-muted-foreground self-center tabular-nums text-right">
                              {p
                                ? formatPLN(p.price_cents * it.qty)
                                : "—"}
                            </div>
                            <div className="col-span-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDraftItem(i)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="col-span-12">
                              <Input
                                value={it.note ?? ""}
                                onChange={(e) =>
                                  updateDraftItem(i, {
                                    note: e.target.value || null,
                                  })
                                }
                                placeholder="Komentarz do pozycji (opcjonalny)"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDraftItem}
                      disabled={products.length === 0}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Dodaj pozycję
                    </Button>
                    {draftItems.length > 0 && (
                      <div className="text-right text-sm font-semibold tabular-nums border-t pt-2">
                        Razem: {formatPLN(templateTotal(draftItems))}
                      </div>
                    )}
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
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground space-y-2">
            <Layers className="h-8 w-8 mx-auto" />
            <div>Brak szablonów ofert.</div>
            <p className="text-sm">
              Stwórz pierwszy — np. „Brama skrzydłowa dom” z napędem,
              fotokomórkami i pilotami.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((t) => {
              const items = parseTemplateItems(t.items_json);
              const total = templateTotal(items);
              return (
                <Card key={t.id} className="flex flex-col">
                  <CardContent className="p-4 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{t.name}</h3>
                      <Badge variant="secondary" className="shrink-0">
                        {items.length} poz.
                      </Badge>
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {t.description}
                      </p>
                    )}
                    <div className="space-y-1 pt-2 border-t">
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Brak pozycji.
                        </p>
                      ) : (
                        items.slice(0, 4).map((it, i) => {
                          const p = productById.get(it.product_id);
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs gap-2"
                            >
                              <span className="truncate flex items-center gap-1 text-muted-foreground">
                                <Package className="h-3 w-3 shrink-0" />
                                {it.qty}× {p?.name ?? "(usunięty produkt)"}
                              </span>
                              <span className="tabular-nums shrink-0">
                                {p
                                  ? formatPLN(p.price_cents * it.qty)
                                  : "—"}
                              </span>
                            </div>
                          );
                        })
                      )}
                      {items.length > 4 && (
                        <div className="text-xs text-muted-foreground">
                          +{items.length - 4} więcej…
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Razem</span>
                      <span className="text-lg font-semibold tabular-nums">
                        {formatPLN(total)}
                      </span>
                    </div>
                  </CardContent>
                  <div className="p-2 border-t flex items-center justify-between gap-1">
                    <Button
                      size="sm"
                      onClick={() => setUseDialogOf(t)}
                      disabled={items.length === 0 || customers.length === 0}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Użyj
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(t);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(t)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* "Use template" dialog */}
      <Dialog
        open={useDialogOf !== null}
        onOpenChange={(o) => {
          if (!o) {
            setUseDialogOf(null);
            setUseCustomer("none");
          }
        }}
      >
        <DialogContent>
          {useDialogOf && (
            <>
              <DialogHeader>
                <DialogTitle>Użyj szablonu: {useDialogOf.name}</DialogTitle>
                <DialogDescription>
                  Wybierz klienta — wygenerujemy ofertę jako notatkę Markdown
                  przypiętą do karty klienta.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Klient</Label>
                  <Select
                    value={useCustomer}
                    onValueChange={setUseCustomer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz klienta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— wybierz —</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                          {c.company ? ` (${c.company})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={useTemplate}
                  disabled={useCustomer === "none"}
                >
                  <Send className="h-4 w-4" />
                  Wygeneruj ofertę
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
