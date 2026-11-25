import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { StoreLayout } from "@/layouts/StoreLayout";
import { HomePage } from "@/pages/HomePage";
import { ShopPage } from "@/pages/ShopPage";
import { ProductPage } from "@/pages/ProductPage";
import { CartPage, WishlistPage } from "@/pages/CartPage";
import { SearchPage } from "@/pages/SearchPage";
import {
  AboutPage,
  BespokePage,
  ContactPage,
  FaqPage,
  MaintenancePage,
  NotFoundPage,
  PolicyPage,
  SizeGuidePage,
  TrackPage,
} from "@/pages/HousePages";
import { AccountPage } from "@/pages/AccountPage";
import { CheckoutPage, ConfirmationPage } from "@/pages/CheckoutPage";
import {
  AdminDeskPage,
  AdminLoginPage,
  AdminProductsPage,
} from "@/pages/AdminPage";
import { AdminInventoryPage } from "@/pages/AdminInventoryPage";
import { AdminBespokePage } from "@/pages/AdminBespokePage";
import { AdminAuditPage } from "@/pages/AdminAuditPage";
import {
  AdminCustomersPage,
  AdminCustomerPage,
} from "@/pages/AdminCustomersPage";
import { AdminCategoriesPage } from "@/pages/AdminCategoriesPage";
import { AdminAnnouncementsPage } from "@/pages/AdminAnnouncementsPage";
import { AdminNewsletterPage } from "@/pages/AdminNewsletterPage";
import { AdminAppointmentsPage } from "@/pages/AdminAppointmentsPage";
import { AdminMessagesPage } from "@/pages/AdminMessagesPage";
import { AdminShippingPage } from "@/pages/AdminShippingPage";
import { AdminCouponsPage } from "@/pages/AdminCouponsPage";
import { AdminPagesPage } from "@/pages/AdminPagesPage";
import { AdminMaintenancePage } from "@/pages/AdminMaintenancePage";
import { AdminSettingsPage } from "@/pages/AdminSettingsPage";
import { AdminReviewsPage } from "@/pages/AdminReviewsPage";
import { AdminLengthsPage } from "@/pages/AdminLengthsPage";
import { AdminSizesPage } from "@/pages/AdminSizesPage";
import { AdminColorsPage } from "@/pages/AdminColorsPage";
import { AdminFabricsPage } from "@/pages/AdminFabricsPage";
import { AdminOrderPage } from "@/pages/AdminOrderPage";

import { bootstrapSession } from "@/store/useSession";

export function App() {
  return (
    <BrowserRouter>
      <SessionBootstrap />
      <Routes>
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route path="admin" element={<AdminDeskPage />} />
        <Route path="admin/products" element={<AdminProductsPage />} />
        <Route path="admin/lengths" element={<AdminLengthsPage />} />
        <Route path="admin/sizes" element={<AdminSizesPage />} />
        <Route path="admin/colors" element={<AdminColorsPage />} />
        <Route path="admin/fabrics" element={<AdminFabricsPage />} />

        <Route path="admin/categories" element={<AdminCategoriesPage />} />
        <Route
          path="admin/announcements"
          element={<AdminAnnouncementsPage />}
        />
        <Route path="admin/newsletter" element={<AdminNewsletterPage />} />
        <Route path="admin/appointments" element={<AdminAppointmentsPage />} />
        <Route path="admin/messages" element={<AdminMessagesPage />} />
        <Route path="admin/shipping" element={<AdminShippingPage />} />
        <Route path="admin/coupons" element={<AdminCouponsPage />} />
        <Route path="admin/pages" element={<AdminPagesPage />} />
        <Route path="admin/maintenance" element={<AdminMaintenancePage />} />
        <Route path="admin/settings" element={<AdminSettingsPage />} />
        <Route path="admin/reviews" element={<AdminReviewsPage />} />
        <Route path="admin/inventory" element={<AdminInventoryPage />} />
        <Route path="admin/bespoke" element={<AdminBespokePage />} />
        <Route path="admin/audit" element={<AdminAuditPage />} />
        <Route path="admin/customers" element={<AdminCustomersPage />} />
        <Route path="admin/customers/:id" element={<AdminCustomerPage />} />
        <Route path="admin/orders/:number" element={<AdminOrderPage />} />
        <Route element={<StoreLayout />}>
          <Route index element={<HomePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="shop/:slug" element={<ShopPage mode="collection" />} />
          <Route path="new-arrivals" element={<ShopPage mode="new" />} />
          <Route path="collections" element={<ShopPage mode="index" />} />
          <Route
            path="collections/:slug"
            element={<ShopPage mode="collection" />}
          />
          <Route path="product/:slug" element={<ProductPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="bespoke" element={<BespokePage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="checkout/confirmation" element={<ConfirmationPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="size-guide" element={<SizeGuidePage />} />
          <Route path="policies/:slug" element={<PolicyPage />} />
          <Route path="track-order" element={<TrackPage />} />
          <Route path="account/login" element={<AccountPage />} />
          <Route
            path="account/register"
            element={<AccountPage mode="register" />}
          />
          <Route path="account" element={<AccountPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function SessionBootstrap() {
  useEffect(() => {
    void bootstrapSession();
  }, []);
  return null;
}
