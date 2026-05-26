import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  db,
  type Product,
  type ProductPriceHistory,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Package,
  Weight,
  Ruler,
  Zap,
  Battery,
  Activity,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { LinkedNotes } from "@/components/LinkedNotes";
import { LinkedTodos } from "@/components/LinkedTodos";
import { ExternalLinks } from "@/components/ExternalLinks";
import { AuditHistory } from "@/components/AuditHistory";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id ?? "0", 10);
  const [product, setProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<ProductPriceHistory[]>([]);

  async function refresh() {
    const conn = await db();
    const [p] = await conn.select<Product[]>(
      "SELECT * FROM products WHERE id=?",
      [productId],
    );
    setProduct(p ?? null);
    setPriceHistory(
      await conn.select<ProductPriceHistory[]>(
        "SELECT * FROM product_price_history WHERE product_id=? ORDER BY changed_at DESC",
        [productId],
      ),
    );
  }

  useEffect(() => {
    if (productId > 0) refresh();
  }, [productId]);

  if (!product) {
    return (
      <>
        <PageHeader title="Produkt" />
        <div className="p-6 text-muted-foreground">Produkt nie znaleziony.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={product.name}
        description={
          [product.manufacturer, product.model].filter(Boolean).join(" · ") ||
          undefined
        }
        action={
          <Button variant="ghost" asChild>
            <Link to="/products">
              <ArrowLeft className="h-4 w-4" />
              Wróć
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Header card with key info + image + external links */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-6">
            {product.image_data_url && (
              <img
                src={product.image_data_url}
                alt={product.name}
                className="w-full md:w-64 h-48 object-cover rounded-md bg-muted shrink-0"
              />
            )}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  {product.type && (
                    <Badge variant="secondary">
                      {DRIVE_TYPE_LABELS[product.type]}
                    </Badge>
                  )}
                  {product.sku && (
                    <div className="text-xs text-muted-foreground">
                      SKU: {product.sku}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatPLN(product.price_cents)}
                </div>
              </div>

              {product.description && (
                <p className="text-sm text-muted-foreground">
                  {product.description}
                </p>
              )}

              {/* Quick spec grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm pt-2 border-t">
                {product.max_weight_kg !== null && (
                  <SpecRow icon={Weight} label="Max. masa">
                    {product.max_weight_kg} kg
                  </SpecRow>
                )}
                {product.max_length_m !== null && (
                  <SpecRow icon={Ruler} label="Max. długość">
                    {product.max_length_m} m
                  </SpecRow>
                )}
                {product.power_w !== null && (
                  <SpecRow icon={Zap} label="Moc">
                    {product.power_w} W
                  </SpecRow>
                )}
                {product.voltage && (
                  <SpecRow icon={Battery} label="Zasilanie">
                    {product.voltage}
                  </SpecRow>
                )}
                {product.duty_cycle && (
                  <SpecRow icon={Activity} label="Intensywność">
                    {product.duty_cycle}
                  </SpecRow>
                )}
                {product.ip_rating && (
                  <SpecRow icon={Shield} label="Klasa IP">
                    {product.ip_rating}
                  </SpecRow>
                )}
              </div>

              {(() => {
                const attrs = parseProductAttributes(product.attributes_json);
                if (attrs.length === 0) return null;
                return (
                  <div className="pt-2 border-t space-y-1">
                    <div className="text-xs text-muted-foreground font-medium">
                      Dodatkowe atrybuty
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                      {attrs.map((a, i) => {
                        const Icon = iconByName(a.icon);
                        return (
                          <div
                            key={`${a.key}-${i}`}
                            className="flex items-center gap-2 min-w-0"
                          >
                            {Icon && (
                              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-muted-foreground truncate">
                              {a.key}:
                            </span>
                            <span className="font-medium truncate">
                              {a.value || "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 border-t">
                <ExternalLinks
                  productId={product.id}
                  raw={product.external_links_json}
                  onChanged={refresh}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Pros&Cons / Notes / Todos */}
        <Tabs defaultValue="proscons">
          <TabsList>
            <TabsTrigger value="proscons">Zalety i wady</TabsTrigger>
            <TabsTrigger value="notes">Notatki</TabsTrigger>
            <TabsTrigger value="todos">Todo</TabsTrigger>
            <TabsTrigger value="history">Historia zmian</TabsTrigger>
          </TabsList>

          <TabsContent value="proscons" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Zalety
                  </h3>
                  <div className="text-sm whitespace-pre-line text-muted-foreground">
                    {product.pros || "(brak)"}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Wady
                  </h3>
                  <div className="text-sm whitespace-pre-line text-muted-foreground">
                    {product.cons || "(brak)"}
                  </div>
                </CardContent>
              </Card>
            </div>
            {product.notes && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    Notatki sprzedawcy
                  </h3>
                  <div className="text-sm whitespace-pre-line">
                    {product.notes}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <LinkedNotes entityType="product" entityId={product.id} />
          </TabsContent>

          <TabsContent value="todos" className="mt-4">
            <LinkedTodos entityType="product" entityId={product.id} />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <AuditHistory entityType="product" entityId={product.id} />
          </TabsContent>
        </Tabs>

        {priceHistory.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Historia cen ({priceHistory.length})
              </h3>
              <div className="space-y-1 text-sm">
                {priceHistory.map((h) => {
                  const diff = h.new_price_cents - h.old_price_cents;
                  const TrendIcon =
                    diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
                  const color =
                    diff > 0
                      ? "text-red-600 dark:text-red-400"
                      : diff < 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground";
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-3 py-1 border-b last:border-0"
                    >
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Date(h.changed_at * 1000).toLocaleDateString(
                          "pl-PL",
                          { day: "2-digit", month: "2-digit", year: "numeric" },
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground line-through">
                        {formatPLN(h.old_price_cents)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="tabular-nums font-medium">
                        {formatPLN(h.new_price_cents)}
                      </span>
                      <span
                        className={`tabular-nums flex items-center gap-1 ${color} w-24 justify-end`}
                      >
                        <TrendIcon className="h-3 w-3" />
                        {diff > 0 ? "+" : ""}
                        {formatPLN(diff)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function SpecRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Weight;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium tabular-nums">{children}</span>
    </div>
  );
}
