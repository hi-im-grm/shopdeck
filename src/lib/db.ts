import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function db(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:shopdeck.db");
  }
  return _db;
}

export type CustomerKind = "b2c" | "b2b";

export type Customer = {
  id: number;
  name: string;
  kind: CustomerKind;
  company: string | null;
  nip: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  /** JSON-serialized string[] of tag names. */
  tags_json: string;
  created_at: number;
};

/** Preset tag suggestions surfaced in the tag editor. Users may add custom ones. */
export const CUSTOMER_TAG_PRESETS = [
  "VIP",
  "Hurt",
  "Zaległy",
  "Stały klient",
  "Nowy",
  "Reklamacja",
] as const;

export function parseTags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify(
    Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean))),
  );
}

export type DriveType =
  | "skrzydlowy"
  | "przesuwny"
  | "garazowy"
  | "rolety"
  | "szlabany"
  | "inne";

export const DRIVE_TYPE_LABELS: Record<DriveType, string> = {
  skrzydlowy: "Skrzydłowy",
  przesuwny: "Przesuwny",
  garazowy: "Garażowy",
  rolety: "Rolety",
  szlabany: "Szlabany",
  inne: "Inne",
};

export type Product = {
  id: number;
  name: string;
  manufacturer: string | null;
  model: string | null;
  sku: string | null;
  type: DriveType | null;
  max_weight_kg: number | null;
  max_length_m: number | null;
  power_w: number | null;
  voltage: string | null;
  duty_cycle: string | null;
  ip_rating: string | null;
  price_cents: number;
  currency: string;
  pros: string | null;
  cons: string | null;
  description: string | null;
  image_data_url: string | null;
  external_links_json: string;
  attributes_json: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
};

export type InteractionKind = "call" | "email" | "sms" | "meeting" | "other";

export const INTERACTION_KIND_LABELS: Record<InteractionKind, string> = {
  call: "Rozmowa",
  email: "Email",
  sms: "SMS",
  meeting: "Spotkanie",
  other: "Inne",
};

export type Interaction = {
  id: number;
  customer_id: number | null;
  kind: InteractionKind;
  summary: string;
  body_md: string | null;
  status: "open" | "done";
  follow_up_at: number | null;
  created_at: number;
};

export type Todo = {
  id: number;
  title: string;
  done: number;
  customer_id: number | null;
  product_id: number | null;
  due_date: number | null;
  position: number;
  created_at: number;
};

export type ProductPriceHistory = {
  id: number;
  product_id: number;
  old_price_cents: number;
  new_price_cents: number;
  changed_at: number;
};

export type OfferTemplateItem = {
  product_id: number;
  qty: number;
  note: string | null;
};

export type OfferTemplate = {
  id: number;
  name: string;
  description: string | null;
  /** JSON-serialized OfferTemplateItem[]. */
  items_json: string;
  created_at: number;
  updated_at: number;
};

export function parseTemplateItems(json: string | null | undefined): OfferTemplateItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.product_id === "number" && typeof x.qty === "number")
      .map((x) => ({
        product_id: x.product_id,
        qty: x.qty,
        note: typeof x.note === "string" ? x.note : null,
      }));
  } catch {
    return [];
  }
}

export type ProductAttribute = {
  key: string;
  value: string;
  /** Icon name from ICON_REGISTRY in src/lib/icons.ts, or null. */
  icon: string | null;
};

/**
 * Parse attributes_json into a list of typed attributes.
 *
 * Accepts two shapes for backward-compat:
 *  - New (preferred): array of `{ key, value, icon? }`
 *  - Legacy: object `{ key: value }` (icon-less, written by older versions)
 */
export function parseProductAttributes(
  json: string | null | undefined,
): ProductAttribute[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (x) =>
            x &&
            typeof x === "object" &&
            typeof x.key === "string" &&
            x.key.trim(),
        )
        .map((x) => ({
          key: x.key,
          value: x.value == null ? "" : String(x.value),
          icon: typeof x.icon === "string" && x.icon ? x.icon : null,
        }));
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed)
        .filter(([k]) => k.trim())
        .map(([key, value]) => ({
          key,
          value: value == null ? "" : String(value),
          icon: null,
        }));
    }
    return [];
  } catch {
    return [];
  }
}

/** Serialize attributes for storage. Strips empty keys and null icons. */
export function stringifyProductAttributes(attrs: ProductAttribute[]): string {
  return JSON.stringify(
    attrs
      .filter((a) => a.key.trim())
      .map((a) => {
        const out: { key: string; value: string; icon?: string } = {
          key: a.key.trim(),
          value: a.value,
        };
        if (a.icon) out.icon = a.icon;
        return out;
      }),
  );
}

/**
 * Legacy helper kept for any code still expecting a flat record.
 * Drops icons silently. Prefer parseProductAttributes() for new code.
 */
export function parseAttributes(json: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of parseProductAttributes(json)) {
    out[a.key] = a.value;
  }
  return out;
}

export type Note = {
  id: number;
  title: string | null;
  body_md: string;
  linked_entity_type: "customer" | "product" | "interaction" | null;
  linked_entity_id: number | null;
  customer_id: number | null;
  product_id: number | null;
  created_at: number;
  updated_at: number;
};

export function formatPLN(cents: number): string {
  return (cents / 100).toLocaleString("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  });
}

export function parsePLN(input: string): number {
  const cleaned = input.replace(/\s|zł|PLN/gi, "").replace(",", ".");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}
