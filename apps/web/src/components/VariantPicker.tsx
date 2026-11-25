import { ABAYA_LENGTHS, ABAYA_SIZES } from "@peris/shared";
import type { Product } from "@/data/catalog";

export type Selection = {
  color: string;
  size: string;
  lengthInches: number | null;
  quantity: number;
};

type VariantPickerProps = {
  product: Product;
  value: Selection;
  onChange: (value: Selection) => void;
};

export function VariantPicker({ product, value, onChange }: VariantPickerProps) {
  return (
    <div className="stack-form">
      <div>
        <p className="choice-label">Color</p>
        <div className="choices" style={{ marginTop: 8 }}>
          {product.colors.map((color) => (
            <button
              key={color.name}
              type="button"
              className="choice"
              aria-pressed={value.color === color.name}
              onClick={() => onChange({ ...value, color: color.name })}
            >
              <span className="swatch" style={{ background: color.hex, display: "inline-block", marginRight: 8 }} />
              {color.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="choice-label">Size</p>
        <div className="choices" style={{ marginTop: 8 }}>
          {(product.sizes?.length ? product.sizes : [...ABAYA_SIZES]).map((size) => (
            <button
              key={size}
              type="button"
              className="choice"
              aria-pressed={value.size === size}
              onClick={() => onChange({ ...value, size })}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="choice-label">Length</p>
        <div className="choices" style={{ marginTop: 8 }}>
          {[...(product.lengths?.length ? product.lengths : ABAYA_LENGTHS)].sort((a, b) => a - b).map((length) => (
            <button
              key={length}
              type="button"
              className="choice"
              aria-pressed={value.lengthInches === length}
              onClick={() => onChange({ ...value, lengthInches: length })}
            >
              {length} in
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="choice-label">Quantity</p>
        <div className="qty" style={{ marginTop: 8 }}>
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => onChange({ ...value, quantity: Math.max(1, value.quantity - 1) })}
          >
            –
          </button>
          <span>{value.quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => onChange({ ...value, quantity: value.quantity + 1 })}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export function emptySelection(product: Product): Selection {
  return {
    color: product.colors[0]?.name ?? "",
    size: "",
    lengthInches: null,
    quantity: 1,
  };
}
