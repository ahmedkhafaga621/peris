import { Link, useOutletContext } from "react-router-dom";
import { useSession } from "@/store/useSession";
import { formatAed } from "@peris/shared";
import { useBagEyebrow } from "@/hooks/useBagEyebrow";
import { useProducts } from "@/hooks/useProducts";
import { useSummaryEyebrow } from "@/hooks/useSummaryEyebrow";
import { useWishlistEyebrow } from "@/hooks/useWishlistEyebrow";
import { useSeo } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import type { StoreOutletContext } from "@/layouts/StoreLayout";
import { cartSubtotal, useCart } from "@/store/useCart";
import { useWishlist } from "@/store/useWishlist";

export function CartPage() {
  const bagEyebrow = useBagEyebrow();
  const summaryEyebrow = useSummaryEyebrow();
  const lines = useCart((state) => state.lines);
  const notice = useCart((state) => state.notice);
  const setQty = useCart((state) => state.setQty);
  const remove = useCart((state) => state.remove);
  useSeo("Bag — PERIS");
  const subtotal = cartSubtotal(lines);

  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{bagEyebrow}</p>
        <h1>Your selection</h1>
      </header>
      {lines.length === 0 ? (
        <div>
          <p className="lede">The bag is empty.</p>
          <Link to="/shop" className="btn btn-fill" style={{ marginTop: 20 }}>
            View the edit
          </Link>
        </div>
      ) : (
        <div className="split">
          <div>
            {lines.map((line) => (
              <article key={line.id} className="cart-line">
                <img src={line.image} alt="" />
                <div>
                  <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 400 }}>
                    <Link to={`/product/${line.slug}`}>{line.name}</Link>
                  </h2>
                  <p className="notice" style={{ border: 0, padding: 0 }}>
                    {line.color} · {line.size} · {line.lengthInches} in
                  </p>
                  <div className="qty" style={{ marginTop: 12 }}>
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQty(line.id, line.quantity - 1)}>
                      –
                    </button>
                    <span>{line.quantity}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQty(line.id, line.quantity + 1)}>
                      +
                    </button>
                  </div>
                  <button type="button" className="link-quiet" style={{ marginTop: 12 }} onClick={() => remove(line.id)}>
                    Remove
                  </button>
                </div>
                <strong style={{ fontWeight: 400 }}>{formatAed(line.unitPriceFils * line.quantity)}</strong>
              </article>
            ))}
          </div>
          <aside>
            <p className="eyebrow">{summaryEyebrow}</p>
            <p className="page-title" style={{ fontSize: 36 }}>
              {formatAed(subtotal)}
            </p>
            <p className="notice">
              Display prices include 5% VAT. Delivery is calculated at checkout. Cash on delivery is available for Dubai,
              and the order stays unpaid until collection. Card payment is not connected.
            </p>
            {notice ? <p className="notice">{notice}</p> : null}
            <Link to="/checkout" className="btn btn-fill">
              Continue
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

export function WishlistPage() {
  const wishlistEyebrow = useWishlistEyebrow();
  const ids = useWishlistIds();
  const user = useSession((state) => state.user);
  useSeo("Wishlist — PERIS");
  return (
    <div className="wrap" style={{ paddingBottom: 80 }}>
      <header className="page-intro">
        <p className="eyebrow">{wishlistEyebrow}</p>
        <h1>Saved pieces</h1>
        <p className="lede" style={{ marginTop: 16 }}>
          {user ? "These pieces are kept on the account." : "These pieces stay on this device until you sign in."}
        </p>
      </header>
      <WishlistGrid ids={ids} />
    </div>
  );
}

function useWishlistIds() {
  return useWishlist((state) => state.ids);
}

function WishlistGrid({ ids }: { ids: string[] }) {
  const { openQuickView } = useOutletContext<StoreOutletContext>();
  const saved = useProducts().filter((product) => ids.includes(product.id));
  if (saved.length === 0) {
    return (
      <div>
        <p className="lede">Nothing is saved yet.</p>
        <Link to="/shop" className="btn btn-line" style={{ marginTop: 20 }}>
          Browse the edit
        </Link>
      </div>
    );
  }
  return (
    <div className="product-grid">
      {saved.map((product) => (
        <ProductCard key={product.id} product={product} onQuickView={openQuickView} />
      ))}
    </div>
  );
}
