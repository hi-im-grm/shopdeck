import { useEffect, useState, FormEvent, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  db,
  type Customer,
  type CustomerKind,
  type InteractionKind,
  type InteractionTemplate,
  CUSTOMER_TAG_PRESETS,
  INTERACTION_KIND_LABELS,
  parseTags,
  stringifyTags,
  customerDisplayName,
} from "@/lib/db";
import { TagEditor } from "@/components/TagEditor";
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
import { Plus, Pencil, Trash2, Building2, User, Download } from "lucide-react";
import { toast } from "sonner";
import { toCSV, downloadCSV, unixToISO } from "@/lib/csv";
import { logChange, logDelete } from "@/lib/audit";
import { recordWriteForBackup } from "@/lib/autobackup";

export function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [kind, setKind] = useState<CustomerKind>("b2c");
  const [tags, setTags] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // "First interaction" feature: when creating a NEW customer the dialog
  // can also add an initial interaction (saves a click → detail → +).
  const [firstSummary, setFirstSummary] = useState("");
  const [firstKind, setFirstKind] = useState<InteractionKind>("call");
  const [interactionTemplates, setInteractionTemplates] = useState<
    InteractionTemplate[]
  >([]);

  async function refresh() {
    const conn = await db();
    setRows(
      await conn.select<Customer[]>(
        "SELECT * FROM customers ORDER BY created_at DESC",
      ),
    );
    setInteractionTemplates(
      await conn.select<InteractionTemplate[]>(
        "SELECT * FROM interaction_templates ORDER BY use_count DESC, name ASC",
      ),
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setKind(editing?.kind ?? "b2c");
    setTags(parseTags(editing?.tags_json));
    // Reset "first interaction" inputs whenever the dialog opens or we
    // switch between edit/new.
    setFirstSummary("");
    setFirstKind("call");
  }, [editing, open]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const company = String(fd.get("company") ?? "") || null;
    const nip = String(fd.get("nip") ?? "") || null;
    const email = String(fd.get("email") ?? "") || null;
    const phone = String(fd.get("phone") ?? "") || null;
    const address = String(fd.get("address") ?? "") || null;
    const notes = String(fd.get("notes") ?? "") || null;

    // Require AT LEAST one identifying field so we can find the customer
    // later. Phone-only is the common "anonymous quick call" case.
    if (!name && !phone && !email && !company) {
      toast.error(
        "Podaj przynajmniej jedno pole identyfikujące: imię/nazwę, firmę, telefon lub email.",
      );
      return;
    }

    const tags_json = stringifyTags(tags);

    const conn = await db();
    let savedId: number;
    if (editing) {
      const [before] = await conn.select<Customer[]>(
        "SELECT * FROM customers WHERE id=?",
        [editing.id],
      );
      await conn.execute(
        "UPDATE customers SET name=?, kind=?, company=?, nip=?, email=?, phone=?, address=?, notes=?, tags_json=? WHERE id=?",
        [name, kind, company, nip, email, phone, address, notes, tags_json, editing.id],
      );
      const [after] = await conn.select<Customer[]>(
        "SELECT * FROM customers WHERE id=?",
        [editing.id],
      );
      await logChange(
        "customer",
        editing.id,
        before as unknown as Record<string, unknown>,
        after as unknown as Record<string, unknown>,
      );
      savedId = editing.id;
      toast.success("Klient zaktualizowany");
    } else {
      const res = await conn.execute(
        "INSERT INTO customers (name, kind, company, nip, email, phone, address, notes, tags_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, kind, company, nip, email, phone, address, notes, tags_json],
      );
      savedId = Number(res.lastInsertId ?? 0);
      const [after] = await conn.select<Customer[]>(
        "SELECT * FROM customers WHERE id=?",
        [savedId],
      );
      await logChange(
        "customer",
        savedId,
        null,
        after as unknown as Record<string, unknown>,
      );

      // Optional: add the initial interaction in the same dialog so a quick
      // phone call doesn't require navigating into the customer afterward.
      const firstSummaryTrim = firstSummary.trim();
      if (firstSummaryTrim) {
        await conn.execute(
          "INSERT INTO interactions (customer_id, kind, summary, status) VALUES (?, ?, ?, 'open')",
          [savedId, firstKind, firstSummaryTrim],
        );
        toast.success("Klient + sprawa dodane");
      } else {
        toast.success("Klient dodany");
      }
    }
    void recordWriteForBackup();
    setOpen(false);
    setEditing(null);
    await refresh();
  }

  async function remove(c: Customer) {
    if (
      !window.confirm(
        `Usunąć klienta „${c.name}”?\n\nUWAGA: skasuje też wszystkie interakcje przypisane do tego klienta. ` +
          `Notatki i zadania zostaną zachowane (tylko odpięte).`,
      )
    )
      return;
    const conn = await db();
    const [snapshot] = await conn.select<Customer[]>(
      "SELECT * FROM customers WHERE id=?",
      [c.id],
    );
    await conn.execute("DELETE FROM customers WHERE id=?", [c.id]);
    await logDelete(
      "customer",
      c.id,
      snapshot as unknown as Record<string, unknown>,
    );
    void recordWriteForBackup();
    toast.success("Klient usunięty");
    await refresh();
  }

  function exportCSV() {
    if (rows.length === 0) {
      toast.info("Brak klientów do eksportu");
      return;
    }
    const csv = toCSV(rows, [
      { header: "id", get: (c) => c.id },
      { header: "name", get: (c) => c.name },
      { header: "kind", get: (c) => c.kind },
      { header: "company", get: (c) => c.company },
      { header: "nip", get: (c) => c.nip },
      { header: "email", get: (c) => c.email },
      { header: "phone", get: (c) => c.phone },
      { header: "address", get: (c) => c.address },
      { header: "notes", get: (c) => c.notes },
      { header: "created_at", get: (c) => unixToISO(c.created_at) },
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`shopdeck-klienci-${stamp}.csv`, csv);
    toast.success(`Wyeksportowano ${rows.length} klientów`);
  }

  const allTags = useMemo(() => {
    const seen = new Map<string, number>();
    for (const c of rows) {
      for (const t of parseTags(c.tags_json)) {
        seen.set(t, (seen.get(t) ?? 0) + 1);
      }
    }
    return Array.from(seen.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = rows.filter((c) => {
    if (tagFilter) {
      const ts = parseTags(c.tags_json);
      if (!ts.includes(tagFilter)) return false;
    }
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      c.company?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s) ||
      c.nip?.toLowerCase().includes(s) ||
      parseTags(c.tags_json).some((t) => t.toLowerCase().includes(s))
    );
  });

  return (
    <>
      <PageHeader
        title="Klienci"
        description={`Łącznie: ${rows.length}${search ? ` · widoczne: ${filtered.length}` : ""}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Eksport CSV
            </Button>
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
                      {kind === "b2b" ? "Osoba kontaktowa" : "Imię i nazwisko"}{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        (opcjonalne — wystarczy telefon)
                      </span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editing?.name ?? ""}
                      placeholder="np. Jan Kowalski lub puste"
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
                    <Label>Tagi</Label>
                    <TagEditor
                      value={tags}
                      onChange={setTags}
                      presets={CUSTOMER_TAG_PRESETS}
                      placeholder="np. VIP, hurt, zaległy…"
                    />
                  </div>

                  {!editing && (
                    <div className="grid gap-2 p-3 rounded-md border border-dashed bg-muted/30">
                      <Label className="text-sm">
                        Pierwsza sprawa{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                          (opcjonalne — od razu dodaj powód kontaktu)
                        </span>
                      </Label>
                      {interactionTemplates.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {interactionTemplates.slice(0, 8).map((tmpl) => (
                            <button
                              key={tmpl.id}
                              type="button"
                              onClick={() => {
                                setFirstSummary(tmpl.summary_template);
                                setFirstKind(tmpl.kind);
                              }}
                              className="text-xs px-2 py-0.5 rounded-full border border-dashed hover:bg-muted transition-colors"
                            >
                              + {tmpl.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <Select
                          value={firstKind}
                          onValueChange={(v) =>
                            setFirstKind(v as InteractionKind)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(
                                INTERACTION_KIND_LABELS,
                              ) as InteractionKind[]
                            ).map((k) => (
                              <SelectItem key={k} value={k}>
                                {INTERACTION_KIND_LABELS[k]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={firstSummary}
                          onChange={(e) => setFirstSummary(e.target.value)}
                          placeholder="np. Pyta o numer serwisu"
                        />
                      </div>
                    </div>
                  )}
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
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <Input
          placeholder="Szukaj po nazwie, firmie, email, telefonie, NIP, tagu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">Filtruj po tagu:</span>
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                tagFilter === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              }`}
            >
              wszystkie
            </button>
            {allTags.map(([t, n]) => (
              <button
                key={t}
                type="button"
                onClick={() => setTagFilter(tagFilter === t ? null : t)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  tagFilter === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                }`}
              >
                {t} <span className="opacity-60">·{n}</span>
              </button>
            ))}
          </div>
        )}
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
                      {customerDisplayName(c)}
                    </Link>
                    {c.company && c.name && (
                      <div className="text-xs text-muted-foreground">
                        {c.company}
                      </div>
                    )}
                    {(() => {
                      const ts = parseTags(c.tags_json);
                      if (ts.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ts.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="text-[10px] py-0 h-4"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      );
                    })()}
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
                      onClick={() => remove(c)}
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
