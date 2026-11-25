import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useMaintenance } from "@/hooks/useMaintenance";
import { useNotices } from "@/hooks/useNotices";
import { MaintenancePage } from "@/pages/HousePages";
import type { Product } from "@/data/catalog";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { QuickView } from "@/components/QuickView";
import { WhatsAppButton } from "@/components/WhatsAppButton";

type StorefrontSettings = {
  name: string;
  logo: string;
  email: string;
  themePrimary: string;
  themeIvory: string;
};

const defaultStorefrontSettings: StorefrontSettings = {
  name: "PERIS",
  logo: "/brand/peris-burgundy.png",
  email: "hello@peris.ae",
  themePrimary: "#751629",
  themeIvory: "#f8f7ee",
};

export function StoreLayout() {
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [settings, setSettings] = useState(defaultStorefrontSettings);
  const notices = useNotices();
  const closed = useMaintenance();

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/storefront-settings")
      .then((response) => {
        if (!response.ok) throw new Error("Store settings are unavailable.");
        return response.json() as Promise<{ settings: StorefrontSettings }>;
      })
      .then((body) => {
        if (active) setSettings(body.settings);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--color-burgundy", settings.themePrimary);
    root.style.setProperty("--color-ivory", settings.themeIvory);
    return () => {
      root.style.removeProperty("--color-burgundy");
      root.style.removeProperty("--color-ivory");
    };
  }, [settings.themeIvory, settings.themePrimary]);

  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      {notices.map((notice) => (
        <p className="announce" key={notice.id}>
          {notice.message}
        </p>
      ))}
      <Header storeName={settings.name} logo={settings.logo} />
      <main id="content">
        {closed ? (
          <MaintenancePage />
        ) : (
          <Outlet context={{ openQuickView: setQuickView }} />
        )}
      </main>
      <Footer contactEmail={settings.email} />
      <WhatsAppButton />
      <QuickView product={quickView} onClose={() => setQuickView(null)} />
    </>
  );
}

export type StoreOutletContext = {
  openQuickView: (product: Product) => void;
};
