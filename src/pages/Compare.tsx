import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  db,
  type Product,
  DRIVE_TYPE_LABELS,
  formatPLN,
} from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Trophy, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type SpecKey = keyof Product;

type SpecRow = {
  label: string;
  key: SpecKey;
  format: (v: unknown, p: Product) => string;
  /** "higher" = większa wartość lepsza, "lower" = mniejsza lepsza, "neutral" = bez oceny */
  bestDirection: "higher" | "lower" | "neutral";
};

const SPECS: SpecRow[] = [
  {
    label: "Producent",
    key: "manufacturer",
    format: (v) => (v as string) ?? "—",
    bestDirection: "neutral",
  },
  {
    label: "Model",
    key: "model",
    format: (v) => (v as string) ?? "—",
    bestDirection: "neutral",
  },
  {
    label: "Typ napędu",
    key: "type",
    format: (v) =>
      v ? DRIVE_TYPE_LABELS[v as keyof typeof DRIVE_TYPE_LABELS] : "—",
    bestDirection: "neutral",
  },
  {
    label: "Max. masa skrzydła",
    key: "max_weight_kg",
    format: (v) => (v ? `${v} kg` : "—"),
    bestDirection: "higher",
  },
  {
    label: "Max. długość",
    key: "max_length_m",
    format: (v) => (v ? `${v} m` : "—"),
    bestDirection: "higher",
  },
  {
    label: "Moc silnika",
    key: "power_w",
    format: (v) => (v ? `${v} W` : "—"),
    bestDirection: "higher",
  },
  {
    label: "Zasilanie",
    key: "voltage",
    format: (v) => (v as string) ?? "—",
    bestDirection: "neutral",
  },
  {
    label: "Intensywność (duty cycle)",
    key: "duty_cycle",
    format: (v) => (v as string) ?? "—",
    bestDirection: "neutral",
  },
  {
    label: "Klasa IP",
    key: "ip_rating",
    format: (v) => (v as string) ?? "—",
    bestDirection: "neutral",
  },
  {
    label: "Cena",
    key: "price_cents",
    format: (v) => formatPLN(v as number),
    bestDirection: "lower",
  },
];

export function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);

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

  function findBestIndex(spec: SpecRow): number | null {
    if (spec.bestDirection === "neutral" || products.length < 2) return null;
    const values = products.map((p) => p[spec.key]);
    const numericValues = values.map((v) =>
      typeof v === "number" ? v : v === null ? null : parseFloat(String(v)),
    );
    const valid = numericValues
      .map((v, i) => (v === null || !Number.isFinite(v) ? null : { v, i }))
      .filter((x): x is { v: number; i: number } => x !== null);
    if (valid.length < 2) return null;
    const best = valid.reduce((acc, cur) =>
      spec.bestDirection === "higher"
        ? cur.v > acc.v
          ? cur
          : acc
        : cur.v < acc.v
          ? cur
          : acc,
    );
    const allSame = valid.every((x) => x.v === best.v);
    if (allSame) return null;
    return best.i;
  }

  function rowVaries(spec: SpecRow): boolean {
    if (products.length < 2) return false;
    const values = products.map((p) => String(p[spec.key] ?? ""));
    return new Set(values).size > 1;
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
        description={`${products.length} produkt${products.length === 1 ? "" : products.length < 5 ? "y" : "ów"} · różnice są podświetlone`}
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
            gridTemplateColumns: `200px repeat(${products.length}, minmax(0, 1fr))`,
          }}
        >
          <div></div>
          {products.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold leading-tight">{p.name}</div>
                    {p.manufacturer && (
                      <div className="text-xs text-muted-foreground">
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
              {SPECS.map((spec) => {
                const bestIdx = findBestIndex(spec);
                const varies = rowVaries(spec);
                return (
                  <tr key={spec.key} className="border-b last:border-b-0">
                    <td
                      className={cn(
                        "px-4 py-3 font-medium w-[200px]",
                        varies ? "" : "text-muted-foreground",
                      )}
                    >
                      {spec.label}
                    </td>
                    {products.map((p, i) => (
                      <td
                        key={p.id}
                        className={cn(
                          "px-4 py-3 tabular-nums",
                          varies
                            ? "font-medium"
                            : "text-muted-foreground",
                          i === bestIdx &&
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold",
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {i === bestIdx && <Trophy className="h-3 w-3" />}
                          {spec.format(p[spec.key], p)}
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
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `200px repeat(${products.length}, minmax(0, 1fr))`,
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
      </div>
    </>
  );
}
