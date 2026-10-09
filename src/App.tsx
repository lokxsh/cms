import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { Dashboard } from "./pages/Dashboard";
import { Orders } from "./pages/Orders";
import { OrderDetail } from "./pages/OrderDetail";
import { Payments } from "./pages/Payments";
import { Products } from "./pages/Products";
import { ProductEditor } from "./pages/ProductEditor";
import { Categories } from "./pages/Categories";
import { Inventory } from "./pages/Inventory";
import { Media } from "./pages/Media";
import { Customers } from "./pages/Customers";
import { Coupons } from "./pages/Coupons";
import { Homepage } from "./pages/cms/Homepage";
import { Banners } from "./pages/cms/Banners";
import { Appointments } from "./pages/Appointments";
import { Discounts } from "./pages/Discounts";
import { Promotions } from "./pages/Promotions";
import { Pages } from "./pages/cms/Pages";
import { Faqs } from "./pages/cms/Faqs";
import { Seo } from "./pages/cms/Seo";
import { Reviews } from "./pages/Reviews";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import { NotFound } from "./pages/NotFound";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="catalog" element={<Navigate to="/catalog/products" replace />} />
          <Route path="catalog/products" element={<Products />} />
          <Route path="catalog/products/:id" element={<ProductEditor />} />
          <Route path="catalog/categories" element={<Categories />} />
          <Route path="catalog/inventory" element={<Inventory />} />
          <Route path="catalog/media" element={<Media />} />
          <Route path="customers" element={<Customers />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="marketing" element={<Navigate to="/marketing/coupons" replace />} />
          <Route path="marketing/coupons" element={<Coupons />} />
          <Route path="marketing/discounts" element={<Discounts />} />
          <Route path="marketing/promotions" element={<Promotions />} />
          <Route path="cms" element={<Navigate to="/cms/homepage" replace />} />
          <Route path="cms/homepage" element={<Homepage />} />
          <Route path="cms/banners" element={<Banners />} />
          <Route path="cms/navigation" element={<Navigate to="/cms/banners" replace />} />
          <Route path="cms/pages" element={<Pages />} />
          <Route path="cms/faqs" element={<Faqs />} />
          <Route path="cms/seo" element={<Seo />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Navigate to="/settings/store" replace />} />
          <Route path="settings/:tab" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
