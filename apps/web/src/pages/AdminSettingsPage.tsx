import { useEffect, useState } from "react";
import { ImageUploadField } from "@/components/ImageUploadField";
import { useSeo } from "@/lib/seo";
import { AdminChrome } from "@/pages/AdminPage";
import { staffFetch, useStaffSession } from "@/store/useStaffSession";

type StoreSettings = {
  name: string;
  logo: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  facebook: string;
  maps: string;
  parent: string;
  currency: string;
  vatRate: number;
  shippingEnabled: boolean;
  storeOpen: boolean;
  themePrimary: string;
  themeIvory: string;
};

const emptySettings: StoreSettings = {
  name: "PERIS",
  logo: "/brand/peris-burgundy.png",
  phone: "+971 50 540 6077",
  whatsapp: "+971505406077",
  email: "hello@peris.ae",
  address:
    "Boutique M01, 3 Floor, Abu Hail Center, Dubai, United Arab Emirates.",
  hours: "Daily from 10:00 AM to 10:00 PM.",
  instagram: "https://www.instagram.com/peris_uae/",
  facebook: "https://www.facebook.com/perisdubai",
  maps: "https://share.google/yXXt6E0JO91xU9lmA",
  parent: "Lamasat Jawhareya",
  currency: "AED",
  vatRate: 0.05,
  shippingEnabled: true,
  storeOpen: true,
  themePrimary: "#751629",
  themeIvory: "#f8f7ee",
};

export function AdminSettingsPage() {
  const user = useStaffSession((state) => state.user);
  const [settings, setSettings] = useState<StoreSettings>(emptySettings);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  useSeo("Settings — PERIS");

  useEffect(() => {
    if (!user) return;
    void staffFetch<{ settings: StoreSettings }>("/api/v1/admin/settings")
      .then((body) => setSettings(body.settings))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The store settings could not be opened.",
        ),
      );
  }, [user]);

  function updateField<Key extends keyof StoreSettings>(
    key: Key,
    value: StoreSettings[Key],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    setSaving(true);
    setNote("");
    void staffFetch<{ settings: StoreSettings }>("/api/v1/admin/settings", {
      method: "POST",
      body: JSON.stringify({ settings }),
    })
      .then((body) => setSettings(body.settings))
      .catch((error: unknown) =>
        setNote(
          error instanceof Error
            ? error.message
            : "The store settings were not saved.",
        ),
      )
      .finally(() => setSaving(false));
  }

  return (
    <AdminChrome>
      <header className="page-intro">
        <p className="eyebrow">Desk</p>
        <h1>Settings</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          This desk saves the store configuration into the live database so the
          boutique and the shop read the same numbers.
        </p>
      </header>
      {note ? <p className="notice">{note}</p> : null}
      <div className="stack-form" style={{ maxWidth: 980 }}>
        <div className="two-col-grid">
          <label className="field">
            <span>Store name</span>
            <input
              value={settings.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </label>
          <div>
            <ImageUploadField
              label="Logo"
              kind="brand"
              className="image-upload--logo"
              value={settings.logo}
              onChange={(url) => updateField("logo", url)}
            />
            <p className="notice" style={{ marginTop: 8 }}>
              Upload a logo image, then save settings.
            </p>
          </div>
          <label className="field">
            <span>Phone</span>
            <input
              value={settings.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>
          <label className="field">
            <span>WhatsApp</span>
            <input
              value={settings.whatsapp}
              onChange={(event) => updateField("whatsapp", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={settings.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Parent house</span>
            <input
              value={settings.parent}
              onChange={(event) => updateField("parent", event.target.value)}
            />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Address</span>
            <textarea
              value={settings.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Opening hours</span>
            <input
              value={settings.hours}
              onChange={(event) => updateField("hours", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Instagram</span>
            <input
              value={settings.instagram}
              onChange={(event) => updateField("instagram", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Facebook</span>
            <input
              value={settings.facebook}
              onChange={(event) => updateField("facebook", event.target.value)}
            />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Maps link</span>
            <input
              value={settings.maps}
              onChange={(event) => updateField("maps", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Currency</span>
            <input value={settings.currency} readOnly />
          </label>
          <label className="field">
            <span>VAT rate</span>
            <input
              type="number"
              min={0}
              max={0.5}
              step={0.01}
              value={settings.vatRate}
              onChange={(event) =>
                updateField("vatRate", Number(event.target.value) || 0)
              }
            />
          </label>
          <label className="field">
            <span>Primary brand color</span>
            <input
              type="color"
              value={settings.themePrimary}
              onChange={(event) =>
                updateField("themePrimary", event.target.value)
              }
            />
          </label>
          <label className="field">
            <span>Ivory color</span>
            <input
              type="color"
              value={settings.themeIvory}
              onChange={(event) =>
                updateField("themeIvory", event.target.value)
              }
            />
          </label>
        </div>

        <div className="toggle-row">
          <label>
            <input
              type="checkbox"
              checked={settings.shippingEnabled}
              onChange={(event) =>
                updateField("shippingEnabled", event.target.checked)
              }
            />
            Shipping enabled
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.storeOpen}
              onChange={(event) =>
                updateField("storeOpen", event.target.checked)
              }
            />
            Store open
          </label>
        </div>

        <button
          type="button"
          className="btn btn-line"
          disabled={saving}
          onClick={saveSettings}
        >
          {saving ? "Saving settings…" : "Save store settings"}
        </button>
      </div>
    </AdminChrome>
  );
}
