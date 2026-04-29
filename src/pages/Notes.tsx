import { useEffect, useState, FormEvent, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  db,
  type Note,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, User, Package, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { QuickCreateCustomer } from "@/components/QuickCreateCustomer";
import { QuickCreateProduct } from "@/components/QuickCreateProduct";

type NoteWithRefs = Note & {
  customer_name: string | null;
  product_name: string | null;
};

type Filter = "all" | "free" | "customer" | "product";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Notes() {
  const [rows, setRows] = useState<NoteWithRefs[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NoteWithRefs | null>(null);
  const [customerSel, setCustomerSel] = useState<string>("none");
  const [productSel, setProductSel] = useState<string>("none");
  const [previewOf, setPreviewOf] = useState<NoteWithRefs | null>(null);

  async function refresh() {
    const conn = await db();
    setRows(
      await conn.select<NoteWithRefs[]>(
        `SELECT n.*,
                c.name as customer_name,
                p.name as product_name
         FROM notes n
         LEFT JOIN customers c ON c.id = n.customer_id
         LEFT JOIN products p ON p.id = n.product_id
         ORDER BY n.updated_at DESC`,
      ),
    );
    setCustomers(
      await conn.select<Customer[]>("SELECT * FROM customers ORDER BY name"),
    );
    setProducts(
      await conn.select<Product[]>(
        "SELECT * FROM products ORDER BY manufacturer, name",
      ),
    );
  }

  async function refreshLists() {
    const conn = await db();
    setCustomers(
      await conn.select<Customer[]>("SELECT * FROM customers ORDER BY name"),
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

  useEffect(() => {
    if (open) {
      setCustomerSel(
        editing?.customer_id ? String(editing.customer_id) : "none",
      );
      setProductSel(
        editing?.product_id ? String(editing.product_id) : "none",
      );
    }
  }, [open, editing]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim() || null;
    const body_md = String(fd.get("body_md") ?? "");

    const customer_id = customerSel === "none" ? null : Number(customerSel);
    const product_id = productSel === "none" ? null : Number(productSel);

    const conn = await db();
    if (editing) {
      await conn.execute(
        `UPDATE notes
         SET title=?, body_md=?, customer_id=?, product_id=?,
             updated_at=unixepoch()
         WHERE id=?`,
        [title, body_md, customer_id, product_id, editing.id],
      );
      toast.success("Notatka zaktualizowana");
    } else {
      await conn.execute(
        `INSERT INTO notes (title, body_md, customer_id, product_id)
         VALUES (?, ?, ?, ?)`,
        [title, body_md, customer_id, product_id],
      );
      toast.success("Notatka dodana");
    }
    setOpen(false);
    setEditing(null);
    await refresh();
  }

  async function remove(id: number) {
    if (!window.confirm("Usunąć notatkę?")) return;
    const conn = await db();
    await conn.execute("DELETE FROM notes WHERE id=?", [id]);
    toast.success("Notatka usunięta");
    setPreviewOf(null);
    await refresh();
  }

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter((n) => {
      if (filter === "free" && (n.customer_id || n.product_id)) return false;
      if (filter === "customer" && !n.customer_id) return false;
      if (filter === "product" && !n.product_id) return false;
      if (s) {
        const hay = [n.title, n.body_md, n.customer_name, n.product_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, search, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      free: rows.filter((n) => !n.customer_id && !n.product_id).length,
      customer: rows.filter((n) => n.customer_id !== null).length,
      product: rows.filter((n) => n.product_id !== null).length,
    }),
    [rows],
  );

  return (
    <>
      <PageHeader
        title="Notatki"
        description="Markdown. Możesz przypiąć do klienta i/lub produktu."
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
                Nowa notatka
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={save}>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Edytuj notatkę" : "Nowa notatka"}
                  </DialogTitle>
                  <DialogDescription>
                    Body wspiera markdown — listy, nagłówki, **pogrubienie**,
                    `kod`. Możesz przypiąć notatkę do klienta i produktu
                    jednocześnie.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Tytuł (opcjonalny)</Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={editing?.title ?? ""}
                      placeholder="np. Pomysły na promocję napędów"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Klient
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={customerSel}
                          onValueChange={setCustomerSel}
                        >
                          <SelectTrigger className="flex-1">
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
                        <QuickCreateCustomer
                          trigger={
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Dodaj nowego klienta"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          }
                          onCreated={async (id) => {
                            await refreshLists();
                            setCustomerSel(String(id));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        Produkt
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={productSel}
                          onValueChange={setProductSel}
                        >
                          <SelectTrigger className="flex-1">
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
                        <QuickCreateProduct
                          trigger={
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Dodaj nowy produkt"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          }
                          onCreated={async (id) => {
                            await refreshLists();
                            setProductSel(String(id));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="body_md">Treść (markdown)</Label>
                    <Textarea
                      id="body_md"
                      name="body_md"
                      rows={10}
                      defaultValue={editing?.body_md ?? ""}
                      placeholder="# Nagłówek&#10;&#10;- punkt 1&#10;- punkt 2&#10;&#10;**pogrubione** i `kod`"
                      className="font-mono text-sm"
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
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">Wszystkie ({counts.all})</TabsTrigger>
              <TabsTrigger value="free">Luźne ({counts.free})</TabsTrigger>
              <TabsTrigger value="customer">
                Klienci ({counts.customer})
              </TabsTrigger>
              <TabsTrigger value="product">
                Produkty ({counts.product})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="Szukaj w tytułach i treści…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            {rows.length === 0
              ? "Brak notatek. Dodaj pierwszą klikając „Nowa notatka”."
              : "Nic nie pasuje do filtrów."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((n) => (
              <Card
                key={n.id}
                className="cursor-pointer hover:bg-muted/30 transition-colors h-full flex flex-col"
                onClick={() => setPreviewOf(n)}
              >
                <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
                  <div className="flex items-start gap-2">
                    <StickyNote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="font-semibold leading-tight">
                      {n.title || "(bez tytułu)"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-line flex-1">
                    {n.body_md || "(pusta)"}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {n.customer_name && (
                      <Badge variant="secondary">
                        <User className="h-3 w-3 mr-1" />
                        {n.customer_name}
                      </Badge>
                    )}
                    {n.product_name && (
                      <Badge variant="secondary">
                        <Package className="h-3 w-3 mr-1" />
                        {n.product_name}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto self-center">
                      {formatDate(n.updated_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Note preview/detail dialog */}
      <Dialog
        open={previewOf !== null}
        onOpenChange={(o) => {
          if (!o) setPreviewOf(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {previewOf && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {previewOf.title || "(bez tytułu)"}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap gap-2 items-center">
                  <span>Aktualizacja: {formatDate(previewOf.updated_at)}</span>
                  {previewOf.customer_name && (
                    <Badge variant="secondary">
                      <User className="h-3 w-3 mr-1" />
                      {previewOf.customer_name}
                    </Badge>
                  )}
                  {previewOf.product_name && (
                    <Badge variant="secondary">
                      <Package className="h-3 w-3 mr-1" />
                      {previewOf.product_name}
                    </Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="prose prose-sm dark:prose-invert max-w-none py-2">
                {previewOf.body_md ? (
                  <ReactMarkdown>{previewOf.body_md}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground italic">(pusta)</p>
                )}
              </div>
              <DialogFooter className="flex sm:justify-between">
                <Button
                  variant="ghost"
                  onClick={() => remove(previewOf.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </Button>
                <Button
                  onClick={() => {
                    setEditing(previewOf);
                    setPreviewOf(null);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edytuj
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
