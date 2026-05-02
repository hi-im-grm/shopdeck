import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { LinkedNotes } from "@/components/LinkedNotes";
import { LinkedTodos } from "@/components/LinkedTodos";
import { ExternalLinks } from "@/components/ExternalLinks";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id ?? "0", 10);
  const [product, setProduct] = useState<Product | null>(null);

  async function refresh() {
    const conn = await db();
    const [p] = await conn.select<Product[]>(
      "SELECT * FROM products WHERE id=?",
      [productId],
    );
    setProduct(p ?? null);
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
        </Tabs>
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
