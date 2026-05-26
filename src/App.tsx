import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PasswordGate } from "@/components/PasswordGate";
import { Dashboard } from "@/pages/Dashboard";
import { Customers } from "@/pages/Customers";
import { CustomerDetail } from "@/pages/CustomerDetail";
import { Products } from "@/pages/Products";
import { ProductDetail } from "@/pages/ProductDetail";
import { Compare } from "@/pages/Compare";
import { Todos } from "@/pages/Todos";
import { Notes } from "@/pages/Notes";
import { Templates } from "@/pages/Templates";

export default function App() {
  return (
    <PasswordGate>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="compare" element={<Compare />} />
          <Route path="todos" element={<Todos />} />
          <Route path="notes" element={<Notes />} />
          <Route path="templates" element={<Templates />} />
        </Route>
      </Routes>
    </PasswordGate>
  );
}
