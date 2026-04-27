import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Customers } from "@/pages/Customers";
import { CustomerDetail } from "@/pages/CustomerDetail";
import { Products } from "@/pages/Products";
import { Compare } from "@/pages/Compare";
import { Todos } from "@/pages/Todos";
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
        <Route path="todos" element={<Todos />} />
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
