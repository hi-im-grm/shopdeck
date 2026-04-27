# shopdeck

Lokalna, offline-first aplikacja desktopowa dla małych biznesów e-commerce.
Klienci, produkty, porównywarka, zadania i notatki — wszystko trzymane w
SQLite na Twoim komputerze.

> Projekt zbudowany jako test workflowu offline (Ollama + Dash + Tauri).

## Funkcje

- **Klienci** — pełen CRUD (dodawanie, edycja, usuwanie), tabela.
- **Produkty** — katalog z atrybutami JSON, miniaturami i SKU. *(do zbudowania)*
- **Porównywarka** — side-by-side dwóch lub trzech produktów. *(do zbudowania)*
- **Todo** — lista zadań powiązana z klientami. *(do zbudowania)*
- **Notatki** — markdown, linkowane do encji. *(do zbudowania)*
- **Dashboard** — liczniki z prawdziwych zapytań SQL.

## Stack

- **Tauri 2** — natywny shell, ~10 MB binarka
- **React 19 + TypeScript + Vite** — frontend
- **Tailwind CSS v4 + shadcn/ui** — design system (`new-york`, `slate`)
- **SQLite** — lokalne dane przez `tauri-plugin-sql`
- **React Router 7** — routing
- **Zustand** — state management (przygotowane)
- **Lucide** — ikony
- **Sonner** — toasty

## Uruchomienie

```bash
bun install
bun run tauri dev
```

Wymaga: [Bun](https://bun.sh), [Rust](https://rustup.rs), Xcode CLT (macOS).

## Build

```bash
bun run tauri build
```

## Schemat bazy

Migracja `src-tauri/migrations/001_init.sql` tworzy:
`customers`, `products`, `todos`, `notes`.
