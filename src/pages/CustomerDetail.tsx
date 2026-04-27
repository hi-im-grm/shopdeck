import { useEffect, useState, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import {
  db,
  type Customer,
  type Interaction,
  type InteractionKind,
  INTERACTION_KIND_LABELS,
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
  Phone,
  Mail,
  MessageSquare,
  Users,
  ArrowLeft,
  Plus,
  Building2,
  Trash2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";

const KIND_ICONS: Record<InteractionKind, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  meeting: Users,
  other: MessageSquare,
};

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const customerId = parseInt(id ?? "0", 10);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [open, setOpen] = useState(false);

  async function refresh() {
    const conn = await db();
    const [c] = await conn.select<Customer[]>(
      "SELECT * FROM customers WHERE id=?",
      [customerId],
    );
    setCustomer(c ?? null);
    setInteractions(
      await conn.select<Interaction[]>(
        "SELECT * FROM interactions WHERE customer_id=? ORDER BY created_at DESC",
        [customerId],
      ),
    );
  }

  useEffect(() => {
    if (customerId > 0) refresh();
  }, [customerId]);

  async function addInteraction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kind = (fd.get("kind") as InteractionKind) ?? "call";
    const summary = String(fd.get("summary") ?? "").trim();
    const body_md = String(fd.get("body_md") ?? "") || null;
    const status = String(fd.get("status") ?? "open");
    if (!summary) return;

    const conn = await db();
    await conn.execute(
      "INSERT INTO interactions (customer_id, kind, summary, body_md, status) VALUES (?, ?, ?, ?, ?)",
      [customerId, kind, summary, body_md, status],
    );
    toast.success("Interakcja zapisana");
    setOpen(false);
    await refresh();
  }

  async function toggleStatus(i: Interaction) {
    const conn = await db();
    const next = i.status === "open" ? "done" : "open";
    await conn.execute("UPDATE interactions SET status=? WHERE id=?", [
      next,
      i.id,
    ]);
    await refresh();
  }

  async function removeInteraction(id: number) {
    const conn = await db();
    await conn.execute("DELETE FROM interactions WHERE id=?", [id]);
    toast.success("Interakcja usunięta");
    await refresh();
  }

  if (!customer) {
    return (
      <>
        <PageHeader title="Klient" />
        <div className="p-6 text-muted-foreground">Klient nie znaleziony.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={customer.name}
        description={
          customer.kind === "b2b" && customer.company
            ? customer.company
            : customer.kind === "b2c"
              ? "Klient B2C"
              : "Klient B2B"
        }
        action={
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/customers">
                <ArrowLeft className="h-4 w-4" />
                Wróć
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Nowa interakcja
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={addInteraction}>
                  <DialogHeader>
                    <DialogTitle>Nowa interakcja</DialogTitle>
                    <DialogDescription>
                      Szybki zapis: kto, o czym, kiedy.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="kind">Rodzaj</Label>
                        <Select name="kind" defaultValue="call">
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
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue="open">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">
                              Otwarte (do zrobienia)
                            </SelectItem>
                            <SelectItem value="done">Zakończone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="summary">O czym (krótko)</Label>
                      <Input
                        id="summary"
                        name="summary"
                        required
                        placeholder="np. Pyta o napęd skrzydłowy do 300kg"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="body_md">Notatka (więcej szczegółów)</Label>
                      <Textarea id="body_md" name="body_md" rows={5} />
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

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              {customer.kind === "b2b" ? (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Phone className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge variant="secondary">
                {customer.kind === "b2b" ? "Firma" : "Osoba"}
              </Badge>
            </div>
            {customer.email && (
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="text-sm">{customer.email}</div>
              </div>
            )}
            {customer.phone && (
              <div>
                <Label className="text-xs text-muted-foreground">Telefon</Label>
                <div className="text-sm">{customer.phone}</div>
              </div>
            )}
            {customer.nip && (
              <div>
                <Label className="text-xs text-muted-foreground">NIP</Label>
                <div className="text-sm">{customer.nip}</div>
              </div>
            )}
            {customer.address && (
              <div>
                <Label className="text-xs text-muted-foreground">Adres</Label>
                <div className="text-sm">{customer.address}</div>
              </div>
            )}
            {customer.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notatki</Label>
                <div className="text-sm whitespace-pre-line">
                  {customer.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interactions timeline */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Historia kontaktów ({interactions.length})
          </h2>
          {interactions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              Brak interakcji. Dodaj pierwszą klikając „Nowa interakcja”.
            </div>
          ) : (
            interactions.map((i) => {
              const Icon = KIND_ICONS[i.kind];
              return (
                <Card key={i.id}>
                  <CardContent className="p-4 flex gap-3">
                    <div className="shrink-0">
                      <button
                        onClick={() => toggleStatus(i)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title={
                          i.status === "open"
                            ? "Oznacz jako zakończone"
                            : "Oznacz jako otwarte"
                        }
                      >
                        {i.status === "done" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{INTERACTION_KIND_LABELS[i.kind]}</span>
                          <span>·</span>
                          <span>{formatDate(i.created_at)}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeInteraction(i.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div
                        className={
                          i.status === "done"
                            ? "font-medium mt-1 line-through text-muted-foreground"
                            : "font-medium mt-1"
                        }
                      >
                        {i.summary}
                      </div>
                      {i.body_md && (
                        <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {i.body_md}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
