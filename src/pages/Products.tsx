import { useEffect, useMemo, useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  db,
  type Product,
  type ProductAttribute,
  type DriveType,
  DRIVE_TYPE_LABELS,
  formatPLN,
  parsePLN,
  parseProductAttributes,
  stringifyProductAttributes,
} from "@/lib/db";
import { AttributesEditor } from "@/components/AttributesEditor";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Weight,
  Ruler,
  Zap,
  GitCompare,
  Download,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { toCSV, downloadCSV, parseCSV, unixToISO } from "@/lib/csv";
import { logChange, logDelete } from "@/lib/audit";
import { recordWriteForBackup } from "@/lib/autobackup";

const DRIVE_TYPES: DriveType[] = [
  "skrzydlowy",
  "przesuwny",
  "garazowy",
  "rolety",
  "szlabany",
  "inne",
];

export function Products() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<DriveType | "all">("all");
  const [minWeight, setMinWeight] = useState("");
  const [minLength, setMinLength] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);

  // Sync attribute editor state when opening dialog for edit/new.
  useEffect(() => {
    if (open) {
      setAttributes(
        editing ? parseProductAttributes(editing.attributes_json) : [],
      );
    }
  }, [open, editing]);

  async function refresh() {
    const conn = await db();
    setRows(
      await conn.select<Product[]>(
        "SELECT * FROM products ORDER BY manufacturer, name",
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

    const manufacturer = String(fd.get("manufacturer") ?? "") || null;
    const model = String(fd.get("model") ?? "") || null;
    const sku = String(fd.get("sku") ?? "") || null;
    const type = (fd.get("type") as DriveType) || null;
    const price_cents = parsePLN(String(fd.get("price") ?? "0"));
    const pros = String(fd.get("pros") ?? "") || null;
    const cons = String(fd.get("cons") ?? "") || null;
    const description = String(fd.get("description") ?? "") || null;
    const image_data_url = String(fd.get("image_data_url") ?? "") || null;
    const notes = String(fd.get("notes") ?? "") || null;
    const attributes_json = stringifyProductAttributes(attributes);

    const conn = await db();
    let savedId: number;
    if (editing) {
      const [before] = await conn.select<Product[]>(
        "SELECT * FROM products WHERE id=?",
        [editing.id],
      );
      // Log price change BEFORE the update so we capture the old value.
      if (editing.price_cents !== price_cents) {
        await conn.execute(
          "INSERT INTO product_price_history (product_id, old_price_cents, new_price_cents) VALUES (?, ?, ?)",
          [editing.id, editing.price_cents, price_cents],
        );
      }
      // NOTE: technical spec columns (max_weight_kg/max_length_m/power_w/
       // voltage/duty_cycle/ip_rating) are intentionally NOT in this UPDATE.
       // Form no longer edits them — values stay as-is for legacy/seeded
       // products. New custom attributes go through attributes_json.
      await conn.execute(
        `UPDATE products SET
          name=?, manufacturer=?, model=?, sku=?, type=?,
          price_cents=?,
          pros=?, cons=?, description=?, image_data_url=?, notes=?,
          attributes_json=?,
          updated_at=unixepoch()
        WHERE id=?`,
        [
          name, manufacturer, model, sku, type,
          price_cents,
          pros, cons, description, image_data_url, notes,
          attributes_json,
          editing.id,
        ],
      );
      const [after] = await conn.select<Product[]>(
        "SELECT * FROM products WHERE id=?",
        [editing.id],
      );
      await logChange(
        "product",
        editing.id,
        before as unknown as Record<string, unknown>,
        after as unknown as Record<string, unknown>,
      );
      savedId = editing.id;
      toast.success("Produkt zaktualizowany");
    } else {
      // New products use only minimal core fields + dynamic attributes.
      // Legacy spec columns default to NULL via schema.
      const res = await conn.execute(
        `INSERT INTO products (
          name, manufacturer, model, sku, type,
          price_cents,
          pros, cons, description, image_data_url, notes,
          attributes_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          name, manufacturer, model, sku, type,
          price_cents,
          pros, cons, description, image_data_url, notes,
          attributes_json,
        ],
      );
      savedId = Number(res.lastInsertId ?? 0);
      const [after] = await conn.select<Product[]>(
        "SELECT * FROM products WHERE id=?",
        [savedId],
      );
      await logChange(
        "product",
        savedId,
        null,
        after as unknown as Record<string, unknown>,
      );
      toast.success("Produkt dodany");
    }
    void recordWriteForBackup();
    setOpen(false);
    setEditing(null);
    await refresh();
  }

  async function remove(p: Product) {
    if (!window.confirm(`Usunąć produkt „${p.name}”?`)) return;
    const conn = await db();
    const [snapshot] = await conn.select<Product[]>(
      "SELECT * FROM products WHERE id=?",
      [p.id],
    );
    await conn.execute("DELETE FROM products WHERE id=?", [p.id]);
    await logDelete(
      "product",
      p.id,
      snapshot as unknown as Record<string, unknown>,
    );
    void recordWriteForBackup();
    toast.success("Produkt usunięty");
    setSelected((s) => {
      const next = new Set(s);
      next.delete(p.id);
      return next;
    });
    await refresh();
  }

  const filtered = useMemo(() => {
    const minW = parseFloat(minWeight) || 0;
    const minL = parseFloat(minLength) || 0;
    const maxP = maxPrice ? parsePLN(maxPrice) : Infinity;
    const s = search.toLowerCase();
    return rows.filter((p) => {
      if (filterType !== "all" && p.type !== filterType) return false;
      if (minW > 0 && (p.max_weight_kg ?? 0) < minW) return false;
      if (minL > 0 && (p.max_length_m ?? 0) < minL) return false;
      if (p.price_cents > maxP) return false;
      if (s) {
        const hay = [
          p.name,
          p.manufacturer,
          p.model,
          p.sku,
          p.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, search, filterType, minWeight, minLength, maxPrice]);

  function exportCSV() {
    if (rows.length === 0) {
      toast.info("Brak produktów do eksportu");
      return;
    }
    const csv = toCSV(rows, [
      { header: "id", get: (p) => p.id },
      { header: "name", get: (p) => p.name },
      { header: "manufacturer", get: (p) => p.manufacturer },
      { header: "model", get: (p) => p.model },
      { header: "sku", get: (p) => p.sku },
      { header: "type", get: (p) => p.type },
      { header: "max_weight_kg", get: (p) => p.max_weight_kg },
      { header: "max_length_m", get: (p) => p.max_length_m },
      { header: "power_w", get: (p) => p.power_w },
      { header: "voltage", get: (p) => p.voltage },
      { header: "duty_cycle", get: (p) => p.duty_cycle },
      { header: "ip_rating", get: (p) => p.ip_rating },
      { header: "price_pln", get: (p) => (p.price_cents / 100).toFixed(2) },
      { header: "currency", get: (p) => p.currency },
      { header: "pros", get: (p) => p.pros },
      { header: "cons", get: (p) => p.cons },
      { header: "description", get: (p) => p.description },
      { header: "notes", get: (p) => p.notes },
      { header: "created_at", get: (p) => unixToISO(p.created_at) },
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`shopdeck-produkty-${stamp}.csv`, csv);
    toast.success(`Wyeksportowano ${rows.length} produktów`);
  }

  async function importCSVFile(file: File) {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      toast.error("Plik CSV pusty lub bez nagłówka");
      return;
    }
    const [header, ...dataRows] = parsed;
    const idx = (name: string) => header.indexOf(name);

    // required column
    if (idx("name") === -1) {
      toast.error("Brak kolumny „name” w pliku CSV");
      return;
    }
    const required = dataRows.filter((r) => (r[idx("name")] ?? "").trim());
    if (!window.confirm(`Zaimportować ${required.length} produktów z pliku?`)) {
      return;
    }

    const conn = await db();
    let inserted = 0;
    let skipped = 0;
    for (const r of required) {
      const sku = (r[idx("sku")] ?? "").trim() || null;
      // skip if SKU already exists
      if (sku) {
        const [dup] = await conn.select<{ n: number }[]>(
          "SELECT COUNT(*) as n FROM products WHERE sku=?",
          [sku],
        );
        if (dup.n > 0) {
          skipped++;
          continue;
        }
      }
      const pickNum = (col: string) => {
        const v = (r[idx(col)] ?? "").trim();
        const n = parseFloat(v.replace(",", "."));
        return Number.isFinite(n) ? n : null;
      };
      const pickStr = (col: string) => {
        const i = idx(col);
        if (i === -1) return null;
        const v = (r[i] ?? "").trim();
        return v || null;
      };
      const name = (r[idx("name")] ?? "").trim();
      const price_cents = (() => {
        // accept "price_pln" or "price_cents"
        const pln = pickNum("price_pln");
        if (pln !== null) return Math.round(pln * 100);
        const cents = pickNum("price_cents");
        return cents !== null ? Math.round(cents) : 0;
      })();
      await conn.execute(
        `INSERT INTO products (
           name, manufacturer, model, sku, type,
           max_weight_kg, max_length_m, power_w, voltage,
           duty_cycle, ip_rating, price_cents, currency,
           pros, cons, description, notes,
           external_links_json, attributes_json
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, '{}', '{}')`,
        [
          name,
          pickStr("manufacturer"),
          pickStr("model"),
          sku,
          pickStr("type"),
          pickNum("max_weight_kg"),
          pickNum("max_length_m"),
          pickNum("power_w"),
          pickStr("voltage"),
          pickStr("duty_cycle"),
          pickStr("ip_rating"),
          price_cents,
          pickStr("currency") ?? "PLN",
          pickStr("pros"),
          pickStr("cons"),
          pickStr("description"),
          pickStr("notes"),
        ],
      );
      inserted++;
    }
    await refresh();
    toast.success(
      `Zaimportowano ${inserted} produktów${skipped > 0 ? ` (pominięto ${skipped} — duplikaty SKU)` : ""}`,
    );
  }

  function toggleSelect(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goToCompare() {
    const ids = Array.from(selected).join(",");
    navigate(`/compare?ids=${ids}`);
  }

  return (
    <>
      <PageHeader
        title="Produkty"
        description={`Łącznie: ${rows.length}${rows.length !== filtered.length ? ` · widoczne: ${filtered.length}` : ""}${selected.size > 0 ? ` · zaznaczone: ${selected.size}` : ""}`}
        action={
          <div className="flex gap-2">
            {selected.size >= 2 && (
              <Button variant="secondary" onClick={goToCompare}>
                <GitCompare className="h-4 w-4" />
                Porównaj ({selected.size})
              </Button>
            )}
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Eksport CSV
            </Button>
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importCSVFile(f);
                  e.currentTarget.value = "";
                }}
              />
              <Button variant="outline" asChild>
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Import CSV
                </span>
              </Button>
            </label>
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
                  Dodaj produkt
                </Button>
              </DialogTrigger>
              <ProductDialog
                editing={editing}
                onSubmit={save}
                attributes={attributes}
                setAttributes={setAttributes}
              />
            </Dialog>
          </div>
        }
      />

      {/* Filters bar */}
      <div className="px-6 py-4 border-b bg-muted/30 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Szukaj</Label>
          <Input
            placeholder="nazwa, producent, model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Typ napędu</Label>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as DriveType | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {DRIVE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {DRIVE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            Min. masa (kg)
          </Label>
          <Input
            type="number"
            placeholder="np. 300"
            value={minWeight}
            onChange={(e) => setMinWeight(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            Min. długość (m)
          </Label>
          <Input
            type="number"
            step="0.1"
            placeholder="np. 4"
            value={minLength}
            onChange={(e) => setMinLength(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            Max. cena (PLN)
          </Label>
          <Input
            type="number"
            placeholder="np. 2500"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="p-6">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            {rows.length === 0
              ? "Brak produktów. Dodaj pierwszy lub załaduj przykładowe dane z Dashboard."
              : "Żaden produkt nie pasuje do filtrów."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className={
                  selected.has(p.id)
                    ? "ring-2 ring-primary transition-all"
                    : "transition-all"
                }
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selected.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                        className="mt-1"
                      />
                      <div>
                        <Link
                          to={`/products/${p.id}`}
                          className="font-semibold leading-tight hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.manufacturer && (
                          <div className="text-xs text-muted-foreground">
                            {p.manufacturer}
                            {p.model && ` · ${p.model}`}
                          </div>
                        )}
                      </div>
                    </div>
                    {p.type && (
                      <Badge variant="secondary" className="shrink-0">
                        {DRIVE_TYPE_LABELS[p.type]}
                      </Badge>
                    )}
                  </div>

                  {p.image_data_url && (
                    <img
                      src={p.image_data_url}
                      alt={p.name}
                      className="w-full h-32 object-cover rounded-md bg-muted"
                    />
                  )}

                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {p.max_weight_kg !== null && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Weight className="h-3 w-3" />
                        <span>{p.max_weight_kg} kg</span>
                      </div>
                    )}
                    {p.max_length_m !== null && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Ruler className="h-3 w-3" />
                        <span>{p.max_length_m} m</span>
                      </div>
                    )}
                    {p.power_w !== null && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        <span>{p.power_w} W</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-lg font-semibold tabular-nums">
                      {formatPLN(p.price_cents)}
                    </div>
                    <div className="space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ProductDialog({
  editing,
  onSubmit,
  attributes,
  setAttributes,
}: {
  editing: Product | null;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  attributes: ProductAttribute[];
  setAttributes: (next: ProductAttribute[]) => void;
}) {
  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <form onSubmit={onSubmit}>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edytuj produkt" : "Nowy produkt"}
          </DialogTitle>
          <DialogDescription>
            <Package className="inline h-3 w-3 mr-1" />
            Specyfikacja techniczna napędu.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="grid gap-2 col-span-2">
            <Label htmlFor="name">Nazwa</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              placeholder="np. GateMax SW-300"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manufacturer">Producent</Label>
            <Input
              id="manufacturer"
              name="manufacturer"
              defaultValue={editing?.manufacturer ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" defaultValue={editing?.model ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" defaultValue={editing?.sku ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Typ napędu</Label>
            <Select name="type" defaultValue={editing?.type ?? undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz" />
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

          <div className="grid gap-2 col-span-2">
            <Label htmlFor="price">Cena (PLN)</Label>
            <Input
              id="price"
              name="price"
              placeholder="np. 1899,00"
              defaultValue={
                editing ? (editing.price_cents / 100).toFixed(2) : ""
              }
            />
          </div>

          <div className="grid gap-2 col-span-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={editing?.description ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pros">Zalety</Label>
            <Textarea
              id="pros"
              name="pros"
              rows={4}
              placeholder="- Cichy silnik&#10;- Plynny start"
              defaultValue={editing?.pros ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cons">Wady</Label>
            <Textarea
              id="cons"
              name="cons"
              rows={4}
              placeholder="- Brak radia w zestawie"
              defaultValue={editing?.cons ?? ""}
            />
          </div>

          <div className="grid gap-2 col-span-2">
            <Label htmlFor="image_data_url">URL zdjęcia / data URL</Label>
            <Input
              id="image_data_url"
              name="image_data_url"
              placeholder="https://… lub data:image/…"
              defaultValue={editing?.image_data_url ?? ""}
            />
          </div>

          <div className="grid gap-2 col-span-2">
            <Label htmlFor="notes">Notatki sprzedawcy</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={editing?.notes ?? ""}
            />
          </div>

          <div className="grid gap-2 col-span-2">
            <Label>Dodatkowe atrybuty</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Pary klucz/wartość — np. „Akcesoria w komplecie” / „Pilot 2 szt”.
            </p>
            <AttributesEditor value={attributes} onChange={setAttributes} />
          </div>
        </div>

        <DialogFooter>
          <Button type="submit">Zapisz</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
