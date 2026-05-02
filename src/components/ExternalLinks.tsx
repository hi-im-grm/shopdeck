import { useState, useMemo } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { db } from "@/lib/db";
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
import {
  ExternalLink,
  Plus,
  Trash2,
  Pencil,
  ShoppingCart,
  Factory,
  Package,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

type LinkRow = { label: string; url: string };

const PRESETS = [
  "Sellasist",
  "Producent",
  "Allegro",
  "Amazon",
  "eMAG",
  "eBay",
  "Erli",
  "Strona oferty",
  "Inne",
] as const;

function iconForLabel(label: string) {
  const l = label.toLowerCase();
  if (
    l.includes("sellasist") ||
    l.includes("allegro") ||
    l.includes("amazon") ||
    l.includes("emag") ||
    l.includes("ebay") ||
    l.includes("erli")
  )
    return ShoppingCart;
  if (l.includes("producent") || l.includes("manufacturer")) return Factory;
  if (l.includes("oferta") || l.includes("strona oferty")) return Package;
  return Globe;
}

function parseLinks(raw: string | null | undefined): LinkRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (r): r is LinkRow =>
          r &&
          typeof r === "object" &&
          typeof r.label === "string" &&
          typeof r.url === "string",
      );
    }
    if (parsed && typeof parsed === "object") {
      // Backwards compat: {label: url} object
      return Object.entries(parsed)
        .filter(([_, v]) => typeof v === "string")
        .map(([label, url]) => ({ label, url: url as string }));
    }
    return [];
  } catch {
    return [];
  }
}

export function ExternalLinks({
  productId,
  raw,
  onChanged,
}: {
  productId: number;
  raw: string;
  onChanged: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const links = useMemo(() => parseLinks(raw), [raw]);
  const [draft, setDraft] = useState<LinkRow[]>([]);

  function startEdit() {
    setDraft(links.length > 0 ? links : [{ label: "Sellasist", url: "" }]);
    setOpen(true);
  }

  async function openLink(url: string) {
    if (!url) return;
    try {
      await openUrl(url);
    } catch (e) {
      toast.error("Nie udało się otworzyć linku");
      console.error(e);
    }
  }

  async function save() {
    const cleaned = draft
      .map((r) => ({ label: r.label.trim(), url: r.url.trim() }))
      .filter((r) => r.label && r.url);
    const conn = await db();
    await conn.execute(
      "UPDATE products SET external_links_json=?, updated_at=unixepoch() WHERE id=?",
      [JSON.stringify(cleaned), productId],
    );
    toast.success("Linki zapisane");
    setOpen(false);
    await onChanged();
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {links.map((link, i) => {
        const Icon = iconForLabel(link.label);
        return (
          <Button
            key={i}
            variant="outline"
            size="sm"
            onClick={() => openLink(link.url)}
            className="gap-2"
            title={link.url}
          >
            <Icon className="h-3.5 w-3.5" />
            {link.label}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Button>
        );
      })}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setDraft([]);
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              startEdit();
            }}
          >
            {links.length > 0 ? (
              <>
                <Pencil className="h-3.5 w-3.5" />
                Edytuj linki
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Dodaj link
              </>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Linki zewnętrzne</DialogTitle>
            <DialogDescription>
              Sellasist, strona producenta, oferty na marketplace itp. Klik
              otwiera w domyślnej przeglądarce.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {draft.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3 grid gap-1">
                  {i === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      Etykieta
                    </Label>
                  )}
                  <Select
                    value={
                      PRESETS.includes(row.label as (typeof PRESETS)[number])
                        ? row.label
                        : "Inne"
                    }
                    onValueChange={(v) => {
                      const next = [...draft];
                      next[i] = {
                        ...next[i],
                        label: v === "Inne" ? row.label || "" : v,
                      };
                      setDraft(next);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESETS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 grid gap-1">
                  {i === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      Custom
                    </Label>
                  )}
                  <Input
                    value={row.label}
                    placeholder="własna…"
                    onChange={(e) => {
                      const next = [...draft];
                      next[i] = { ...next[i], label: e.target.value };
                      setDraft(next);
                    }}
                  />
                </div>
                <div className="col-span-6 grid gap-1">
                  {i === 0 && (
                    <Label className="text-xs text-muted-foreground">
                      URL
                    </Label>
                  )}
                  <Input
                    value={row.url}
                    placeholder="https://…"
                    onChange={(e) => {
                      const next = [...draft];
                      next[i] = { ...next[i], url: e.target.value };
                      setDraft(next);
                    }}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft([...draft, { label: "Sellasist", url: "" }])}
            >
              <Plus className="h-4 w-4" />
              Dodaj link
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={save}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
