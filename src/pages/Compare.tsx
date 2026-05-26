import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  db,
  type Product,
  DRIVE_TYPE_LABELS,
  formatPLN,
  parseProductAttributes,
} from "@/lib/db";
import { iconByName } from "@/lib/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Trophy,
  Package,
  ArrowUp,
  ArrowDown,
  Minus,
  Weight,
  Ruler,
  Zap,
  Battery,
  Activity,
  Shield,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Direction = "higher" | "lower" | "neutral";

type CompareRow = {
  /** Stable id used for direction overrides + React keys. */
  id: string;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  /** Formatted strings, one per product (use "—" for missing). */
  values: string[];
  /** Parallel numeric values for "best" detection. null if non-numeric / missing. */
  numericValues: (number | null)[];
  /** Default direction for this row — overridden by user via direction toggle. */
  defaultDirection: Direction;
  /** If true, row is shown faded because every product has the same string. */
  isUniform: boolean;
};

const NUMERIC_RE = /-?\d+(?:[.,]\d+)?/;

/** Extract first numeric token from a value — handles "300 kg", "24V DC", etc. */
function extractNumber(s: string | number | null | undefined): number | null {
  if (s == null) return null;
  if (typeof s === "number") return Number.isFinite(s) ? s : null;
  const m = String(s).match(NUMERIC_RE);
  if (!m) return null;
  const n = parseFloat(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  /** Per-row direction overrides; falls back to row.defaultDirection. */
  const [dirOverrides, setDirOverrides] = useState<Record<string, Direction>>({});

  const ids = useMemo(() => {
    const raw = searchParams.get("ids") ?? "";
    return raw
      .split(",")
      .map((x) => parseInt(x, 10))
      .filter((x) => Number.isInteger(x) && x > 0);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      if (ids.length === 0) {
        setProducts([]);
        return;
      }
      const conn = await db();
      const placeholders = ids.map(() => "?").join(",");
      const rows = await conn.select<Product[]>(
        `SELECT * FROM products WHERE id IN (${placeholders})`,
        ids,
      );
      const ordered = ids
        .map((id) => rows.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p));
      setProducts(ordered);
    })();
  }, [ids]);

  function removeProduct(id: number) {
    const next = ids.filter((x) => x !== id);
    if (next.length === 0) {
      setSearchParams({});
    } else {
      setSearchParams({ ids: next.join(",") });
    }
  }

  /**
   * Build comparison rows dynamically:
   *  - Core (always): Producent, Model, Typ
   *  - Legacy specs (shown only if ≥1 product has the value): weight/length/power/voltage/duty/IP
   *  - Dynamic attributes (union of attributes_json keys across products, in first-seen order)
   *  - Price (always, last)
   */
  const rows = useMemo<CompareRow[]>(() => {
    if (products.length === 0) return [];
    const out: CompareRow[] = [];

    // --- CORE ---
    out.push(textRow("core.manufacturer", "Producent", products.map((p) => p.manufacturer)));
    out.push(textRow("core.model", "Model", products.map((p) => p.model)));
    out.push(
      textRow(
        "core.type",
        "Typ napędu",
        products.map((p) => (p.type ? DRIVE_TYPE_LABELS[p.type] : null)),
      ),
    );

    // --- LEGACY SPECS (only if at least one product has the value) ---
    const legacyDefs: Array<{
      id: string;
      label: string;
      key: keyof Product;
      suffix?: string;
      direction: Direction;
      Icon: React.ComponentType<{ className?: string }>;
    }> = [
      { id: "legacy.weight", label: "Max. masa", key: "max_weight_kg", suffix: " kg", direction: "higher", Icon: Weight },
      { id: "legacy.length", label: "Max. długość", key: "max_length_m", suffix: " m", direction: "higher", Icon: Ruler },
      { id: "legacy.power", label: "Moc silnika", key: "power_w", suffix: " W", direction: "higher", Icon: Zap },
      { id: "legacy.voltage", label: "Zasilanie", key: "voltage", direction: "neutral", Icon: Battery },
      { id: "legacy.duty", label: "Intensywność (duty cycle)", key: "duty_cycle", direction: "neutral", Icon: Activity },
      { id: "legacy.ip", label: "Klasa IP", key: "ip_rating", direction: "neutral", Icon: Shield },
    ];
    for (const def of legacyDefs) {
      if (products.every((p) => p[def.key] == null)) continue;
      const raw = products.map((p) => p[def.key]);
      const values = raw.map((v) =>
        v == null || v === "" ? "—" : `${v}${def.suffix ?? ""}`,
      );
      const numericValues = raw.map((v) => extractNumber(v as string | number | null));
      out.push({
        id: def.id,
        label: def.label,
        Icon: def.Icon,
        values,
        numericValues,
        defaultDirection: def.direction,
        isUniform: new Set(values).size === 1,
      });
    }

    // --- DYNAMIC ATTRIBUTES (union of keys across all selected products) ---
    const allAttrs = products.map((p) => parseProductAttributes(p.attributes_json));
    const keyOrder: string[] = [];
    const iconForKey: Record<string, string | null> = {};
    for (const list of allAttrs) {
      for (const a of list) {
        if (!keyOrder.includes(a.key)) {
          keyOrder.push(a.key);
          iconForKey[a.key] = a.icon;
        } else if (!iconForKey[a.key] && a.icon) {
          iconForKey[a.key] = a.icon; // first product that defines an icon wins
        }
      }
    }
    for (const k of keyOrder) {
      const values = allAttrs.map((list) => {
        const found = list.find((a) => a.key === k);
        return found && found.value !== "" ? found.value : "—";
      });
      const numericValues = values.map((v) => (v === "—" ? null : extractNumber(v)));
      const isNumeric = numericValues.some((n) => n !== null);
      const Icon = iconByName(iconForKey[k]) ?? (isNumeric ? Tag : undefined);
      out.push({
        id: `attr.${k}`,
        label: k,
        Icon: Icon ?? undefined,
        values,
        numericValues,
        defaultDirection: "neutral", // unknown until user picks
        isUniform: new Set(values).size === 1,
      });
    }

    // --- PRICE (always last, "lower better") ---
    out.push({
      id: "core.price",
      label: "Cena",
      values: products.map((p) => formatPLN(p.price_cents)),
      numericValues: products.map((p) => p.price_cents),
      defaultDirection: "lower",
      isUniform: new Set(products.map((p) => p.price_cents)).size === 1,
    });

    return out;
  }, [products]);

  function rowDirection(row: CompareRow): Direction {
    return dirOverrides[row.id] ?? row.defaultDirection;
  }

  function cycleDirection(rowId: string, current: Direction) {
    const next: Direction =
      current === "neutral" ? "higher" : current === "higher" ? "lower" : "neutral";
    setDirOverrides((prev) => ({ ...prev, [rowId]: next }));
  }

  function findBestIndex(row: CompareRow): number | null {
    const dir = rowDirection(row);
    if (dir === "neutral" || products.length < 2) return null;
    const valid = row.numericValues
      .map((v, i) => (v === null || !Number.isFinite(v) ? null : { v, i }))
      .filter((x): x is { v: number; i: number } => x !== null);
    if (valid.length < 2) return null;
    const best = valid.reduce((acc, cur) =>
      dir === "higher" ? (cur.v > acc.v ? cur : acc) : cur.v < acc.v ? cur : acc,
    );
    if (valid.every((x) => x.v === best.v)) return null;
    return best.i;
  }

  if (ids.length === 0) {
    return (
      <>
        <PageHeader
          title="Porównaj produkty"
          description="Wybierz produkty z listy żeby je porównać"
        />
        <div className="p-6">
          <div className="rounded-lg border border-dashed p-12 text-center max-w-2xl mx-auto space-y-4">
            <Package className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="text-muted-foreground">
              Brak produktów do porównania.
            </div>
            <Button asChild>
              <Link to="/products">Wybierz produkty</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Porównaj produkty"
        description={`${products.length} produkt${products.length === 1 ? "" : products.length < 5 ? "y" : "ów"} · kliknij ikonkę po lewej żeby wybrać kierunek „lepszego” (↑/↓)`}
        action={
          <Button variant="outline" asChild>
            <Link to="/products">+ dodaj kolejny</Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Headers / cards */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `220px repeat(${products.length}, minmax(0, 1fr))`,
          }}
        >
          <div></div>
          {products.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to={`/products/${p.id}`}
                      className="font-semibold leading-tight hover:underline block truncate"
                    >
                      {p.name}
                    </Link>
                    {p.manufacturer && (
                      <div className="text-xs text-muted-foreground truncate">
                        {p.manufacturer}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProduct(p.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {p.image_data_url && (
                  <img
                    src={p.image_data_url}
                    alt={p.name}
                    className="w-full h-32 object-cover rounded-md bg-muted"
                  />
                )}
                {p.type && (
                  <Badge variant="secondary">{DRIVE_TYPE_LABELS[p.type]}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Specs table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => {
                const bestIdx = findBestIndex(row);
                const dir = rowDirection(row);
                const DirIcon =
                  dir === "higher" ? ArrowUp : dir === "lower" ? ArrowDown : Minus;
                const dirTitle =
                  dir === "higher"
                    ? "Większa wartość = lepsza (kliknij by zmienić)"
                    : dir === "lower"
                      ? "Mniejsza wartość = lepsza (kliknij by zmienić)"
                      : "Bez oceny (kliknij by ustawić ↑ większe lepsze)";
                const canScore = row.numericValues.some((n) => n !== null);
                return (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td
                      className={cn(
                        "px-4 py-3 font-medium w-[220px]",
                        row.isUniform ? "text-muted-foreground" : "",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {canScore ? (
                          <button
                            type="button"
                            onClick={() => cycleDirection(row.id, dir)}
                            className={cn(
                              "p-1 rounded hover:bg-muted shrink-0 transition-colors",
                              dir !== "neutral" && "text-primary",
                            )}
                            title={dirTitle}
                          >
                            <DirIcon className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="w-6 inline-block" />
                        )}
                        {row.Icon && (
                          <row.Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{row.label}</span>
                      </div>
                    </td>
                    {row.values.map((v, i) => (
                      <td
                        key={i}
                        className={cn(
                          "px-4 py-3 tabular-nums",
                          row.isUniform ? "text-muted-foreground" : "font-medium",
                          i === bestIdx &&
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {i === bestIdx && <Trophy className="h-3 w-3" />}
                          {v}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pros & Cons */}
        {products.some((p) => p.pros || p.cons) && (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `220px repeat(${products.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="font-medium pt-2">Zalety</div>
            {products.map((p) => (
              <Card key={`pros-${p.id}`}>
                <CardContent className="p-4 text-sm whitespace-pre-line text-emerald-600 dark:text-emerald-400">
                  {p.pros || "—"}
                </CardContent>
              </Card>
            ))}
            <div className="font-medium pt-2">Wady</div>
            {products.map((p) => (
              <Card key={`cons-${p.id}`}>
                <CardContent className="p-4 text-sm whitespace-pre-line text-orange-600 dark:text-orange-400">
                  {p.cons || "—"}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Build a row for non-numeric text — used for core fields. */
function textRow(
  id: string,
  label: string,
  raw: (string | null | undefined)[],
): CompareRow {
  const values = raw.map((v) => (v == null || v === "" ? "—" : v));
  return {
    id,
    label,
    values,
    numericValues: values.map(() => null),
    defaultDirection: "neutral",
    isUniform: new Set(values).size === 1,
  };
}
