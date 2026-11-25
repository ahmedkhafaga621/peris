import { Link } from "react-router-dom";
import { formatAed } from "@peris/shared";
import type { CatalogImage, Product } from "@/data/catalog";
import { galleryForColor } from "@/lib/productImages";
import { useWishlist } from "@/store/useWishlist";
import { IconBag, IconHeart } from "./Icons";

type ProductCardProps = {
  product: Product;
  onQuickView: (product: Product) => void;
};

/** Alternate closer shots when a product only has one uploaded image. */
const hoverFallback: Record<string, CatalogImage> = {
  "/media/flowing.jpg": {
    src: "/media/floral.jpg",
    alt: "",
    position: "center",
  },
  "/media/floral.jpg": {
    src: "/media/flowing.jpg",
    alt: "",
    position: "center top",
  },
  "/media/gray.jpg": {
    src: "/media/flowing.jpg",
    alt: "",
    position: "center",
  },
};

function cardImages(product: Product) {
  const defaultColor = product.colors[0]?.name;
  const gallery = galleryForColor(product.images, defaultColor);
  const primary = gallery[0] ?? product.images[0];
  const secondary =
    gallery[1] ??
    product.images.find((image) => image.src !== primary?.src) ??
    (primary
      ? hoverFallback[primary.src] ?? {
          src: primary.src,
          alt: "",
          position: "center 18%",
        }
      : undefined);
  return { primary, secondary };
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const saved = useWishlist((state) => state.ids.includes(product.id));
  const toggle = useWishlist((state) => state.toggle);
  const { primary, secondary } = cardImages(product);
  if (!primary) return null;
  const sameShot = !secondary || secondary.src === primary.src;
  const flag = product.isNew ? "New" : product.isBestseller ? "Bestseller" : "";

  return (
    <article className="product-card">
      <div className="frame">
        <Link
          to={`/product/${product.slug}`}
          className="product-media"
          tabIndex={-1}
          aria-label={product.name}
        >
          <span className="product-media__hover" aria-hidden="true">
            <img
              src={(secondary ?? primary).src}
              alt=""
              loading="lazy"
              className={sameShot ? "product-media__closer" : undefined}
              style={{ objectPosition: (secondary ?? primary).position ?? "center" }}
            />
          </span>
          <span className="product-media__primary">
            <img
              src={primary.src}
              alt={primary.alt}
              style={{ objectPosition: primary.position }}
            />
          </span>
        </Link>
        <button
          type="button"
          className="wish"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
          onClick={() => toggle(product.id)}
          style={{ color: saved ? "#751629" : "#1c1614" }}
        >
          <IconHeart filled={saved} />
        </button>
        <div className="card-tools">
          <button type="button" className="card-tools__text" onClick={() => onQuickView(product)}>
            Quick view
          </button>
          <button
            type="button"
            className="card-tools__bag"
            aria-label={`Add ${product.name} to bag`}
            onClick={() => onQuickView(product)}
          >
            <IconBag size={16} />
          </button>
        </div>
      </div>
      <div className="product-meta">
        {flag ? <p className="flag">{flag}</p> : null}
        <h3>
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="price">
          <span>{formatAed(product.priceFils)}</span>
          {product.compareAtFils ? <s>{formatAed(product.compareAtFils)}</s> : null}
        </p>
        <div className="swatches" aria-label="Available colors">
          {product.colors.map((color) => (
            <span key={color.id ?? color.name} className="swatch" style={{ background: color.hex }} title={color.name} />
          ))}
        </div>
      </div>
    </article>
  );
}
