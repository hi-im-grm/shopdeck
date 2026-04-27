import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Customers } from "@/pages/Customers";
import { CustomerDetail } from "@/pages/CustomerDetail";
import { Products } from "@/pages/Products";
import { Compare } from "@/pages/Compare";
import { Stub } from "@/pages/Stub";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="products" element={<Products />} />
        <Route path="compare" element={<Compare />} />
        <Route
          path="todos"
          element={
            <Stub
              title="Todo"
              hint={`Lista zadań z opcjonalnym powiązaniem do klienta i/lub produktu.\nSchema gotowa: tabela 'todos' w db.ts ma customer_id i product_id.\nZacznij od skopiowania wzorca z pages/Customers.tsx — to ten sam SELECT/INSERT/UPDATE.`}
            />
          }
        />
        <Route
          path="notes"
          element={
            <Stub
              title="Notatki"
              hint={`Tytuł + body w markdown, opcjonalnie przypięte do klienta/produktu/interakcji.\nSchema 'notes' ma linked_entity_type ('customer' | 'product' | 'interaction') + linked_entity_id.\nZainstaluj 'react-markdown' (offline w node_modules) do renderu.`}
            />
          }
        />
      </Route>
    </Routes>
  );
}
