import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatAed } from "@peris/shared";
import type { Product } from "@/data/catalog";
import { galleryForColor, primaryImageForColor } from "@/lib/productImages";
import { useCart } from "@/store/useCart";
import { ProductGallery } from "./ProductGallery";
import { VariantPicker, emptySelection, type Selection } from "./VariantPicker";

type QuickViewProps = {
  product: Product | null;
  onClose: () => void;
};

export function QuickView({ product, onClose }: QuickViewProps) {
  const add = useCart((state) => state.add);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!product) return;
    setSelection(emptySelection(product));
    setMessage("");
  }, [product]);

  useEffect(() => {
    if (!product) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  if (!product || !selection) return null;
  const gallery = galleryForColor(product.images, selection.color);
  const image =
    primaryImageForColor(product.images, selection.color) ?? product.images[0];

  function addToBag() {
    if (!product || !selection?.size || !selection.lengthInches) {
      setMessage("Choose a size and a length.");
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: image?.src ?? product.images[0]?.src ?? "",
      color: selection.color,
      size: selection.size,
      lengthInches: selection.lengthInches,
      quantity: selection.quantity,
      unitPriceFils: product.priceFils,
    });
    setMessage("Added to your bag.");
  }

  return (
    <div className="dialog-back" role="presentation" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        onClick={(event) => event.stopPropagation()}
      >
        <ProductGallery
          className="gallery--dialog"
          images={gallery}
          colorKey={selection.color || "all"}
        />
        <div className="dialog-body">
          <button type="button" className="link-quiet" onClick={onClose} style={{ justifySelf: "start" }}>
            Close
          </button>
          <p className="flag">Sample piece</p>
          <h2 id="quick-view-title" style={{ margin: 0, fontWeight: 400, fontSize: 32, letterSpacing: "-0.02em" }}>
            {product.name}
          </h2>
          <p className="price">
            <span>{formatAed(product.priceFils)}</span>
            {product.compareAtFils ? <s>{formatAed(product.compareAtFils)}</s> : null}
          </p>
          <VariantPicker product={product} value={selection} onChange={setSelection} />
          {message ? <p className={message.startsWith("Added") ? "notice" : "field-error"}>{message}</p> : null}
          <div className="hero-actions">
            <button type="button" className="btn btn-fill" onClick={addToBag}>
              Add to bag
            </button>
            <Link to={`/product/${product.slug}`} className="btn btn-line" onClick={onClose}>
              View piece
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
