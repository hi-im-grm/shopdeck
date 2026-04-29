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

type LinkType = "customer" | "product" | "interaction" | null;
type LinkValue = "none" | "customer" | "product";

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
  const [linkKind, setLinkKind] = useState<LinkValue>("none");
  const [linkId, setLinkId] = useState<string>("");
  const [previewOf, setPreviewOf] = useState<NoteWithRefs | null>(null);

  async function refresh() {
    const conn = await db();
    setRows(
      await conn.select<NoteWithRefs[]>(
        `SELECT n.*,
                c.name as customer_name,
                p.name as product_name
         FROM notes n
         LEFT JOIN customers c
           ON n.linked_entity_type = 'customer' AND c.id = n.linked_entity_id
         LEFT JOIN products p
           ON n.linked_entity_type = 'product' AND p.id = n.linked_entity_id
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

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (open) {
      if (editing) {
        const t = (editing.linked_entity_type as LinkType) ?? null;
        if (t === "customer" || t === "product") {
          setLinkKind(t);
          setLinkId(String(editing.linked_entity_id ?? ""));
        } else {
          setLinkKind("none");
          setLinkId("");
        }
      } else {
        setLinkKind("none");
        setLinkId("");
      }
    }
  }, [open, editing]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim() || null;
    const body_md = String(fd.get("body_md") ?? "");

    const linked_entity_type: LinkType =
      linkKind === "none" ? null : linkKind;
    const linked_entity_id =
      linkKind !== "none" && linkId ? Number(linkId) : null;

    const conn = await db();
    if (editing) {
      await conn.execute(
        `UPDATE notes
         SET title=?, body_md=?, linked_entity_type=?, linked_entity_id=?,
             updated_at=unixepoch()
         WHERE id=?`,
        [title, body_md, linked_entity_type, linked_entity_id, editing.id],
      );
      toast.success("Notatka zaktualizowana");
    } else {
      await conn.execute(
        `INSERT INTO notes (title, body_md, linked_entity_type, linked_entity_id)
         VALUES (?, ?, ?, ?)`,
        [title, body_md, linked_entity_type, linked_entity_id],
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
      if (filter === "free" && n.linked_entity_type !== null) return false;
      if (filter === "customer" && n.linked_entity_type !== "customer")
        return false;
      if (filter === "product" && n.linked_entity_type !== "product")
        return false;
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
      free: rows.filter((n) => n.linked_entity_type === null).length,
      customer: rows.filter((n) => n.linked_entity_type === "customer").length,
      product: rows.filter((n) => n.linked_entity_type === "product").length,
    }),
    [rows],
  );

  const dialogOpen = open;

  return (
    <>
      <PageHeader
        title="Notatki"
        description="Markdown. Możesz przypiąć do klienta lub produktu."
        action={
          <Dialog
            open={dialogOpen}
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
                    `kod`.
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
                      <Label>Powiąż z</Label>
                      <Select
                        value={linkKind}
                        onValueChange={(v) => {
                          setLinkKind(v as LinkValue);
                          setLinkId("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— niezależna —</SelectItem>
                          <SelectItem value="customer">Klient</SelectItem>
                          <SelectItem value="product">Produkt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Wybierz</Label>
                      <Select
                        value={linkId}
                        onValueChange={setLinkId}
                        disabled={linkKind === "none"}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              linkKind === "none" ? "—" : "Wybierz"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {linkKind === "customer" &&
                            customers.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                                {c.company ? ` (${c.company})` : ""}
                              </SelectItem>
                            ))}
                          {linkKind === "product" &&
                            products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StickyNote className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="font-semibold leading-tight">
                        {n.title || "(bez tytułu)"}
                      </div>
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
                <DialogDescription>
                  Aktualizacja: {formatDate(previewOf.updated_at)}
                  {previewOf.customer_name &&
                    ` · ${previewOf.customer_name}`}
                  {previewOf.product_name && ` · ${previewOf.product_name}`}
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
