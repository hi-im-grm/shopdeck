import { useEffect, useState, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { db, type Note } from "@/lib/db";
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
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, StickyNote, Pencil } from "lucide-react";
import { toast } from "sonner";

type EntityType = "customer" | "product";

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LinkedNotes({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: number;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [previewOf, setPreviewOf] = useState<Note | null>(null);

  const column = entityType === "customer" ? "customer_id" : "product_id";

  async function refresh() {
    const conn = await db();
    setNotes(
      await conn.select<Note[]>(
        `SELECT * FROM notes WHERE ${column} = ? ORDER BY updated_at DESC`,
        [entityId],
      ),
    );
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim() || null;
    const body_md = String(fd.get("body_md") ?? "");

    const conn = await db();
    if (editing) {
      await conn.execute(
        `UPDATE notes SET title=?, body_md=?, updated_at=unixepoch() WHERE id=?`,
        [title, body_md, editing.id],
      );
      toast.success("Notatka zaktualizowana");
    } else {
      const customer_id = entityType === "customer" ? entityId : null;
      const product_id = entityType === "product" ? entityId : null;
      await conn.execute(
        `INSERT INTO notes (title, body_md, customer_id, product_id) VALUES (?, ?, ?, ?)`,
        [title, body_md, customer_id, product_id],
      );
      toast.success("Notatka dodana");
    }
    setOpen(false);
    setEditing(null);
    await refresh();
  }

  async function remove(id: number) {
    const conn = await db();
    const [snapshot] = await conn.select<Note[]>(
      "SELECT * FROM notes WHERE id = ?",
      [id],
    );
    if (!snapshot) return;
    await conn.execute("DELETE FROM notes WHERE id=?", [id]);
    setPreviewOf(null);
    await refresh();
    toast.success("Notatka usunięta", {
      duration: 6000,
      action: {
        label: "Cofnij",
        onClick: async () => {
          const c = await db();
          await c.execute(
            `INSERT INTO notes
              (id, title, body_md, linked_entity_type, linked_entity_id,
               customer_id, product_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              snapshot.id,
              snapshot.title,
              snapshot.body_md,
              snapshot.linked_entity_type,
              snapshot.linked_entity_id,
              snapshot.customer_id,
              snapshot.product_id,
              snapshot.created_at,
              snapshot.updated_at,
            ],
          );
          toast.success("Cofnięto");
          await refresh();
        },
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Notatki ({notes.length})
        </h2>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
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
                  {editing
                    ? "Markdown w body."
                    : `Notatka zostanie powiązana z tym ${entityType === "customer" ? "klientem" : "produktem"}.`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Tytuł (opcjonalny)</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={editing?.title ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="body_md">Treść (markdown)</Label>
                  <Textarea
                    id="body_md"
                    name="body_md"
                    rows={8}
                    defaultValue={editing?.body_md ?? ""}
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
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
          Brak notatek.
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card
              key={n.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors group"
              onClick={() => setPreviewOf(n)}
            >
              <CardContent className="p-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm leading-tight">
                    {n.title || "(bez tytułu)"}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line mt-1">
                    {n.body_md || "(pusta)"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(n.updated_at)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(n.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog
        open={previewOf !== null}
        onOpenChange={(o) => !o && setPreviewOf(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {previewOf && (
            <>
              <DialogHeader>
                <DialogTitle>{previewOf.title || "(bez tytułu)"}</DialogTitle>
                <DialogDescription>
                  Aktualizacja: {formatDate(previewOf.updated_at)}
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
    </div>
  );
}
