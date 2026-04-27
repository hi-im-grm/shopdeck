import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Customers } from "@/pages/Customers";
import { Stub } from "@/pages/Stub";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route
          path="products"
          element={
            <Stub
              title="Produkty"
              hint={`Tabela produktów: nazwa, SKU, cena (price_cents), kategoria, zdjęcie (data URL), atrybuty (JSON).\nPodejrzyj wzorzec w pages/Customers.tsx — to ten sam schemat: select * + dialog z formularzem.`}
            />
          }
        />
        <Route
          path="compare"
          element={
            <Stub
              title="Porównaj produkty"
              hint={`Wybierz 2–3 produkty i pokaż je obok siebie.\nPomysł: multi-select w sidebar/sheet, potem grid 3-kolumnowy z polami z attributes_json (parsowanymi).`}
            />
          }
        />
        <Route
          path="todos"
          element={
            <Stub
              title="Todo"
              hint={`Lista zadań z opcjonalnym powiązaniem do klienta (customer_id).\nPole 'done' jako 0/1 w SQLite, 'position' do drag&drop (np. dnd-kit).`}
            />
          }
        />
        <Route
          path="notes"
          element={
            <Stub
              title="Notatki"
              hint={`Tytuł + body w markdown.\nMożesz dodać react-markdown do renderu (offline jest w node_modules).`}
            />
          }
        />
      </Route>
    </Routes>
  );
}
