import { useEffect, useState, FormEvent } from "react";
import {
  db,
  type InteractionTemplate,
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
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

export function InteractionTemplates() {
  const [rows, setRows] = useState<InteractionTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InteractionTemplate | null>(null);
  const [kind, setKind] = useState<InteractionKind>("call");

  async function refresh() {
    const conn = await db();
    setRows(
      await conn.select<InteractionTemplate[]>(
        "SELECT * FROM interaction_templates ORDER BY use_count DESC, name ASC",
      ),
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setKind(editing?.kind ?? "call");
  }, [editing, open]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const summary = String(fd.get("summary_template") ?? "").trim();
    const body = String(fd.get("body_template") ?? "").trim() || null;
    if (!name || !summary) return;

    const conn = await db();
    if (editing) {
      await conn.execute(
        "UPDATE interaction_templates SET name=?, kind=?, summary_template=?, body_template=? WHERE id=?",
        [name, kind, summary, body, editing.id],
      );
      toast.success("Szablon zaktualizowany");
    } else {
      await conn.execute(
        "INSERT INTO interaction_templates (name, kind, summary_template, body_template) VALUES (?, ?, ?, ?)",
        [name, kind, summary, body],
      );
      toast.success("Szablon dodany");
    }
    setOpen(false);
    setEditing(null);
    await refresh();
  }

  async function remove(t: InteractionTemplate) {
    if (!window.confirm(`Usunąć szablon „${t.name}”?`)) return;
    const conn = await db();
    await conn.execute("DELETE FROM interaction_templates WHERE id=?", [t.id]);
    toast.success("Usunięto");
    await refresh();
  }

  return (
    <>
      <PageHeader
        title="Szablony spraw"
        description="Gotowe wzorce interakcji do szybkiego wybrania przy nowym kontakcie z klientem."
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
            <DialogContent>
              <form onSubmit={save}>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Edytuj szablon" : "Nowy szablon"}
                  </DialogTitle>
                  <DialogDescription>
                    Nazwa = etykieta przycisku. Streszczenie wypełni pole
                    „O czym”. Treść (opcjonalna) wypełni pole notatki.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nazwa szablonu</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="np. Pytanie o serwis"
                      defaultValue={editing?.name ?? ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="kind">Domyślny rodzaj</Label>
                    <Select
                      value={kind}
                      onValueChange={(v) => setKind(v as InteractionKind)}
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
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="summary_template">Streszczenie</Label>
                    <Input
                      id="summary_template"
                      name="summary_template"
                      required
                      placeholder="np. Pytanie o numer serwisu"
                      defaultValue={editing?.summary_template ?? ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="body_template">
                      Treść notatki (opcjonalna, Markdown)
                    </Label>
                    <Textarea
                      id="body_template"
                      name="body_template"
                      rows={5}
                      placeholder="## Parametry:&#10;-&#10;## Pytania:&#10;-"
                      defaultValue={editing?.body_template ?? ""}
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
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground space-y-2">
            <FileText className="h-8 w-8 mx-auto" />
            <div>Brak szablonów.</div>
            <p className="text-sm">
              Stwórz pierwszy szablon żeby przyspieszyć typowanie powtarzających
              się spraw (np. „Pytanie o serwis”, „Reklamacja”, „Wycena”).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((t) => (
              <Card key={t.id} className="flex flex-col">
                <CardContent className="p-4 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{t.name}</h3>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {INTERACTION_KIND_LABELS[t.kind]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    „{t.summary_template}”
                  </p>
                  {t.body_template && (
                    <pre className="text-xs text-muted-foreground bg-muted/40 p-2 rounded whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                      {t.body_template}
                    </pre>
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Użyty {t.use_count} razy
                  </div>
                </CardContent>
                <div className="p-2 border-t flex justify-end gap-1">
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
