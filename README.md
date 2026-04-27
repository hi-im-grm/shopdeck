# shopdeck

Lokalna, offline-first aplikacja desktopowa dla **sprzedawcy automatyki bramowej**.
Personal knowledge base z napędami (specyfikacja + zalety/wady + zdjęcia),
historia kontaktów z klientami z notatkami i porównywarka napędów do
polecania klientom przez telefon. Dane lokalne (SQLite), kod open source.

> Projekt powstał jako test workflowu offline (Ollama + Dash + Tauri) i
> portfolio piece pokazujące, że bezpieczeństwo i prywatność klientów można
> zachować nie wysyłając danych do chmury.

## Funkcje

- **Klienci** (B2C i B2B) — CRUD z polami firma/NIP/adres, wyszukiwanie.
- **Profil klienta** — historia kontaktów (rozmowy, emaile, spotkania) ze
  statusem otwarte/zakończone — szybki notatnik gdy klient dzwoni a ty jesteś
  zajęty.
- **Produkty (napędy)** — strukturalne pola dla typu, masy skrzydła, długości,
  mocy, zasilania, IP, duty cycle. Zalety i wady. Zdjęcia przez data URL/URL.
- **Filtry/recommender** — wpisujesz "skrzydłowy, do 300kg, max 2000zł" →
  widzisz pasujące napędy.
- **Porównywarka** — wybierasz 2+ produkty, side-by-side z auto-highlightem
  różnic (zielony Trophy dla najlepszych parametrów).
- **Tryb ciemny** — z respektem dla preferencji systemu, zapisywany w
  localStorage.
- **Seed data** — 8 sztucznych napędów żeby od razu mieć z czym popracować.
- **Todo + Notatki** — schemat gotowy, UI do dorobienia.

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
