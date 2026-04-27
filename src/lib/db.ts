import Database from "@tauri-apps/plugin-sql";

let _db: Database | null = null;

export async function db(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:shopdeck.db");
  }
  return _db;
}

export type Customer = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: number;
};

export type Product = {
  id: number;
  name: string;
  sku: string | null;
  price_cents: number;
  currency: string;
  category: string | null;
  image_data_url: string | null;
  attributes_json: string;
  created_at: number;
};

export type Todo = {
  id: number;
  title: string;
  done: number;
  customer_id: number | null;
  due_date: number | null;
  position: number;
  created_at: number;
};

export type Note = {
  id: number;
  title: string;
  body_md: string;
  linked_entity_type: string | null;
  linked_entity_id: number | null;
  updated_at: number;
};
