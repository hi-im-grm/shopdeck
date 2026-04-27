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
  created_at: number;
};

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

export type Note = {
  id: number;
  title: string | null;
  body_md: string;
  linked_entity_type: "customer" | "product" | "interaction" | null;
  linked_entity_id: number | null;
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
