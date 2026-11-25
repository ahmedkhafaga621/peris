import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { ABAYA_LENGTHS, formatAed } from "@peris/shared";
import { type Product } from "@/data/catalog";
import { useProducts, useProductsQuery } from "@/hooks/useProducts";
import { productWhatsAppMessage, whatsappHref } from "@/data/site";
import { useAskPiece } from "@/hooks/useAskPiece";
import { useProductPrefill } from "@/hooks/useProductPrefill";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useSkuLabel } from "@/hooks/useSkuLabel";
import { useSeo } from "@/lib/seo";
import { useCart } from "@/store/useCart";
import { useSession } from "@/store/useSession";
import { useWishlist } from "@/store/useWishlist";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { VariantPicker, emptySelection } from "@/components/VariantPicker";
import type { StoreOutletContext } from "@/layouts/StoreLayout";
import { galleryForColor, primaryImageForColor } from "@/lib/productImages";

function lengthLine(lengths: readonly number[]) {
  const sorted = [...lengths].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  return low === high
    ? `Lengths are cut at ${low} inches.`
    : `Lengths are cut from ${low} to ${high} inches.`;
}

export function ProductPage() {
  const { slug = "" } = useParams();
  const productsQuery = useProductsQuery();
  const catalog = useProducts();
  const product = catalog.find((item) => item.slug === slug);
  const add = useCart((state) => state.add);
  const saved = useWishlist((state) =>
    product ? state.ids.includes(product.id) : false,
  );
  const toggle = useWishlist((state) => state.toggle);
  const { openQuickView } = useOutletContext<StoreOutletContext>();
  const whatsapp = useWhatsApp();
  const productPrefill = useProductPrefill();
  const askPiece = useAskPiece();
  const skuLabel = useSkuLabel();
  const navigate = useNavigate();
  const [selection, setSelection] = useState(() =>
    product ? emptySelection(product) : null,
  );
  const [message, setMessage] = useState("");
  const [recent, setRecent] = useState<Product[]>([]);

  useSeo(
    product ? `${product.name} — PERIS` : "Piece — PERIS",
    product?.description ?? "PERIS abaya",
  );

  useEffect(() => {
    if (!product) return;
    setSelection(emptySelection(product));
    setMessage("");
    const key = "peris-recent";
    const current = JSON.parse(sessionStorage.getItem(key) ?? "[]") as string[];
    const previous = current.filter((item) => item !== product.slug);
    setRecent(
      previous
        .map((item) => catalog.find((product) => product.slug === item))
        .filter((item): item is Product => Boolean(item)),
    );
    sessionStorage.setItem(
      key,
      JSON.stringify([product.slug, ...previous].slice(0, 4)),
    );
  }, [product, catalog]);

  if (productsQuery.isPending) {
    return (
      <div className="wrap page-intro">
        <h1>Opening the piece</h1>
      </div>
    );
  }

  if (!product || !selection) {
    return (
      <div className="wrap page-intro">
        <h1>This piece is not in the edit</h1>
        <Link to="/shop" className="link-quiet">
          Return to the shop
        </Link>
      </div>
    );
  }

  const available =
    !selection?.size || !product?.stock
      ? undefined
      : (product.stock.find(
          (item) =>
            item.color === selection.color && item.size === selection.size,
        )?.available ?? 0);

  const gallery = galleryForColor(product.images, selection.color);
  const cartImage = primaryImageForColor(product.images, selection.color);

  function place(goToCart: boolean) {
    if (!selection?.size || !selection.lengthInches) {
      setMessage("Choose a size and a length before adding this piece.");
      return;
    }
    if (available !== undefined && selection.quantity > available) {
      setMessage(
        available < 1 ? "Out of stock." : `Only ${available} are available.`,
      );
      return;
    }
    add({
      productId: product!.id,
      slug: product!.slug,
      name: product!.name,
      image: cartImage?.src ?? product!.images[0]?.src ?? "",
      color: selection.color,
      size: selection.size,
      lengthInches: selection.lengthInches,
      quantity: selection.quantity,
      unitPriceFils: product!.priceFils,
    });
    setMessage(goToCart ? "Added. Your bag is ready." : "Added to your bag.");
    if (goToCart) navigate("/cart");
  }

  return (
    <div className="wrap" style={{ paddingTop: 36 }}>
      <div className="product-stage">
        <ProductGallery images={gallery} colorKey={selection.color || "all"} />
        <div className="buy-box">
          <p className="flag">
            {product.isNew
              ? "New"
              : product.isBestseller
                ? "Bestseller"
                : "Sample piece"}
          </p>
          <h1>{product.name}</h1>
          <p className="eyebrow">{skuLabel} {product.sku}</p>
          <p className="price">
            <span>{formatAed(product.priceFils)}</span>
            {product.compareAtFils ? (
              <s>{formatAed(product.compareAtFils)}</s>
            ) : null}
          </p>
          <p>{product.description}</p>
          <p className="notice">
            Fabric: {product.fabric}.{" "}
            {lengthLine(
              product.lengths?.length ? product.lengths : ABAYA_LENGTHS,
            )}
          </p>
          <VariantPicker
            product={product}
            value={selection}
            onChange={setSelection}
          />
          {available !== undefined ? (
            <p>{available < 1 ? "Out of stock." : `${available} available`}</p>
          ) : null}
          {message ? (
            <p
              className={
                message.startsWith("Choose") || message.startsWith("Out")
                  ? "field-error"
                  : "notice"
              }
            >
              {message}
            </p>
          ) : null}
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-fill"
              disabled={available === 0}
              onClick={() => place(false)}
            >
              Add to bag
            </button>
            <button
              type="button"
              className="btn btn-line"
              disabled={available === 0}
              onClick={() => place(true)}
            >
              Buy now
            </button>
          </div>
          <button
            type="button"
            className="link-quiet"
            style={{ justifySelf: "start" }}
            onClick={() => toggle(product.id)}
          >
            {saved ? "Saved to wishlist" : "Add to wishlist"}
          </button>
          <a
            className="link-quiet"
            href={whatsappHref(
              productWhatsAppMessage(
                productPrefill,
                product.name,
                window.location.href,
              ),
              whatsapp,
            )}
            target="_blank"
            rel="noreferrer"
          >
            {askPiece}
          </a>
          <p className="notice">
            Estimated delivery is confirmed with the order. UAE boutique
            dispatch leaves from Abu Hail. This photograph and price are
            samples.
          </p>
          <Link to="/size-guide" className="link-quiet">
            Size guide
          </Link>
        </div>
      </div>
      <PieceNote slug={product.slug} />
      {recent.length > 0 ? (
        <section style={{ paddingBottom: 72 }}>
          <div className="section-head">
            <h2>Recently viewed</h2>
          </div>
          <div className="product-grid">
            {recent.map((item) =>
              item ? (
                <ProductCard
                  key={item.id}
                  product={item}
                  onQuickView={openQuickView}
                />
              ) : null,
            )}
          </div>
        </section>
      ) : (
        <section style={{ paddingBottom: 72 }}>
          <div className="section-head">
            <h2>Also in the edit</h2>
          </div>
          <div className="product-grid">
            {catalog
              .filter((item) => item.id !== product.id)
              .map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onQuickView={openQuickView}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PieceNote({ slug }: { slug: string }) {
  const user = useSession((state) => state.user);
  const token = useSession((state) => state.accessToken);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [reviews, setReviews] = useState<
    { id: string; body: string; name: string; rating: number }[]
  >([]);

  useEffect(() => {
    let gone = false;
    void fetch(`/api/v1/products/${encodeURIComponent(slug)}/reviews`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          reviews?: {
            id: string;
            body: string;
            name: string;
            rating: number;
          }[];
        };
        if (!response.ok) throw new Error("missing");
        return payload.reviews ?? [];
      })
      .then((rows) => {
        if (!gone) setReviews(rows);
      })
      .catch(() => {
        if (!gone) setReviews([]);
      });
    return () => {
      gone = true;
    };
  }, [slug, note]);

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-head">
        <h2>Notes</h2>
      </div>
      {reviews.length > 0 ? (
        <div className="quotes">
          {reviews.map((review) => (
            <article key={review.id}>
              <p>{review.body}</p>
              <span className="eyebrow">
                {review.name}. {review.rating} of 5
              </span>
            </article>
          ))}
        </div>
      ) : null}
      {user && token ? (
        <form
          className="stack-form"
          style={{ maxWidth: 560, marginTop: 24 }}
          onSubmit={(event) => {
            event.preventDefault();
            if (rating < 1) {
              setNote("Choose a rating from 1 to 5.");
              return;
            }
            if (body.trim().length < 8) {
              setNote("Write a short note.");
              return;
            }
            setPending(true);
            setNote("");
            void fetch(`/api/v1/products/${encodeURIComponent(slug)}/reviews`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ rating, body: body.trim() }),
            })
              .then(async (response) => {
                const payload = (await response.json().catch(() => ({}))) as {
                  error?: string;
                };
                if (!response.ok)
                  throw new Error(payload.error ?? "The note was not saved.");
                setBody("");
                setRating(0);
                setNote(
                  "The note is on the desk. It is not on the shop until the desk publishes it.",
                );
              })
              .catch((error: unknown) =>
                setNote(
                  error instanceof Error
                    ? error.message
                    : "The note was not saved.",
                ),
              )
              .finally(() => setPending(false));
          }}
        >
          <p>
            Leave a note for this piece. It stays off the shop until the desk
            publishes it.
          </p>
          <div>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className="btn btn-line"
                aria-label={`Rate ${value} of 5`}
                aria-pressed={rating === value}
                onClick={() => setRating(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Note</span>
            <textarea
              aria-label="Note for this piece"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          {note ? <p className="notice">{note}</p> : null}
          <button type="submit" className="btn btn-line" disabled={pending}>
            Leave the note
          </button>
        </form>
      ) : (
        <p>
          <Link to="/account/login">Sign in</Link> to leave a note. It stays off
          the shop until the desk publishes it.
        </p>
      )}
    </section>
  );
}
